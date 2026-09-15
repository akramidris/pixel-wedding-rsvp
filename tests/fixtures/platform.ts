import type { Page, Route } from '@playwright/test';
import type { Profile, RSVPRecord, WeddingRecord, WishRecord } from '../../src/types/wedding';

export const PLATFORM_URL = 'https://wedding.test.supabase.co';
export const WEDDING_A_ID = 'a0000000-0000-4000-8000-000000000001';
export const WEDDING_B_ID = 'b0000000-0000-4000-8000-000000000002';
export const OWNER_ID = 'c0000000-0000-4000-8000-000000000001';
export const OTHER_OWNER_ID = 'c0000000-0000-4000-8000-000000000002';
export const ADMIN_ID = 'c0000000-0000-4000-8000-000000000003';
export const PASSWORD = 'Correct horse battery staple!';
const CREATED_AT = '2026-09-15T00:00:00.000Z';

export function weddingFixtures(): WeddingRecord[] {
  const common = {
    start_time: '11:00:00',
    end_time: '16:00:00',
    template: 'garden' as const,
    music_url: null,
    status: 'active' as const,
    expires_at: '2028-12-31T00:00:00Z',
    settings: { max_guests: 5, utc_offset: '+08:00', timezone: 'Asia/Kuala_Lumpur' },
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
  };
  return [
    {
      ...common,
      id: WEDDING_A_ID,
      owner_id: OWNER_ID,
      slug: 'akram-aisyah',
      groom_name: 'Akram',
      bride_name: 'Aisyah',
      wedding_date: '2027-02-20',
      venue_name: 'The Glasshouse',
      venue_address: 'Seputeh, Kuala Lumpur, Malaysia',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Glasshouse',
      waze_url: 'https://waze.com/ul?q=Glasshouse&navigate=yes',
      theme: 'sage',
      story: [
        {
          year: '2022',
          title: 'An unexpected hello',
          description: 'Our story began over coffee in Kuala Lumpur.',
        },
      ],
      schedule: [
        { time: '11:00 AM', title: 'Guest arrival', detail: 'Welcome to our garden celebration.' },
      ],
    },
    {
      ...common,
      id: WEDDING_B_ID,
      owner_id: OTHER_OWNER_ID,
      slug: 'amir-nurul',
      groom_name: 'Amir',
      bride_name: 'Nurul',
      wedding_date: '2027-06-12',
      start_time: '12:00:00',
      end_time: '17:00:00',
      venue_name: 'Taman Botani Reception Hall',
      venue_address: 'Putrajaya, Malaysia',
      google_maps_url: 'https://www.google.com/maps/search/?api=1&query=Taman+Botani',
      waze_url: 'https://waze.com/ul?q=Taman%20Botani&navigate=yes',
      theme: 'rose',
      settings: { ...common.settings, max_guests: 3 },
      story: [
        {
          year: '2021',
          title: 'A shared beginning',
          description: 'We first met through friends and a shared love of books.',
        },
      ],
      schedule: [
        {
          time: '12:00 PM',
          title: 'Welcome and refreshments',
          detail: 'Our families welcome you to Putrajaya.',
        },
      ],
    },
  ];
}

export type RecordedCall = {
  method: string;
  path: string;
  body: Record<string, unknown>;
  search: string;
};
type StoredRSVP = RSVPRecord & { submission_token: string };
type StoredWish = WishRecord & { submission_token?: string };
type Failure = { status: number; message: string; remaining: number };

/** This HTTP fixture exercises the real Supabase JS client and application UI.
 * Its access filtering is mock behavior, NOT evidence of database security.
 * The separate PGlite migration tests verify actual SQL policies and RPCs. */
