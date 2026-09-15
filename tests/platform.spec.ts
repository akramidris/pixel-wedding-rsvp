import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockPlatform, OWNER_ID, PASSWORD, WEDDING_A_ID, WEDDING_B_ID } from './fixtures/platform';

// The fixture URL/public key are injected only into the isolated test dev server.
// Never build or deploy the public application with these fake credentials.
test.skip(
  process.env.TEST_PRODUCTION === '1',
  'Platform HTTP fixtures require the configured test dev server.',
);

async function wedding(page: Page, slug: string) {
  await page.goto(`./#/wedding/${slug}`);
  await expect(page.getByRole('button', { name: 'Enter Wedding', exact: true })).toBeVisible();
}
async function switchWedding(page: Page, slug: string) {
  await page.evaluate((value) => {
    window.location.hash = `/wedding/${value}`;
  }, slug);
  await expect(page.getByRole('button', { name: 'Enter Wedding', exact: true })).toBeVisible();
}
async function enter(page: Page) {
  await page.getByRole('button', { name: 'Enter Wedding', exact: true }).click();
  await expect(page.locator('.loading-screen')).toBeHidden({ timeout: 25000 });
  if (await page.getByRole('button', { name: 'Let’s explore' }).isVisible())
    await page.getByRole('button', { name: 'Let’s explore' }).click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
}
async function menu(page: Page, panel: string) {
  await page.getByRole('button', { name: 'Open wedding menu', exact: true }).click();
  await page.getByRole('button', { name: panel, exact: true }).click();
}
async function invitationRSVP(page: Page) {
  await page.getByRole('button', { name: /View invitation/ }).click();
  await page.getByRole('button', { name: 'RSVP', exact: true }).click();
  await expect(page.getByLabel('Guest name')).toBeEnabled();
}
function noPublicRSVPList(mock: Awaited<ReturnType<typeof mockPlatform>>) {
  expect(mock.calls.filter((call) => call.path === '/rest/v1/rsvps')).toEqual([]);
  expect(mock.unexpected).toEqual([]);
}

