import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  await page.getByRole('button', { name: /explore/ }).click();
  await expect(page.locator('.loading-screen')).toBeHidden();
  await page.waitForTimeout(2200);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(2200);
  await page.screenshot({
    path: `artifacts/visual/round-${process.argv[2] || '1'}/game-landscape.png`,
  });
  console.log(
    await page
      .locator('.game-canvas canvas')
      .evaluate((c) => ({ css: [c.clientWidth, c.clientHeight], backing: [c.width, c.height] })),
  );
} finally {
  await browser.close();
}
