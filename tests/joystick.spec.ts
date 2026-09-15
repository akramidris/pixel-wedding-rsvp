import { test, expect, type CDPSession, type Page } from '@playwright/test';
import { neutralJoystick, sampleJoystick } from '../src/game/controls/joystick';

type Point = { x: number; y: number };

test('radial deadzone joins continuously to proportional speed', () => {
  expect(neutralJoystick()).toEqual({
    directionX: 0,
    directionY: 0,
    magnitude: 0,
    angle: 0,
    isActive: false,
  });
  expect(sampleJoystick(0, 0, 40)).toEqual({ ...neutralJoystick(), isActive: true });
  expect(sampleJoystick(3, 4, 40).magnitude).toBe(0);
  expect(sampleJoystick(6, 0, 40).magnitude).toBe(0);
  expect(sampleJoystick(6.0001, 0, 40).magnitude).toBeGreaterThan(0);
  expect(sampleJoystick(6.0001, 0, 40).magnitude).toBeLessThan(0.001);
  expect(sampleJoystick(23, 0, 40).magnitude).toBeCloseTo(0.5, 12);
});

test('arbitrary angles stay normalized and maximum travel is clamped', () => {
  for (const [x, y] of [
    [12, -16],
    [-12, -16],
    [-12, 16],
    [12, 16],
  ]) {
    const sample = sampleJoystick(x, y, 40);
    expect(Math.hypot(sample.directionX, sample.directionY)).toBeCloseTo(1, 12);
    expect(sample.directionX).toBeCloseTo(x / 20, 12);
    expect(sample.directionY).toBeCloseTo(y / 20, 12);
    expect(sample.angle).toBeCloseTo(Math.atan2(y, x), 12);
    expect(sample.isActive).toBe(true);
  }
  const outside = sampleJoystick(120, -160, 40);
  expect(outside.magnitude).toBe(1);
  expect(outside.directionX).toBeCloseTo(0.6, 12);
  expect(outside.directionY).toBeCloseTo(-0.8, 12);
  expect(sampleJoystick(40, 40, 40).magnitude).toBe(sampleJoystick(40, 0, 40).magnitude);
});

test('invalid pointer samples cannot inject non-finite movement', () => {
  for (const [x, y, radius] of [
    [NaN, 0, 40],
    [Infinity, 0, 40],
    [4, 5, 0],
    [4, 5, -1],
    [4, 5, Infinity],
  ]) {
    const sample = sampleJoystick(x, y, radius);
    expect(sample.magnitude).toBe(0);
    for (const value of [sample.directionX, sample.directionY, sample.magnitude, sample.angle])
      expect(Number.isFinite(value)).toBe(true);
  }
});

class Touches {
  private points = new Map<number, Point>();
  constructor(private session: CDPSession) {}
  private async dispatch(type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel') {
    await this.session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: [...this.points].map(([id, point]) => ({ id, ...point })),
    });
  }
  async start(id: number, point: Point) {
    this.points.set(id, point);
    await this.dispatch('touchStart');
  }
  async move(id: number, point: Point) {
    this.points.set(id, point);
    await this.dispatch('touchMove');
  }
  async end(id: number) {
    const ended = this.points.get(id)!;
    this.points.delete(id);
    if (!this.points.size) {
      await this.dispatch('touchEnd');
      return;
    }
    // Chromium's WebTouch backend takes the released point here. The newer
    // synthetic backend instead infers releases from a reduced active set.
    try {
      await this.session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [{ id, ...ended }],
      });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('must not have any touch points'))
        throw error;
      await this.dispatch('touchMove');
    }
  }
  async cancel() {
    if (this.points.size === 0) return;
    this.points.clear();
    await this.dispatch('touchCancel');
  }
  async close() {
    await this.cancel();
    await this.session.detach();
  }
}

async function enter(page: Page) {
  await page.goto('./#/demo');
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).tap();
  await expect(page.locator('.loading-screen')).toBeHidden({ timeout: 15000 });
  await page.locator('.tutorial .primary').tap();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Movement joystick', exact: true })).toBeVisible();
}

async function geometry(page: Page) {
  const base = (await page.locator('.mobile-joystick').boundingBox())!;
  const thumb = (await page.locator('.joystick-thumb').boundingBox())!;
  const center = { x: base.x + base.width / 2, y: base.y + base.height / 2 };
  const radius = (base.width - thumb.width) / 2 - 4;
  return {
    base,
    thumb,
    center,
    radius,
    point: (x: number, y: number): Point => ({
      x: center.x + x * radius,
      y: center.y + y * radius,
    }),
  };
}