for (const example of [
  {
    slug: 'akram-aisyah',
    couple: 'Akram & Aisyah',
    date: '20 February 2027',
    venue: 'The Glasshouse',
    story: 'An unexpected hello',
    schedule: 'Guest arrival',
    theme: 'sage',
  },
  {
    slug: 'amir-nurul',
    couple: 'Amir & Nurul',
    date: '12 June 2027',
    venue: 'Taman Botani Reception Hall',
    story: 'A shared beginning',
    schedule: 'Welcome and refreshments',
    theme: 'rose',
  },
]) {
  test(`${example.slug} loads its own names, date, venue, story, schedule, and theme`, async ({
    page,
  }) => {
    const mock = await mockPlatform(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await wedding(page, example.slug);
    await expect(page.getByRole('heading', { name: example.couple, exact: true })).toBeVisible();
    await expect(page.locator('.date-line')).toContainText(example.date);
    await expect(page.locator('.venue-line')).toContainText(example.venue);
    await expect(page.locator('.wedding-experience')).toHaveAttribute(
      'data-wedding-theme',
      example.theme,
    );
    await page.getByRole('button', { name: /View invitation/ }).click();
    await page.getByRole('button', { name: 'Venue', exact: true }).click();
    await expect(page.getByRole('heading', { name: example.venue, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await enter(page);
    const loads = mock.rpcCalls('get_public_wedding').length;
    await menu(page, 'Our Story');
    await expect(page.getByRole('heading', { name: example.story, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await menu(page, 'Schedule');
    await expect(page.getByRole('heading', { name: example.schedule, exact: true })).toBeVisible();
    await expect(page.locator('.schedule-date')).toContainText(example.date);
    expect(mock.rpcCalls('get_public_wedding').length).toBe(loads);
    expect(
      mock.rpcCalls('get_public_wedding').every((call) => call.body.p_slug === example.slug),
    ).toBe(true);
    noPublicRSVPList(mock);
    expect(errors).toEqual([]);
  });
}

test('switching wedding URLs resets the running game and uses the next wedding interactions', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await wedding(page, 'akram-aisyah');
  await enter(page);
  const dot = page.locator('.minimap .player-dot');
  const start = await dot.getAttribute('style');
  await page.keyboard.down('ArrowUp');
  await expect(dot).not.toHaveAttribute('style', start!);
  await page.keyboard.up('ArrowUp');
  await menu(page, 'Our Story');
  await expect(page.locator('.discovery-card')).toContainText('1 / 8');
  await switchWedding(page, 'amir-nurul');
  await expect(page.getByRole('heading', { name: 'Amir & Nurul' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await enter(page);
  await expect(page.locator('.discovery-card')).toContainText('0 / 8');
  await expect(dot).toHaveAttribute('style', start!);
  await page.keyboard.press('e');
  await expect(page.getByRole('heading', { name: 'Amir & Nurul', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Akram & Aisyah', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  noPublicRSVPList(mock);
});

test('RSVP uses each wedding ID, preserves its own response, and blocks concurrent duplicate submits', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  await wedding(page, 'akram-aisyah');
  await invitationRSVP(page);
  await page.getByLabel('Guest name').fill('Farah, Family A');
  await page.getByLabel(/Number of guests/).selectOption('4');
  await page.getByLabel(/Phone/).fill('+60 12 345 6789');
  await page.getByLabel(/A little note/).fill('We will join the garden celebration.');
  const release = mock.hold('submit_rsvp');
  try {
    await page.getByRole('button', { name: 'Submit RSVP' }).click();
    await expect.poll(() => mock.rpcCalls('submit_rsvp').length).toBe(1);
    await page.locator('form').dispatchEvent('submit');
    await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(mock.rpcCalls('submit_rsvp')).toHaveLength(1);
  } finally {
    release();
  }
  await expect(page.locator('.success')).toContainText('sent to the couple');
  expect(mock.rsvps[0]).toMatchObject({
    wedding_id: WEDDING_A_ID,
    guest_name: 'Farah, Family A',
    attendance: 'attending',
    guest_count: 4,
    phone: '+60 12 345 6789',
  });
  await expect(page.locator('.storage-note')).not.toContainText('saved on this device');

  await switchWedding(page, 'amir-nurul');
  await invitationRSVP(page);
  await expect(page.getByLabel('Guest name')).toHaveValue('');
  await expect(page.getByLabel(/Number of guests/).locator('option')).toHaveCount(3);
  await page.getByLabel('Guest name').fill('Haziq, Family B');
  await page.getByLabel('Sorry, I cannot attend').check();
  await page.getByRole('button', { name: 'Submit RSVP' }).click();
  await expect(page.locator('.success')).toContainText('sent to the couple');
  expect(mock.rsvps[1]).toMatchObject({
    wedding_id: WEDDING_B_ID,
    guest_name: 'Haziq, Family B',
    attendance: 'not_attending',
    guest_count: 0,
  });
  expect(mock.rsvps[0].submission_token).not.toBe(mock.rsvps[1].submission_token);

  await switchWedding(page, 'akram-aisyah');
  await invitationRSVP(page);
  await expect(page.getByLabel('Guest name')).toHaveValue('Farah, Family A');
  await expect(page.getByLabel(/Number of guests/)).toHaveValue('4');
  expect(mock.rpcCalls('submit_rsvp').map((call) => call.body.p_wedding_id)).toEqual([
    WEDDING_A_ID,
    WEDDING_B_ID,
  ]);
  noPublicRSVPList(mock);
});

test('wishes are wedding-scoped and pending submissions never appear publicly', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  await wedding(page, 'akram-aisyah');
  await enter(page);
  await menu(page, 'Guestbook');
  await expect(page.locator('.wish')).toContainText('Approved love for Akram and Aisyah.');
  await expect(page.locator('.wish-board')).not.toContainText('private pending');
  await expect(page.locator('.wish-board')).not.toContainText('Amir and Nurul');
  await page.getByLabel('Your name').fill('Sarah A');
  await page.getByLabel('Your wish').fill('Our new private wish for wedding A.');
  const release = mock.hold('submit_wish');
  try {
    await page.getByRole('button', { name: 'Send Wish' }).click();
    await expect.poll(() => mock.rpcCalls('submit_wish').length).toBe(1);
    await page.locator('form').dispatchEvent('submit');
    expect(mock.rpcCalls('submit_wish')).toHaveLength(1);
  } finally {
    release();
  }
  await expect(page.locator('.success')).toContainText('waiting for approval');
  await expect(page.locator('.wish-board')).not.toContainText('Our new private wish');

  await switchWedding(page, 'amir-nurul');
  await enter(page);
  await menu(page, 'Guestbook');
  await expect(page.locator('.wish')).toContainText('Approved love for Amir and Nurul.');
  await expect(page.locator('.wish-board')).not.toContainText('Akram and Aisyah');
  await page.getByLabel('Your name').fill('Sarah B');
  await page.getByLabel('Your wish').fill('Our new private wish for wedding B.');
  await page.getByRole('button', { name: 'Send Wish' }).click();
  await expect(page.locator('.success')).toContainText('waiting for approval');
  expect(mock.wishes.filter((wish) => wish.guest_name.startsWith('Sarah'))).toEqual([
    expect.objectContaining({ wedding_id: WEDDING_A_ID, approved: false }),
    expect.objectContaining({ wedding_id: WEDDING_B_ID, approved: false }),
  ]);
  expect(mock.rpcCalls('submit_wish').map((call) => call.body.p_wedding_id)).toEqual([
    WEDDING_A_ID,
    WEDDING_B_ID,
  ]);
  noPublicRSVPList(mock);
});

test('an RSVP network failure keeps the guest input and can be retried', async ({ page }) => {
  const mock = await mockPlatform(page);
  await wedding(page, 'akram-aisyah');
  await invitationRSVP(page);
  await page.getByLabel('Guest name').fill('A guest with an interrupted connection');
  mock.failNext('submit_rsvp');
  await page.getByRole('button', { name: 'Submit RSVP' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Guest name')).toHaveValue('A guest with an interrupted connection');
  expect(mock.rsvps).toHaveLength(0);
  await page.getByRole('button', { name: 'Submit RSVP' }).click();
  await expect(page.locator('.success')).toContainText('sent to the couple');
  expect(mock.rsvps).toHaveLength(1);
});

for (const example of [
  { slug: 'unknown-couple', heading: /not found/i },
  { slug: 'expired-wedding', heading: /expired/i },
  { slug: 'archived-wedding', heading: /archived/i },
]) {
  test(`${example.slug} shows a graceful status and cannot accept RSVP`, async ({ page }) => {
    const mock = await mockPlatform(page);
    await page.goto(`./#/wedding/${example.slug}`);
    await expect(page.getByRole('heading', { name: example.heading })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter Wedding', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Submit RSVP' })).toHaveCount(0);
    expect(mock.rpcCalls('submit_rsvp')).toEqual([]);
  });
}

test('invalid slug is rejected without a database query', async ({ page }) => {
  const mock = await mockPlatform(page);
  await page.goto('./#/wedding/INVALID_SLUG');
  await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  expect(mock.rpcCalls('get_public_wedding')).toEqual([]);
});

test('wedding loading failure offers a working retry', async ({ page }) => {
  const mock = await mockPlatform(page);
  // Fail the initial request phase, including StrictMode's aborted first load.
  let unavailable = true;
  await page.route(
    'https://wedding.test.supabase.co/rest/v1/rpc/get_public_wedding',
    async (route) => {
      if (unavailable)
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'The wedding service is temporarily unavailable.' }),
        });
      return route.fallback();
    },
  );
  await page.goto('./#/wedding/akram-aisyah');
  const retry = page.getByRole('button', { name: /Try again|Retry/i });
  await expect(retry).toBeVisible();
  unavailable = false;
  await retry.click();
  await expect(page.getByRole('heading', { name: 'Akram & Aisyah', exact: true })).toBeVisible();
  noPublicRSVPList(mock);
});

for (const route of ['/dashboard', '/admin', `/dashboard/weddings/${WEDDING_A_ID}/rsvp`]) {
  test(`anonymous visitors are sent to login from ${route}`, async ({ page }) => {
    const mock = await mockPlatform(page);
    await page.goto(`./#${route}`);
    await expect(page).toHaveURL(/#\/login(?:\?|$)/);
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    expect(
      mock.calls.filter((call) =>
        ['/rest/v1/weddings', '/rest/v1/rsvps', '/rest/v1/profiles'].includes(call.path),
      ),
    ).toEqual([]);
  });
}

async function signIn(page: Page, email = 'owner@example.test') {
  await page.goto('./#/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Wedding dashboard', exact: true })).toBeVisible();
}

test('password sign-in persists a verified session, shows only owner weddings, and logs out', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  await signIn(page);
  await expect(page.getByRole('article', { name: 'Akram & Aisyah' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Amir & Nurul' })).toHaveCount(0);
  expect(
    mock.calls.some(
      (call) => call.path === '/auth/v1/token' && call.body.email === 'owner@example.test',
    ),
  ).toBe(true);
  expect(mock.calls.some((call) => call.path === '/auth/v1/user')).toBe(true);
  await page.reload();
  await expect(page.getByRole('article', { name: 'Akram & Aisyah' })).toBeVisible();
  expect(
    mock.calls.filter((call) => call.path === '/auth/v1/token' && call.search.includes('password')),
  ).toHaveLength(1);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await page.goto('./#/dashboard');
  await expect(page).toHaveURL(/#\/login$/);
  expect(mock.calls.some((call) => call.path === '/auth/v1/logout')).toBe(true);
  expect(mock.unexpected).toEqual([]);
});

test('invalid credentials show an error without granting dashboard access', async ({ page }) => {
  const mock = await mockPlatform(page);
  await page.goto('./#/login');
  await page.getByLabel('Email', { exact: true }).fill('wrong@example.test');
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sign-in failed');
  await expect(page).toHaveURL(/#\/login$/);
  expect(mock.calls.some((call) => call.path === '/rest/v1/weddings')).toBe(false);
});

test('customer sees denied access for another wedding and for the admin route', async ({
  page,
}) => {
  await mockPlatform(page);
  await signIn(page);
  await page.goto(`./#/dashboard/weddings/${WEDDING_B_ID}/rsvp`);
  await expect(page.getByRole('alert')).toContainText(/access|does not exist/i);
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.goto('./#/admin');
  await expect(page.getByRole('heading', { name: 'Access restricted' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create wedding', exact: true })).toHaveCount(0);
});

test('owner RSVP dashboard filters, totals, and exports an escaped wedding-specific CSV', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  mock.rsvps.push(
    {
      id: 'f0000000-0000-4000-8000-000000000001',
      wedding_id: WEDDING_A_ID,
      submission_token: 'a-token',
      guest_name: 'Farah, "Family"',
      attendance: 'attending',
      guest_count: 4,
      phone: '+60 123',
      message: 'Hello,\n"world"',
      created_at: '2026-09-15T10:00:00Z',
    },
    {
      id: 'f0000000-0000-4000-8000-000000000002',
      wedding_id: WEDDING_A_ID,
      submission_token: 'b-token',
      guest_name: '=A1',
      attendance: 'not_attending',
      guest_count: 0,
      phone: '',
      message: '  @unsafe-formula',
      created_at: '2026-09-15T11:00:00Z',
    },
    {
      id: 'f0000000-0000-4000-8000-000000000003',
      wedding_id: WEDDING_B_ID,
      submission_token: 'c-token',
      guest_name: 'Private Wedding B Guest',
      attendance: 'attending',
      guest_count: 3,
      phone: '',
      message: '',
      created_at: '2026-09-15T12:00:00Z',
    },
  );
  await signIn(page);
  await page.getByRole('link', { name: 'View RSVP', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.locator('tbody')).not.toContainText('Private Wedding B Guest');
  await expect(
    page
      .locator('.platform-stats div')
      .filter({ has: page.getByText('Expected guests', { exact: true }) })
      .locator('dd'),
  ).toHaveText('4');
  await page.getByRole('combobox', { name: 'Attendance', exact: true }).selectOption('attending');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Search guest names').fill('missing');
  await expect(page.getByRole('heading', { name: 'No matching guests' })).toBeVisible();
  await page.getByLabel('Search guest names').fill('');
  await page.getByRole('combobox', { name: 'Attendance', exact: true }).selectOption('all');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export RSVP CSV', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('akram-aisyah-rsvp.csv');
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('"Guest Name","Attendance","Guest Count","Phone","Message","Submitted At"');
  expect(csv).toContain('"Farah, ""Family""","Attending","4","\'+60 123","Hello,\n""world"""');
  expect(csv).toContain('"\'=A1","Not attending","0","","\'  @unsafe-formula"');
  expect(csv).not.toContain('Private Wedding B Guest');
  expect(
    mock.calls
      .filter((call) => call.path === '/rest/v1/rsvps')
      .every((call) => call.search.includes(`wedding_id=eq.${WEDDING_A_ID}`)),
  ).toBe(true);
});

test('owner approves and hides a wish through the wedding-scoped management request', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  await signIn(page);
  await page.getByRole('link', { name: 'View wishes', exact: true }).click();
  const pending = page
    .locator('.platform-wish')
    .filter({ has: page.getByRole('heading', { name: 'Pending Guest', exact: true }) });
  await pending.getByRole('button', { name: 'Approve wish', exact: true }).click();
  await expect(pending.getByRole('button', { name: 'Hide wish', exact: true })).toBeVisible();
  expect(mock.wishes.find((wish) => wish.guest_name === 'Pending Guest')?.approved).toBe(true);
  await pending.getByRole('button', { name: 'Hide wish', exact: true }).click();
  await expect(pending.getByRole('button', { name: 'Approve wish', exact: true })).toBeVisible();
  expect(mock.wishes.find((wish) => wish.guest_name === 'Pending Guest')?.approved).toBe(false);
  const changes = mock.calls.filter(
    (call) => call.path === '/rest/v1/wishes' && call.method === 'PATCH',
  );
  expect(changes.map((call) => call.body.approved)).toEqual([true, false]);
  expect(changes.every((call) => call.search.includes(`wedding_id=eq.${WEDDING_A_ID}`))).toBe(true);
});

test('owner editor saves allowed fields and the public invitation loads the new details', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  await signIn(page);
  await page.getByRole('link', { name: 'Edit wedding', exact: true }).click();
  await page.getByLabel('Venue name', { exact: true }).fill('Updated Garden Hall');
  await page.getByLabel('Moment title', { exact: true }).fill('Our revised story');
  await page.getByLabel('Champagne', { exact: true }).check();
  await expect(page.getByLabel('Wedding owner', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save wedding', exact: true }).click();
  await expect(page.locator('.platform-feedback')).toContainText('Wedding saved');
  const patch = mock.calls.find(
    (call) => call.path === '/rest/v1/weddings' && call.method === 'PATCH',
  )!;
  expect(patch.body).toMatchObject({ venue_name: 'Updated Garden Hall', theme: 'champagne' });
  for (const field of ['owner_id', 'slug', 'status', 'template', 'expires_at', 'settings'])
    expect(patch.body).not.toHaveProperty(field);
  await wedding(page, 'akram-aisyah');
  await expect(page.locator('.venue-line')).toContainText('Updated Garden Hall');
  await expect(page.locator('.wedding-experience')).toHaveAttribute(
    'data-wedding-theme',
    'champagne',
  );
  expect(mock.weddings[1].venue_name).toBe('Taman Botani Reception Hall');
});

test('admin creates an active wedding and its public URL works without a code change', async ({
  page,
}) => {
  const mock = await mockPlatform(page);
  mock.rsvps.push({
    id: 'f0000000-0000-4000-8000-000000000010',
    wedding_id: WEDDING_A_ID,
    submission_token: 'admin-totals-test-token',
    guest_name: 'Admin totals guest',
    attendance: 'attending',
    guest_count: 3,
    phone: '',
    message: '',
    created_at: '2026-09-15T10:00:00Z',
  });
  const statValue = (label: string) =>
    page
      .locator('.platform-stats div')
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator('dd');
  await signIn(page, 'admin@example.test');
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Every celebration, one place' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(statValue('Total weddings')).toHaveText('2');
  await expect(statValue('Active')).toHaveText('2');
  await expect(statValue('Draft')).toHaveText('0');
  await expect(statValue('Expired')).toHaveText('0');
  await expect(statValue('RSVP responses')).toHaveText('1');
  await page.getByRole('link', { name: 'Create wedding', exact: true }).click();
  await page.getByLabel('Groom name', { exact: true }).fill('Hafiz');
  await page.getByLabel('Bride name', { exact: true }).fill('Sarah');
  await page.getByLabel('Wedding date', { exact: true }).fill('2027-08-15');
  await page.getByLabel('Venue name', { exact: true }).fill('A New Celebration Hall');
  await page.getByLabel('Venue address', { exact: true }).fill('Shah Alam, Malaysia');
  await page.getByRole('combobox', { name: 'Wedding owner', exact: true }).selectOption(OWNER_ID);
  await page.getByLabel('Invitation slug', { exact: true }).fill('hafiz-sarah');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('active');
  await page.getByRole('button', { name: 'Create wedding', exact: true }).click();
  await expect(page).toHaveURL(/#\/admin\/weddings\/[^/]+\/edit$/);
  const created = mock.weddings.find((wedding) => wedding.slug === 'hafiz-sarah');
  expect(created).toMatchObject({
    owner_id: OWNER_ID,
    status: 'active',
    groom_name: 'Hafiz',
    bride_name: 'Sarah',
  });
  await page.goto('./#/admin');
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await expect(statValue('Total weddings')).toHaveText('3');
  await expect(statValue('Active')).toHaveText('3');
  await expect(statValue('RSVP responses')).toHaveText('1');
  await wedding(page, 'hafiz-sarah');
  await expect(page.getByRole('heading', { name: 'Hafiz & Sarah' })).toBeVisible();
  await expect(page.locator('.venue-line')).toContainText('A New Celebration Hall');
  expect(
    mock.calls.filter((call) => call.path === '/rest/v1/weddings' && call.method === 'POST'),
  ).toHaveLength(1);
});

for (const phone of [
  { name: 'iPhone-style', width: 390, height: 844 },
  { name: 'Android-style', width: 412, height: 915 },
]) {
  test.describe(`${phone.name} viewport`, () => {
    test.use({
      viewport: { width: phone.width, height: phone.height },
      isMobile: true,
      hasTouch: true,
    });
    test('real wedding keeps analog input, interaction and scrollable RSVP with a shortened keyboard viewport', async ({
      page,
    }) => {
      const mock = await mockPlatform(page);
      await wedding(page, 'akram-aisyah');
      await enter(page);
      const joystick = page.getByRole('group', { name: 'Movement joystick', exact: true });
      await expect(joystick).toBeVisible();
      await page.getByRole('button', { name: 'Interact', exact: true }).tap();
      await expect(page.getByRole('heading', { name: 'Assalamualaikum & Welcome!' })).toBeVisible();
      await page.getByRole('button', { name: 'Close dialog' }).tap();
      const dot = page.locator('.minimap .player-dot'),
        before = await dot.getAttribute('style');
      const box = (await joystick.boundingBox())!;
      const touch = await page.context().newCDPSession(page);
      try {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 }],
        });
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ id: 1, x: box.x + box.width / 2, y: box.y + 8 }],
        });
        await expect(dot).not.toHaveAttribute('style', before!);
      } finally {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      }
      await expect(joystick).toHaveAttribute('data-active', 'false');
      await menu(page, 'RSVP');
      await page.getByLabel('Guest name').fill(`${phone.name} guest`);
      await page.setViewportSize({ width: phone.width, height: 430 });
      await page.getByLabel(/Phone/).fill('+60 12 222 3333');
      const submit = page.getByRole('button', { name: 'Submit RSVP', exact: true });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await submit.tap();
      await expect(page.locator('.success')).toContainText('sent to the couple');
      expect(mock.rsvps[0].wedding_id).toBe(WEDDING_A_ID);
      await page.setViewportSize({ width: phone.width, height: phone.height });
      await page.getByRole('button', { name: 'Close dialog' }).tap();
      await expect(joystick).toBeVisible();
    });
  });
}
