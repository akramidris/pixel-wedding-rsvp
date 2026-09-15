import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const round = process.argv[2] || '1';
const directory = `artifacts/visual/round-${round}`;
const url = process.env.VISUAL_URL || 'http://127.0.0.1:5173/#/demo';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const capture = async (page, name, fullPage = false) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${directory}/${name}.png`, fullPage, animations: 'disabled' });
};
const enter = async (page) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  await page.getByRole('button', { name: /explore/ }).click({ timeout: 20000 });
  await expect(page.locator('.loading-screen')).toBeHidden();
  await page.waitForTimeout(2200);
};
const menu = async (page, name) => {
  await page.getByRole('button', { name: 'Open wedding menu', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
};
const close = (page) => page.getByRole('button', { name: 'Close dialog' }).click();
async function walk(page, key, axis, target, greater) {
  // Exercise the same input as the touch controls, stopping on real physics
  // events to avoid remote keyboard-up latency while capturing screenshots.
  await page.evaluate(
    async ({ key, axis, target, greater }) => {
      const { bridge } = await import('/src/game/bridge.ts');
      const direction = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }[key];
      await new Promise((resolve, reject) => {
        let last;
        const timer = setTimeout(() => {
          off();
          bridge.resetInput();
          reject(
            new Error(`Route blocked on ${axis} at target ${target}: ${JSON.stringify(last)}`),
          );
        }, 20000);
        const off = bridge.on('position', (position) => {
          last = position;
          if (greater ? position[axis] >= target : position[axis] <= target) {
            bridge.resetInput();
            off();
            clearTimeout(timer);
            resolve();
          }
        });
        bridge.input[direction] = true;
      });
    },
    { key, axis, target, greater },
  );
}
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await capture(page, 'landing-desktop', true);
  await enter(page);
  await capture(page, 'game-desktop');
  await walk(page, 'ArrowUp', 'y', 475, false);
  await walk(page, 'ArrowRight', 'x', 638, true);
  await walk(page, 'ArrowUp', 'y', 370, false);
  await page.waitForTimeout(300);
  await capture(page, 'pelamin-desktop');
  await menu(page, 'Village Map');
  await page.getByRole('button', { name: 'View The Pelamin', exact: true }).click();
  await capture(page, 'couple-card');
  await page.getByRole('button', { name: 'Take Photo', exact: true }).click();
  await capture(page, 'photo-card');
  await close(page);
  await menu(page, 'Invitation');
  await capture(page, 'invitation-desktop');
  await close(page);
  await menu(page, 'Village Map');
  await capture(page, 'map-desktop');
  await close(page);
  await menu(page, 'Guestbook');
  await capture(page, 'guestbook-desktop');
  await close(page);
  // Show native artwork separately so the critic can distinguish authored detail
  // from camera/CSS interpolation. Uses the same local modules as the game.
  const sheet = await page.evaluate(async () => {
    const { drawCharacter } = await import('/src/game/art/characters.ts');
    const { drawGarden } = await import('/src/game/art/garden.ts');
    const world = document.createElement('canvas');
    drawGarden(world);
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 320;
    const c = canvas.getContext('2d');
    c.fillStyle = '#f7f4e9';
    c.fillRect(0, 0, 960, 320);
    ['bride', 'groom', 'guest', 'father', 'mother', 'host', 'photographer', 'staff'].forEach(
      (kind, i) => {
        drawCharacter(c, i * 120 + 27, 24, kind, 0, 0, 2);
        drawCharacter(c, i * 120 + 27, 175, kind, 3, 1, 2);
        c.fillStyle = '#526748';
        c.font = '13px sans-serif';
        c.textAlign = 'center';
        c.fillText(kind, i * 120 + 60, 142);
      },
    );
    return { sheet: canvas.toDataURL(), world: world.toDataURL() };
  });
  await writeFile(`${directory}/characters.png`, Buffer.from(sheet.sheet.split(',')[1], 'base64'));
  await writeFile(`${directory}/world.png`, Buffer.from(sheet.world.split(',')[1], 'base64'));
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const phone = await phoneContext.newPage();
  phone.on('pageerror', (error) => errors.push(error.message));
  await phone.goto(url);
  await capture(phone, 'landing-mobile', true);
  await enter(phone);
  await capture(phone, 'game-mobile');
  await menu(phone, 'RSVP');
  await capture(phone, 'rsvp-mobile');
  await close(phone);
  await menu(phone, 'Invitation');
  await capture(phone, 'invitation-mobile');
  await close(phone);
  await menu(phone, 'Village Map');
  await capture(phone, 'map-mobile');
  await close(phone);
  await menu(phone, 'Music');
  await capture(phone, 'music-mobile');
  await close(phone);
  await phone.setViewportSize({ width: 844, height: 390 });
  await phone.waitForTimeout(1800);
  await capture(phone, 'game-landscape');
  const measurements = await page.evaluate(() => {
    const canvas = document.querySelector('.game-canvas canvas');
    return {
      css: { width: canvas.clientWidth, height: canvas.clientHeight },
      backing: { width: canvas.width, height: canvas.height },
    };
  });
  await writeFile(
    `${directory}/evidence.json`,
    JSON.stringify({ round, url, errors, desktopCanvas: measurements }, null, 2),
  );
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Visual evidence captured: ${directory}`);
} finally {
  await browser.close();
}
