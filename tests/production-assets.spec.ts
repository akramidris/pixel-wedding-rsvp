import { test, expect } from '@playwright/test';

test('production loads local artwork, lazy game, fonts, and audio without broken paths', async ({
  page,
  baseURL,
}) => {
  test.skip(process.env.TEST_PRODUCTION !== '1', 'Checks the compiled Pages deployment.');
  const errors: string[] = [];
  const failures: string[] = [];
  const origin = new URL(baseURL!).origin;
  const prefix = new URL(baseURL!).pathname;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });
  page.on('requestfailed', (request) => failures.push(new URL(request.url()).pathname));
  await page.goto('./#/demo');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: 'Adam & Hana' })).toBeVisible();
  await page.getByRole('button', { name: 'Music off', exact: true }).click();
  const audio = page.waitForResponse((response) => response.url().endsWith('garden-melody.wav'));
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  const response = await audio;
  expect(response.status()).toBeLessThan(400);
  expect(new URL(response.url()).pathname).toBe(`${prefix}audio/garden-melody.wav`);
  await expect(page.getByRole('button', { name: /explore/ })).toBeVisible();
  await page.getByRole('button', { name: /explore/ }).click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  const resources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => entry.name),
  );
  expect(resources.some((url) => url.includes('.woff2'))).toBeTruthy();
  expect(resources.some((url) => /phaser.*\.js/.test(url))).toBeTruthy();
  for (const resource of resources) {
    const url = new URL(resource);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      expect(url.origin).toBe(origin);
      expect(url.pathname.startsWith(prefix)).toBeTruthy();
    }
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'Enter Wedding', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});