export async function mockPlatform(page: Page) {
  const weddings = weddingFixtures();
  const rsvps: StoredRSVP[] = [];
  const wishes: StoredWish[] = [
    {
      id: 'e0000000-0000-4000-8000-000000000001',
      wedding_id: WEDDING_A_ID,
      guest_name: 'Auntie A',
      message: 'Approved love for Akram and Aisyah.',
      approved: true,
      created_at: CREATED_AT,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000002',
      wedding_id: WEDDING_B_ID,
      guest_name: 'Uncle B',
      message: 'Approved love for Amir and Nurul.',
      approved: true,
      created_at: CREATED_AT,
    },
    {
      id: 'e0000000-0000-4000-8000-000000000003',
      wedding_id: WEDDING_A_ID,
      guest_name: 'Pending Guest',
      message: 'A private pending wish.',
      approved: false,
      created_at: CREATED_AT,
    },
  ];
  const profiles: Profile[] = [
    { id: OWNER_ID, role: 'customer', display_name: 'Akram Owner', created_at: CREATED_AT },
    { id: OTHER_OWNER_ID, role: 'customer', display_name: 'Amir Owner', created_at: CREATED_AT },
    { id: ADMIN_ID, role: 'admin', display_name: 'Platform Admin', created_at: CREATED_AT },
  ];
  const calls: RecordedCall[] = [],
    unexpected: string[] = [];
  const failures = new Map<string, Failure>();
  const gates = new Map<string, Promise<void>>();
  let sessionUser: { id: string; email: string } | null = null;
  let sequence = 10;
  const nextId = () => `d0000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
  const owned = (wedding: WeddingRecord) =>
    sessionUser?.id === ADMIN_ID || wedding.owner_id === sessionUser?.id;
  const visibleWeddingIds = () => new Set(weddings.filter(owned).map((w) => w.id));

  // Match PostgREST's CORS exposure so the real client can read exact counts.
  const responseHeaders = {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'Content-Range',
  };
  const json = (route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
      headers: { ...responseHeaders, ...headers },
    });
  const userResponse = () =>
    sessionUser && {
      ...sessionUser,
      aud: 'authenticated',
      role: 'authenticated',
      email_confirmed_at: CREATED_AT,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: CREATED_AT,
    };
  const jwt = () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
      sub: sessionUser!.id,
      email: sessionUser!.email,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })}.dGVzdC1vbmx5`;
  };
  const sessionResponse = () => ({
    access_token: jwt(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'test-only-refresh-token',
    user: userResponse(),
  });

  await page.route(`${PLATFORM_URL}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const body = request.postData() ? (request.postDataJSON() as Record<string, unknown>) : {};
    const endpoint = url.pathname.split('/').at(-1)!;
    calls.push({ method: request.method(), path: url.pathname, body, search: url.search });
    if (request.method() === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PATCH,HEAD,DELETE,OPTIONS',
        },
      });
    const failure = failures.get(endpoint);
    if (failure?.remaining) {
      failure.remaining--;
      return json(route, { message: failure.message, code: 'TEST_FAILURE' }, failure.status);
    }
    const gate = gates.get(endpoint);
    if (gate) await gate;

    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token' && sessionUser)
        return json(route, sessionResponse());
      const id =
        body.email === 'owner@example.test'
          ? OWNER_ID
          : body.email === 'admin@example.test'
            ? ADMIN_ID
            : null;
      if (!id || body.password !== PASSWORD)
        return json(
          route,
          {
            error: 'invalid_grant',
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials',
          },
          400,
        );
      sessionUser = { id, email: String(body.email) };
      return json(route, sessionResponse());
    }
    if (url.pathname === '/auth/v1/user')
      return sessionUser
        ? json(route, userResponse())
        : json(route, { message: 'Not authenticated' }, 401);
    if (url.pathname === '/auth/v1/logout') {
      sessionUser = null;
      return route.fulfill({ status: 204 });
    }

    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      if (endpoint === 'get_public_wedding') {
        if (body.p_slug === 'expired-wedding')
          return json(route, { state: 'expired', wedding: null });
        if (body.p_slug === 'archived-wedding')
          return json(route, { state: 'unavailable', wedding: null });
        const wedding = weddings.find((w) => w.slug === body.p_slug && w.status === 'active');
        if (!wedding) return json(route, { state: 'not_found', wedding: null });
        const {
          owner_id: _owner,
          created_at: _created,
          updated_at: _updated,
          status: _status,
          expires_at: _expires,
          ...publicRow
        } = wedding;
        return json(route, { state: 'active', wedding: publicRow });
      }
      if (endpoint === 'get_guest_rsvp') {
        const row = rsvps.find(
          (r) =>
            r.wedding_id === body.p_wedding_id && r.submission_token === body.p_submission_token,
        );
        return json(
          route,
          row
            ? {
                guest_name: row.guest_name,
                attendance: row.attendance,
                guest_count: row.guest_count,
                phone: row.phone,
                message: row.message,
                created_at: row.created_at,
              }
            : null,
        );
      }
      if (endpoint === 'get_public_wishes')
        return json(
          route,
          wishes
            .filter((w) => w.wedding_id === body.p_wedding_id && w.approved)
            .map(({ id, guest_name, message, created_at }) => ({
              id,
              guest_name,
              message,
              created_at,
            })),
        );
      if (endpoint === 'submit_rsvp' || endpoint === 'submit_wish') {
        if (!weddings.some((w) => w.id === body.p_wedding_id && w.status === 'active'))
          return json(
            route,
            { code: '42501', message: 'This wedding is not accepting responses.' },
            403,
          );
        if (endpoint === 'submit_rsvp') {
          let row = rsvps.find(
            (r) =>
              r.wedding_id === body.p_wedding_id && r.submission_token === body.p_submission_token,
          );
          const response = {
            wedding_id: String(body.p_wedding_id),
            submission_token: String(body.p_submission_token),
            guest_name: String(body.p_guest_name),
            attendance: body.p_attendance as RSVPRecord['attendance'],
            guest_count: Number(body.p_guest_count),
            phone: String(body.p_phone),
            message: String(body.p_message),
            created_at: CREATED_AT,
          };
          if (row) Object.assign(row, response);
          else {
            row = { id: nextId(), ...response };
            rsvps.push(row);
          }
          return json(route, row.id);
        }
        let row = wishes.find(
          (w) =>
            w.wedding_id === body.p_wedding_id && w.submission_token === body.p_submission_token,
        );
        if (!row) {
          row = {
            id: nextId(),
            wedding_id: String(body.p_wedding_id),
            submission_token: String(body.p_submission_token),
            guest_name: String(body.p_guest_name),
            message: String(body.p_message),
            approved: false,
            created_at: CREATED_AT,
          };
          wishes.push(row);
        }
        return json(route, row.id);
      }
    }

    if (
      url.pathname.startsWith('/rest/v1/') &&
      ['weddings', 'rsvps', 'wishes', 'profiles'].includes(endpoint)
    ) {
      if (!sessionUser) return json(route, { code: '42501', message: 'Permission denied' }, 403);
      let rows: Record<string, unknown>[];
      if (endpoint === 'weddings')
        rows = weddings.filter(owned) as unknown as Record<string, unknown>[];
      else if (endpoint === 'profiles')
        rows = profiles.filter(
          (p) => sessionUser?.id === ADMIN_ID || p.id === sessionUser?.id,
        ) as unknown as Record<string, unknown>[];
      else
        rows = (endpoint === 'rsvps' ? rsvps : wishes).filter((r) =>
          visibleWeddingIds().has(r.wedding_id),
        ) as unknown as Record<string, unknown>[];
      for (const [key, value] of url.searchParams) {
        if (value.startsWith('eq.'))
          rows = rows.filter((row) => String(row[key]) === value.slice(3));
      }
      if (url.searchParams.get('or')?.includes('status.eq.expired'))
        rows = rows.filter((row) => row.status === 'expired');
      if (request.method() === 'POST' && endpoint === 'weddings') {
        if (sessionUser.id !== ADMIN_ID)
          return json(route, { code: '42501', message: 'Permission denied' }, 403);
        const added = {
          id: nextId(),
          ...body,
          created_at: CREATED_AT,
          updated_at: CREATED_AT,
        } as unknown as WeddingRecord;
        weddings.push(added);
        rows = [added as unknown as Record<string, unknown>];
      } else if (request.method() === 'PATCH') {
        rows.forEach((row) => Object.assign(row, body));
      }
      const count = rows.length;
      const offset = Number(url.searchParams.get('offset') || 0),
        limit = Number(url.searchParams.get('limit') || 500);
      rows = rows.slice(offset, offset + limit);
      if (request.method() === 'HEAD')
        return route.fulfill({
          status: 200,
          headers: { ...responseHeaders, 'content-range': `*/${count}` },
        });
      const single = request.headers().accept?.includes('application/vnd.pgrst.object+json');
      return json(route, single ? (rows[0] ?? null) : rows, 200, {
        'content-range': `0-${Math.max(0, count - 1)}/${count}`,
      });
    }

    unexpected.push(`${request.method()} ${url.pathname}`);
    return json(route, { message: 'Unmocked test endpoint' }, 500);
  });

  return {
    weddings,
    rsvps,
    wishes,
    profiles,
    calls,
    unexpected,
    failNext(
      endpoint: string,
      message = 'The connection is temporarily unavailable.',
      status = 503,
    ) {
      failures.set(endpoint, { status, message, remaining: 1 });
    },
    hold(endpoint: string) {
      let release!: () => void;
      gates.set(
        endpoint,
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      return () => {
        gates.delete(endpoint);
        release();
      };
    },
    rpcCalls(endpoint: string) {
      return calls.filter((call) => call.path === `/rest/v1/rpc/${endpoint}`);
    },
  };
}
