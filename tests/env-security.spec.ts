import { expect, test } from '@playwright/test';
import { assertPublicSupabaseConfig } from '../scripts/env-security';

test('privileged Supabase credentials are rejected before frontend compilation', () => {
  const settings = { VITE_SUPABASE_URL: 'https://example.supabase.co' };
  const fixtureJwt = (role: string) =>
    `fixture.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.fixture`;
  expect(() =>
    assertPublicSupabaseConfig({
      ...settings,
      VITE_SUPABASE_ANON_KEY: 'sb_secret_rejected_fixture',
    }),
  ).toThrow('Build blocked');
  expect(() =>
    assertPublicSupabaseConfig({ ...settings, VITE_SUPABASE_ANON_KEY: fixtureJwt('service_role') }),
  ).toThrow('Build blocked');
  expect(() =>
    assertPublicSupabaseConfig({ ...settings, VITE_SUPABASE_ANON_KEY: fixtureJwt('anon') }),
  ).not.toThrow();
  expect(() =>
    assertPublicSupabaseConfig({ ...settings, VITE_SUPABASE_ANON_KEY: 'sb_publishable_fixture' }),
  ).not.toThrow();
  expect(() => assertPublicSupabaseConfig({})).not.toThrow();
  expect(() => assertPublicSupabaseConfig(settings)).toThrow('Set both');
});
