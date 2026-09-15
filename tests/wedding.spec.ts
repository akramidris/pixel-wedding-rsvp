import { test, expect, type Page } from '@playwright/test';

async function enter(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  await expect(page.locator('.loading-screen')).toBeHidden();
  if (await page.getByRole('button', { name: 'Let’s explore' }).isVisible())
    await page.getByRole('button', { name: 'Let’s explore' }).click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
}
async function menu(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open wedding menu', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
test('landing, invitation, venue links, and calendar download', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Adam & Hana' })).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /View invitation/ }).click();
  await expect(page.locator('.couple-names')).toContainText('Adam Hakimi');
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Google Maps' })).toHaveAttribute(
    'href',
    /maps\/search/,
  );
  await expect(page.getByRole('link', { name: 'Waze' })).toHaveAttribute('href', /waze.com/);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /View invitation/ }).click();
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Guest Arrival' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  expect((await download).suggestedFilename()).toBe('our-wedding.ics');
  expect(errors).toEqual([]);
});
test('game movement, interaction, map, and composed photo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Assalamualaikum & Welcome!' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  const dot = page.locator('.minimap .player-dot');
  const before = await dot.getAttribute('style');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowUp');
  await expect(dot).not.toHaveAttribute('style', before!);
  await page.keyboard.press('m');
  await expect(page.getByRole('heading', { name: 'Find your way' })).toBeVisible();
  await page.getByRole('button', { name: 'View The Pelamin', exact: true }).click();
  await page.getByRole('button', { name: 'Take Photo', exact: true }).click();
  await expect(page.getByRole('img', { name: /A pixel photo/ })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Save our memory' }).click();
  expect((await download).suggestedFilename()).toBe('our-garden-memory.png');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.screenshot({ path: 'test-results/garden-desktop.png' });
  expect(errors).toEqual([]);
});
test('fountain collision stops movement and cards pause the player', async ({ page }) => {
  await enter(page);
  const dot = page.locator('.minimap .player-dot');
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(() => dot.evaluate((el) => Number.parseFloat((el as HTMLElement).style.top) * 8), {
      timeout: 15000,
    })
    .toBeLessThan(455);
  await page.waitForTimeout(600);
  const stopped = await dot.getAttribute('style');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowUp');
  await expect(dot).toHaveAttribute('style', stopped!);
  const y = await dot.evaluate((el) => Number.parseFloat((el as HTMLElement).style.top) * 8);
  expect(y).toBeGreaterThan(430);
  expect(y).toBeLessThan(455);
  await menu(page, 'Our Story');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  await expect(dot).toHaveAttribute('style', stopped!);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowLeft');
  await expect(dot).not.toHaveAttribute('style', stopped!);
});
test('music is opt-in and starts only after entering', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, '__musicPlays', { value: 0, writable: true });
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { __musicPlays: number }).__musicPlays++;
      return Promise.resolve();
    };
  });
  const count = () =>
    page.evaluate(() => (window as unknown as { __musicPlays: number }).__musicPlays);
  await page.goto('./');
  expect(await count()).toBe(0);
  await page.getByRole('button', { name: 'Music off', exact: true }).click();
  expect(await count()).toBe(0);
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  expect(await count()).toBe(1);
});
test('wishes accept spaces, reject blank text, and persist after reload', async ({ page }) => {
  await enter(page);
  await menu(page, 'Guestbook');
  await page.getByLabel('Your name').fill('   ');
  await page.getByLabel('Your wish').fill('   ');
  await page.getByRole('button', { name: 'Send Wish' }).click();
  await expect(page.getByRole('alert')).toContainText('Please add');
  await page.getByLabel('Your name').fill('');
  await page.getByLabel('Your name').pressSequentially('Auntie Sarah');
  await page.getByLabel('Your wish').fill('');
  await page.getByLabel('Your wish').pressSequentially('May your days be filled with love.');
  await expect(page.getByLabel('Your name')).toHaveValue('Auntie Sarah');
  await expect(page.getByLabel('Your wish')).toHaveValue('May your days be filled with love.');
  await page.getByRole('button', { name: 'Send Wish' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you for your beautiful wish');
  await page.reload();
  await enter(page);
  await menu(page, 'Guestbook');
  await expect(page.locator('.wish')).toContainText('May your days be filled with love.');
});
test('RSVP persists and decline stores zero guests', async ({ page }) => {
  await enter(page);
  await menu(page, 'RSVP');
  await page.getByLabel('Guest name').fill('Farah & Family');
  await page.getByLabel(/Number of guests/).selectOption('4');
  await page.getByRole('button', { name: 'Submit RSVP' }).click();
  await expect(page.getByRole('status')).toContainText('Your place is saved');
  await page.reload();
  await enter(page);
  await menu(page, 'RSVP');
  await expect(page.getByLabel('Guest name')).toHaveValue('Farah & Family');
  await expect(page.getByLabel(/Number of guests/)).toHaveValue('4');
  await page.getByLabel('Sorry, I cannot attend').check();
  await page.getByRole('button', { name: 'Submit RSVP' }).click();
  await expect(page.getByRole('status')).toContainText('Your response is saved');
  const response = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('garden-of-us-adam-hana-2027:rsvp')!),
  );
  expect(response.guests).toBe(0);
  expect(response.attending).toBe(false);
});
test('mobile layout and touch movement', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await page.evaluate(() => document.fonts.ready);
  const titleBounds = (await page.getByRole('heading', { name: 'Adam & Hana' }).boundingBox())!;
  const cardBounds = (await page.locator('.hero-copy').boundingBox())!;
  expect(titleBounds.x).toBeGreaterThanOrEqual(cardBounds.x);
  expect(titleBounds.x + titleBounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width);
  expect(cardBounds.x + cardBounds.width).toBeLessThan(390);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  // Keep this a viewport capture: full-page capture in this Chromium version
  // resets the manually created context's touch emulation to desktop defaults.
  await page.screenshot({ path: 'test-results/landing-mobile.png' });
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).tap();
  await expect(page.locator('.loading-screen')).toBeHidden();
  await page.getByRole('button', { name: 'Let’s explore' }).tap();
  const joystick = page.getByRole('group', { name: 'Movement joystick', exact: true });
  await expect(joystick).toBeVisible();
  const dot = page.locator('.minimap .player-dot'),
    before = await dot.getAttribute('style');
  const box = (await joystick.boundingBox())!;
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + 8 }],
  });
  await expect(dot).not.toHaveAttribute('style', before!);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await touch.detach();
  await expect(joystick).toHaveAttribute('data-active', 'false');
  await expect(dot).not.toHaveAttribute('style', before!);
  await page.screenshot({ path: 'test-results/garden-mobile.png' });
  await page.getByRole('button', { name: 'Open wedding menu', exact: true }).tap();
  await page.getByRole('button', { name: 'RSVP', exact: true }).tap();
  await expect(page.getByLabel('Guest name')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await context.close();
});
