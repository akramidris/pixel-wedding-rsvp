import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

test('Retina canvas and compact minimap survive rotation without moving the guest', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).tap();
  await expect(page.locator('.loading-screen')).toBeHidden({ timeout: 15000 });
  await page.locator('.tutorial .primary').tap();

  const canvas = page.locator('.game-canvas canvas');
  const dot = page.locator('.minimap .player-dot');
  const minimap = page.locator('.minimap .map-image');
  const expectRetinaBacking = async () => {
    await expect
      .poll(async () =>
        canvas.evaluate((element: HTMLCanvasElement) => {
          const box = element.getBoundingClientRect();
          return {
            horizontal: Number((element.width / box.width).toFixed(3)),
            vertical: Number((element.height / box.height).toFixed(3)),
          };
        }),
      )
      .toEqual({ horizontal: 2, vertical: 2 });
    const backing = await canvas.evaluate((element: HTMLCanvasElement) => ({
      width: element.width,
      height: element.height,
      viewportHeight: innerHeight,
    }));
    expect(backing.width).toBeLessThanOrEqual(2560);
    expect(backing.height).toBeLessThanOrEqual(backing.viewportHeight * 2);
  };

  await expect(canvas).toBeVisible();
  await expectRetinaBacking();
  await expect(minimap).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show minimap', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show minimap', exact: true }).tap();
  await expect(minimap.locator('canvas')).toBeVisible();
  // A collapsed preview initially has no drawable box. Expansion must populate
  // a real bitmap through ResizeObserver, rather than reveal an empty canvas.
  await expect
    .poll(async () =>
      minimap.locator('canvas').evaluate((element: HTMLCanvasElement) => {
        const pixel = element.getContext('2d')!.getImageData(0, 0, 1, 1).data;
        return element.width > 1 && element.height > 1 && pixel[3] > 0;
      }),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Hide minimap', exact: true }).tap();
  await expect(minimap).toBeHidden();
  const beforeRotation = await dot.getAttribute('style');

  await page.setViewportSize({ width: 844, height: 390 });
  // This catches the former 400px game minimum in a 390px-high phone viewport.
  await expect
    .poll(async () =>
      canvas.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height, right: box.right, bottom: box.bottom };
      }),
    )
    .toEqual({ width: 844, height: 390, right: 844, bottom: 390 });
  await expectRetinaBacking();
  // Position notifications are throttled to 120ms; allow several updates after
  // resizing before checking that only the camera, not world position, changed.
  await page.waitForTimeout(400);
  await expect(dot).toHaveAttribute('style', beforeRotation!);
  await expect(page.getByRole('button', { name: 'Show minimap', exact: true })).toBeVisible();

  const beforeTop = await dot.evaluate((element) => parseFloat(element.style.top));
  const up = page.getByRole('button', { name: 'Move up', exact: true });
  await expect(up).toBeVisible();
  const box = (await up.boundingBox())!;
  expect(box.width, 'Landscape touch target must remain at least 44px wide').toBeGreaterThanOrEqual(
    44,
  );
  expect(
    box.height,
    'Landscape touch target must remain at least 44px tall',
  ).toBeGreaterThanOrEqual(44);
  const touch = await page.context().newCDPSession(page);
  try {
    // Genuine held touch input checks pointer capture after the canvas resizes.
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await expect
      .poll(async () => dot.evaluate((element) => parseFloat(element.style.top)))
      .toBeLessThan(beforeTop - 0.4);
  } finally {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open wedding menu', exact: true }).tap();
  await page.getByRole('button', { name: 'Invitation', exact: true }).tap();
  const invitation = page.locator('.formal-invitation');
  await expect(invitation).toBeVisible();
  const expectInvitationActionsReachable = async (viewportHeight: number) => {
    for (const name of ['Venue', 'Schedule', 'RSVP']) {
      const action = invitation.getByRole('button', { name, exact: true });
      await expect(action).toBeInViewport({ ratio: 1 });
      const bounds = (await action.boundingBox())!;
      expect(bounds.x, `${name} left edge`).toBeGreaterThanOrEqual(0);
      expect(bounds.y, `${name} top edge`).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width, `${name} right edge`).toBeLessThanOrEqual(390);
      expect(bounds.y + bounds.height, `${name} bottom edge`).toBeLessThanOrEqual(viewportHeight);
    }
  };
  // All three invitation actions must be fully reachable immediately, without
  // relying on Playwright's tap auto-scrolling an initially clipped button.
  await expectInvitationActionsReachable(844);

  await page.setViewportSize({ width: 390, height: 667 });
  const dialog = page.getByRole('dialog');
  await dialog.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expectInvitationActionsReachable(667);
  await invitation.getByRole('button', { name: 'RSVP', exact: true }).tap();
  await expect(page.getByLabel('Guest name')).toBeVisible();
  // The short viewport must still let the guest leave the card and resume play.
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.getByRole('button', { name: 'Close dialog', exact: true }).tap();
  await expect(dialog).toBeHidden();
  await expect(up).toBeVisible();
  expect(errors).toEqual([]);
});
