import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'artifacts/joystick';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const url = process.env.VISUAL_URL || 'http://127.0.0.1:5173/#/demo';
async function enter(page) {
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const touch = await page.evaluate(() => navigator.maxTouchPoints > 0);
  const activate = (locator) =>
    touch ? locator.tap({ timeout: 30000 }) : locator.click({ timeout: 30000 });
  await activate(page.getByRole('button', { name: 'Enter Wedding', exact: true }));
  await activate(page.getByRole('button', { name: /explore/ }));
  await expect(page.locator('.loading-screen')).toBeHidden({ timeout: 15000 });
  await page.waitForTimeout(1600);
}
async function shot(page, name) {
  await page.screenshot({ path: `${directory}/${name}.png` });
}
try {
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await enter(phone);
  await shot(phone, 'portrait-idle');
  const box = await phone.getByRole('group', { name: 'Movement joystick' }).boundingBox();
  const touch = await phone.context().newCDPSession(phone);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ ...point, x: point.x + 23, y: point.y - 17 }],
  });
  await phone.waitForTimeout(350);
  await shot(phone, 'portrait-drag');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.detach();
  await phone.setViewportSize({ width: 844, height: 390 });
  await phone.waitForTimeout(1600);
  await shot(phone, 'landscape');
  await phone.setViewportSize({ width: 360, height: 667 });
  await phone.waitForTimeout(1000);
  await shot(phone, 'small-phone');
  await phone.setViewportSize({ width: 768, height: 1024 });
  await phone.waitForTimeout(1000);
  await shot(phone, 'tablet');
  await phone.close();
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await enter(desktop);
  await shot(desktop, 'desktop');
  await desktop.setViewportSize({ width: 500, height: 800 });
  await desktop.waitForTimeout(1000);
  await shot(desktop, 'narrow-desktop');
  expect(errors).toEqual([]);
  await writeFile(`${directory}/evidence.json`, JSON.stringify({ url, errors }, null, 2));
  console.log(`Joystick evidence saved to ${directory}`);
} finally {
  await browser.close();
}