async function position(page: Page) {
  return page.locator('.minimap .player-dot').evaluate((element: HTMLElement) => ({
    x: parseFloat(element.style.left) * 9.6,
    y: parseFloat(element.style.top) * 8,
  }));
}

// The minimap emits actual physics positions every ~120ms. Sample several
// updates with browser timestamps, rather than assuming a fixed GPU framerate.
async function sampleMovement(page: Page, count = 5) {
  return page.locator('.minimap .player-dot').evaluate(
    (element: HTMLElement, sampleCount: number) =>
      new Promise<{ x: number; y: number; distance: number; speed: number }>((resolve, reject) => {
        const samples: { x: number; y: number; time: number }[] = [];
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Only ${samples.length} player-position updates arrived`));
        }, 7000);
        const observer = new MutationObserver(() => {
          const current = {
            x: parseFloat(element.style.left) * 9.6,
            y: parseFloat(element.style.top) * 8,
            time: performance.now(),
          };
          const previous = samples.at(-1);
          if (previous && previous.x === current.x && previous.y === current.y) return;
          samples.push(current);
          if (samples.length < sampleCount) return;
          observer.disconnect();
          window.clearTimeout(timeout);
          const first = samples[0];
          const x = current.x - first.x,
            y = current.y - first.y;
          const distance = Math.hypot(x, y);
          resolve({ x, y, distance, speed: distance / ((current.time - first.time) / 1000) });
        });
        observer.observe(element, { attributes: true, attributeFilter: ['style'] });
      }),
    count,
  );
}

async function expectStopped(page: Page) {
  await expect(page.locator('.mobile-joystick')).toHaveAttribute('data-active', 'false');
  // Let one final throttled position notification settle after pointer release.
  await page.waitForTimeout(200);
  const stopped = await position(page);
  await page.waitForTimeout(320);
  expect(await position(page)).toEqual(stopped);
  const { center, thumb } = await geometry(page);
  expect(Math.abs(thumb.x + thumb.width / 2 - center.x)).toBeLessThan(1);
  expect(Math.abs(thumb.y + thumb.height / 2 - center.y)).toBeLessThan(1);
}

test.describe('analogue joystick on genuine touch input', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('fixed centre, deadzone, bounded thumb and release outside', async ({ page }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    try {
      const stick = await geometry(page);
      const before = await position(page);
      await touches.start(1, stick.center);
      await touches.move(1, stick.point(0.08, -0.06));
      await expect(page.locator('.mobile-joystick')).toHaveAttribute('data-active', 'true');
      await page.waitForTimeout(400);
      expect(await position(page)).toEqual(before);
      // Pointer capture must continue tracking well outside the visible circle.
      await touches.move(1, stick.point(2, -2));
      const moving = await sampleMovement(page, 3);
      expect(moving.x).toBeGreaterThan(5);
      expect(moving.y).toBeLessThan(-5);
      const clamped = await geometry(page);
      expect(clamped.base).toEqual(stick.base);
      expect(
        Math.hypot(
          clamped.thumb.x + clamped.thumb.width / 2 - stick.center.x,
          clamped.thumb.y + clamped.thumb.height / 2 - stick.center.y,
        ),
      ).toBeLessThanOrEqual(stick.radius + 1);
      await touches.end(1);
      await expectStopped(page);
    } finally {
      await touches.close();
    }
  });

  test('partial deflection produces slower physical movement than full deflection', async ({
    page,
  }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    try {
      const stick = await geometry(page);
      await touches.start(1, stick.point(0, -0.55));
      const partial = await sampleMovement(page);
      await touches.move(1, stick.point(0, -1));
      const full = await sampleMovement(page);
      expect(partial.y).toBeLessThan(-5);
      expect(full.y).toBeLessThan(-15);
      expect(Math.abs(partial.x)).toBeLessThan(0.5);
      expect(Math.abs(full.x)).toBeLessThan(0.5);
      // 55% travel with a 15% deadzone remaps to ~47% speed. Broad enough for
      // software GPU scheduling, narrow enough to reject digital/full-speed input.
      expect(partial.speed / full.speed).toBeGreaterThan(0.3);
      expect(partial.speed / full.speed).toBeLessThan(0.66);
      await touches.end(1);
      await expectStopped(page);
    } finally {
      await touches.close();
    }
  });

  test('arbitrary angle survives quick direction changes without eight-way snapping', async ({
    page,
  }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    try {
      const stick = await geometry(page);
      await touches.start(1, stick.point(0.35, -Math.sqrt(1 - 0.35 ** 2)));
      const northeast = await sampleMovement(page, 4);
      const ratio = northeast.x / -northeast.y;
      expect(ratio).toBeGreaterThan(0.26);
      expect(ratio).toBeLessThan(0.5);
      await touches.move(1, stick.point(-0.35, Math.sqrt(1 - 0.35 ** 2)));
      const southwest = await sampleMovement(page, 4);
      expect(southwest.x).toBeLessThan(-5);
      expect(southwest.y).toBeGreaterThan(10);
      expect(-southwest.x / southwest.y).toBeGreaterThan(0.26);
      expect(-southwest.x / southwest.y).toBeLessThan(0.5);
      await touches.end(1);
      await expectStopped(page);
    } finally {
      await touches.close();
    }
  });

  test('full diagonal movement is not faster than full cardinal movement', async ({ page }) => {
    // Phaser smooths/clamps frame deltas. Real wall-clock samples can therefore
    // differ under software-GPU load even when both velocities are exactly 150.
    // Control RAF time while still exercising actual touch input and physics.
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await enter(page);
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
    await page.clock.runFor(1000);
    const touches = new Touches(await page.context().newCDPSession(page));
    const measure = async () => {
      // Settle direction, then use four complete 128ms position-report periods.
      await page.clock.runFor(256);
      const before = await position(page);
      await page.clock.runFor(512);
      const after = await position(page);
      const x = after.x - before.x,
        y = after.y - before.y;
      return { x, y, distance: Math.hypot(x, y) };
    };
    try {
      const stick = await geometry(page);
      await touches.start(1, stick.point(0, -1));
      const cardinal = await measure();
      await touches.move(1, stick.point(Math.SQRT1_2, -Math.SQRT1_2));
      const diagonal = await measure();
      expect(cardinal.distance).toBeGreaterThan(60);
      expect(diagonal.distance).toBeGreaterThan(60);
      expect(diagonal.x / -diagonal.y).toBeCloseTo(1, 1);
      expect(diagonal.distance / cardinal.distance).toBeGreaterThan(0.95);
      expect(diagonal.distance / cardinal.distance).toBeLessThan(1.05);
      await touches.end(1);
    } finally {
      await touches.close();
      await page.clock.resume();
    }
  });

  test('secondary finger cannot steal the stick and cancellation clears movement', async ({
    page,
  }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    try {
      const stick = await geometry(page);
      await touches.start(1, stick.point(0, -1));
      const ownedThumb = await page.locator('.joystick-thumb').boundingBox();
      await touches.start(2, stick.point(1, 0));
      await touches.move(2, stick.point(-1, 0));
      expect(await page.locator('.joystick-thumb').boundingBox()).toEqual(ownedThumb);
      const ownedMovement = await sampleMovement(page, 3);
      expect(Math.abs(ownedMovement.x)).toBeLessThan(0.5);
      expect(ownedMovement.y).toBeLessThan(-5);
      await touches.end(1);
      await touches.move(2, stick.point(1, 0));
      await expectStopped(page);
      await touches.end(2);
      // Move away from the fountain: the first hold already approached it, so
      // another upward hold could collide before three new positions arrive.
      await touches.start(3, stick.point(0, 1));
      const restarted = await sampleMovement(page, 3);
      expect(restarted.y).toBeGreaterThan(5);
      await touches.cancel();
      await expectStopped(page);
    } finally {
      await touches.close();
    }
  });

  test('second-finger A and menu actions work while held and cannot leave stuck movement', async ({
    page,
  }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    try {
      let stick = await geometry(page);
      await touches.start(1, stick.point(0, -0.5));
      const action = (await page
        .getByRole('button', { name: 'Interact', exact: true })
        .boundingBox())!;
      await touches.start(2, { x: action.x + action.width / 2, y: action.y + action.height / 2 });
      await touches.end(2);
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.mobile-joystick')).toBeHidden();
      await touches.end(1);
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).tap();
      await expectStopped(page);

      stick = await geometry(page);
      await touches.start(3, stick.point(0, -0.5));
      const menu = (await page
        .getByRole('button', { name: 'Open wedding menu', exact: true })
        .boundingBox())!;
      await touches.start(4, { x: menu.x + menu.width / 2, y: menu.y + menu.height / 2 });
      await touches.end(4);
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.mobile-joystick')).toBeHidden();
      await touches.end(3);
      await expect(page.getByRole('dialog')).toBeVisible();
      // An existing touch release must not dismiss the new card, but a fresh
      // gesture begun on its backdrop should still close it normally.
      await page.locator('.modal-backdrop').tap({ position: { x: 5, y: 5 } });
      await expectStopped(page);
    } finally {
      await touches.close();
    }
  });

  test('rotation and blur reset a held stick; controls remain separate and reachable', async ({
    page,
  }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    const checkLayout = async (width: number, height: number) => {
      const { base } = await geometry(page);
      expect(base.width).toBeGreaterThanOrEqual(width > height ? 110 : 120);
      expect(base.width).toBeLessThanOrEqual(width > height ? 126 : 144);
      expect(base.height).toBe(base.width);
      expect(base.x).toBeGreaterThanOrEqual(0);
      expect(base.y).toBeGreaterThanOrEqual(0);
      expect(base.x + base.width).toBeLessThanOrEqual(width);
      expect(base.y + base.height).toBeLessThanOrEqual(height);
      for (const name of ['Interact', 'Open wedding menu']) {
        const button = page.getByRole('button', { name, exact: true });
        await expect(button).toBeInViewport({ ratio: 1 });
        const box = (await button.boundingBox())!;
        const overlaps =
          base.x < box.x + box.width &&
          base.x + base.width > box.x &&
          base.y < box.y + box.height &&
          base.y + base.height > box.y;
        expect(overlaps, `${name} must not overlap the joystick`).toBe(false);
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    };
    try {
      await checkLayout(390, 844);
      let stick = await geometry(page);
      await touches.start(1, stick.point(0, -1));
      await sampleMovement(page, 3);
      await page.setViewportSize({ width: 844, height: 390 });
      await expectStopped(page);
      await touches.end(1);
      await checkLayout(844, 390);
      stick = await geometry(page);
      await touches.start(2, stick.point(0, -1));
      await sampleMovement(page, 3);
      // Deterministically dispatch the browser lifecycle event; movement itself
      // is still driven by a real, captured CDP touch rather than synthetic moves.
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await expect(page.locator('.mobile-joystick')).toBeHidden();
      await expect(page.getByRole('dialog')).toBeVisible();
      await touches.end(2);
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close dialog', exact: true }).tap();
      await expectStopped(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await checkLayout(390, 844);
    } finally {
      await touches.close();
    }
  });
});

test.describe('analogue collisions', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('analogue input respects fountain collision and can move away after release', async ({
    page,
  }) => {
    await enter(page);
    const touches = new Touches(await page.context().newCDPSession(page));
    try {
      const stick = await geometry(page);
      await touches.start(1, stick.point(0, -1));
      await expect.poll(async () => (await position(page)).y, { timeout: 15000 }).toBeLessThan(455);
      await page.waitForTimeout(400);
      const blocked = await position(page);
      await page.waitForTimeout(400);
      expect(await position(page)).toEqual(blocked);
      expect(blocked.y).toBeGreaterThan(430);
      expect(blocked.y).toBeLessThan(455);
      await touches.end(1);
      await expectStopped(page);
      await touches.start(2, stick.point(0, 0.65));
      await expect.poll(async () => (await position(page)).y).toBeGreaterThan(blocked.y + 8);
      await touches.end(2);
      await expectStopped(page);
    } finally {
      await touches.close();
    }
  });
});

test('desktop retains keyboard controls and hides the touch joystick', async ({ page }) => {
  await page.goto('./#/demo');
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  await expect(page.locator('.loading-screen')).toBeHidden({ timeout: 15000 });
  await page.locator('.tutorial .primary').click();
  await expect(page.locator('.mobile-joystick')).toBeHidden();
  const before = await position(page);
  await page.keyboard.down('w');
  await expect.poll(async () => (await position(page)).y).toBeLessThan(before.y - 8);
  await page.keyboard.up('w');
});
