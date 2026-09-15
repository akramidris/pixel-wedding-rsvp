# Supabase database and security setup

This application uses one Supabase project for every wedding. The browser needs only the project URL and public anonymous key. No service-role key, database password, or JWT signing secret belongs in this repository, the frontend build, or GitHub Pages.

## Apply the database

The repository contains the complete initial migration at [`supabase/migrations/202609150001_platform_foundation.sql`](../supabase/migrations/202609150001_platform_foundation.sql). No hosted Supabase project was connected during implementation, so this migration must be applied to your project before using real weddings.

For a new Supabase project, open **SQL Editor**, paste the entire migration, and run it once. It creates tables, indexes, constraints, functions, triggers, privileges, and RLS policies together in one transaction. Do not paste just the table definitions. Do not rerun a migration already applied.

Alternatively, with the Supabase CLI installed and authenticated:

```sh
supabase login
supabase init
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Review the dry-run against the intended project. The initial migration assumes the four platform tables do not already exist. Existing Auth users are supported: the migration backfills their profiles with the `customer` role. When introducing this application to a database that already has tables named `profiles`, `weddings`, `rsvps`, or `wishes`, reconcile that existing schema before applying the migration.

Keep Supabase Data API enabled with `public` exposed. Do **not** add the `private` schema to the exposed schemas. The public RPCs are deliberately limited entrypoints; helper functions in `private` are not HTTP endpoints.

## Create the first administrator

1. In Supabase **Authentication → Users**, create your administrator account with an email and password. Use a password account rather than an email-only invitation: this initial frontend does not implement invitation/recovery callback pages. Do not create users by manually inserting password fields with SQL.
2. New users automatically receive a `customer` profile. Role claims in user-editable signup metadata are ignored.
3. Run the following in the trusted Supabase SQL Editor, replacing the placeholder with the exact administrator email:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL')
);

select p.id, p.role, p.display_name
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('YOUR_ADMIN_EMAIL');
```

Confirm the result is exactly the intended account. The app's `/login` route can then sign into that account. Admin authorization comes from this protected database row; hiding UI buttons is not the authorization boundary. Even an administrator's browser cannot write the `role` column. Future role promotion/demotion requires trusted SQL.

Create customer email/password users through Supabase Auth in the same way. They remain customers. In the app's admin wedding editor, assign each wedding to the intended customer's profile UUID. A wedding must have an existing owner profile; admins may own weddings themselves. Deleting an Auth user who still owns weddings is blocked until ownership is reassigned.

## Add the two demonstration weddings

After creating the first administrator, run [`supabase/seed.sql`](../supabase/seed.sql) in SQL Editor. It creates:

| Slug           | Couple         | Date             | Venue                                  |
| -------------- | -------------- | ---------------- | -------------------------------------- |
| `akram-aisyah` | Akram & Aisyah | 20 February 2027 | The Glasshouse, Kuala Lumpur           |
| `amir-nurul`   | Amir & Nurul   | 12 June 2027     | Taman Botani Reception Hall, Putrajaya |

Names, dates, venues, story, schedule, and theme differ. Both use the `garden` game template. They initially belong to the earliest-created administrator. Seed reruns do not overwrite existing weddings with matching slugs. They expire in 2028; update the sample dates and expiration if using them later.

For two separate customer accounts, assign owners in the admin editor or run trusted SQL:

```sql
update public.weddings set owner_id = (
  select id from auth.users where lower(email) = lower('CUSTOMER_A_EMAIL')
) where slug = 'akram-aisyah';

update public.weddings set owner_id = (
  select id from auth.users where lower(email) = lower('CUSTOMER_B_EMAIL')
) where slug = 'amir-nurul';
```

An unknown email fails the non-null owner constraint; it cannot create an ownerless public wedding.

GitHub Pages links use the repository base path and hash routing:

- `https://akramidris.github.io/pixel-wedding-rsvp/#/wedding/akram-aisyah`
- `https://akramidris.github.io/pixel-wedding-rsvp/#/wedding/amir-nurul`

These database-backed links work after applying the migration, seed, and frontend environment configuration. Creating later weddings needs no code change, repository, branch, or deployment.

## Tables

| Table      | Purpose                                                | Important constraints                                                                                  |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `profiles` | Auth account display name and protected role           | UUID references `auth.users`; role is `customer` or `admin`                                            |
| `weddings` | One wedding's configuration, owner, status, and expiry | Unique lowercase slug; valid owner; bounded names/JSON; end time after start; known theme/template     |
| `rsvps`    | Guest response and private device submission token     | Wedding FK; unique `(wedding_id, submission_token)`; validated attendance/count; bounded guest details |
| `wishes`   | Moderated guestbook messages                           | Wedding FK; unique submission token per wedding; `approved=false` by default                           |

All primary keys are UUIDs. Weddings have `created_at`/`updated_at`; RSVP updates retain their creation time and update `updated_at`. Owner and per-wedding creation indexes support dashboard lookups. No anonymous read exposes submission tokens.

## RLS and column protection

RLS is enabled on all four tables. Anonymous users have **no direct table privileges**, including reading active rows. Authenticated dashboards query the same tables under RLS.

| Actor         | Weddings                                         | RSVPs                                                                     | Wishes                                        | Profiles                                              |
| ------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| Public guest  | Allowlisted active config through RPC            | Submit/update/read only with their unguessable per-wedding token; no list | Submit pending wish; approved-only public RPC | No access                                             |
| Customer      | Read own weddings; update permitted content      | Read own weddings' responses                                              | Read and approve/hide own weddings' wishes    | Read own profile; edit display name                   |
| Administrator | Read/create/update/delete weddings for any owner | Read all; secured deletion supported at DB level                          | Read and approve/hide any wedding's wishes    | Read all for ownership assignment; edit display names |

Customers cannot insert or delete weddings. A database trigger blocks customer changes to `owner_id`, `slug`, `status`, `expires_at`, `template`, and `settings`. Identity and creation timestamps cannot be rewritten. Customer content editing covers names, date/time, venue, map links, story, schedule, theme, and music URL. Theme is restricted to `sage`, `rose`, or `champagne`; template is currently `garden`.

Column grants restrict profile updates to `display_name` and wish updates to `approved`. Dashboard SELECT grants include only necessary response/message columns; both customers and admins are denied the `submission_token` columns because those are private guest capabilities. Queries must explicitly select the permitted columns; `select('*')` on RSVPs/wishes is intentionally denied. `count(*)` and permitted dashboard filters still work. Customers cannot rewrite wish text, move a wish/RSVP to another wedding, delete RSVP records, promote their role, or change an owner ID. There is no public or customer wish deletion API. Private role checks read protected `profiles` data using `auth.uid()`, avoiding recursive profile policies.

The public RPCs intentionally use `SECURITY DEFINER` so anonymous users need no raw table grants. Every function uses a fixed empty `search_path`, schema-qualified objects, and explicit EXECUTE grants. Privileged helpers are in the unexposed `private` schema. See Supabase's [database function security guidance](https://supabase.com/docs/guides/database/functions) and [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Public RPC contracts

These signatures are used by the frontend service layer. They are available to both `anon` and `authenticated` roles so signing in does not prevent guest interactions.

### `get_public_wedding(p_slug text) → jsonb`

Returns `{ "state": "active", "wedding": { ... } }` for an active, unexpired wedding. Unknown/invalid slugs and draft weddings return `{ "state": "not_found", "wedding": null }`. An explicit expired status or elapsed `expires_at` returns `expired`; archived weddings return `unavailable`. Closed statuses expose no couple/owner/configuration details.

The active object includes `id`, `slug`, names, date/time, venue fields, map URLs, theme, template, music URL, story, schedule, and allowlisted settings. It excludes `owner_id`, creation metadata, and arbitrary private settings. Public settings keys are:

```text
title, groom_full_name, bride_full_name, groom_father, groom_mother,
bride_father, bride_mother, contact_groom, contact_bride, invitation,
facilities, timezone, utc_offset, default_volume, max_guests
```

Treat all values under those keys as public. Do not store credentials anywhere in wedding configuration. Story uses `{year,title,description}` objects; schedule uses `{time,title,detail}` objects. Database checks require the expected string fields, limit year/time to 40 characters, titles to 120, descriptions/details to 2,000, arrays to 30 entries, and JSON documents to 32 KB. Schedule detail may be an empty string; other fields must be nonblank. The frontend also validates the supported item shapes before passing them to Phaser. `max_guests`, when present, must be an integer from 1 to 20; it defaults to 5. The supplied platform uses Malaysia time (`Asia/Kuala_Lumpur`, `+08:00`).

### `submit_rsvp(...) → uuid`

```text
p_wedding_id       uuid
p_submission_token uuid
p_guest_name       text
p_attendance       text      attending | not_attending
p_guest_count      integer
p_phone            text      optional, default ''
p_message          text      optional, default ''
```

Name is required and limited to 120 characters. Phone is limited to 40, message to 2,000. Attending count is 1 through the wedding's configured `max_guests`; declined count must be 0. Validation and active/expiry checks execute in the database even if the browser is bypassed.

The browser generates a cryptographically random UUID with `crypto.randomUUID()` and retains it per wedding. `(wedding_id, submission_token)` is unique. A repeated request updates and returns the same response ID, preserving the existing ability to edit a response without creating duplicates. One wedding's token is never a key into another wedding's response.

### `get_guest_rsvp(p_wedding_id uuid, p_submission_token uuid) → jsonb | null`

Returns only the matching response's `id`, `guest_name`, `attendance`, `guest_count`, `phone`, `message`, and `created_at`. Wrong tokens and closed weddings return null. There is no lookup by name, phone, or response ID, and no guest list endpoint. Treat the random token as a private capability: do not put it in invitation URLs or logs. Clearing browser storage loses this device's ability to edit that existing response; the dashboard still retains the data.

### `submit_wish(p_wedding_id uuid, p_submission_token uuid, p_guest_name text, p_message text) → uuid`

Requires an active, unexpired wedding, a nonblank name up to 120 characters, and a nonblank message up to 2,000 characters. It always inserts with `approved=false`. Retrying the same per-wedding token returns the existing ID and never rewrites already submitted/moderated content.

### `get_public_wishes(p_wedding_id uuid) → rows`

Returns at most the 100 most recent approved wishes (`id`, `guest_name`, `message`, `created_at`) for an active, unexpired wedding. Pending/hidden wishes, private tokens, and closed wedding guestbooks are not exposed.

## Verification and practical limits

Run:

```sh
npm run test:database
```

The reproducible harness at [`supabase/tests/run-database-tests.mjs`](../supabase/tests/run-database-tests.mjs) uses PGlite's actual PostgreSQL engine. It applies the real migration and executes [`tenant-security.sql`](../supabase/tests/tenant-security.sql) under `SET ROLE anon` and `SET ROLE authenticated` with distinct Auth UUIDs. It verifies 94 named security assertions, including tenant isolation, public RSVP denial, token-scoped updates/reads, denial of dashboard token reads, role escalation denial, protected owner columns, story/schedule shape validation, expiration, moderation, and admin creation. It also executes the seed twice and verifies two distinct configurations remain.

This tests real PostgreSQL grants, policies, constraints, triggers, and functions. The small Auth shim in `bootstrap.sql` supplies Supabase's `auth.uid()` contract for the isolated engine; it does not test hosted Supabase Auth, email delivery, JWT signature verification, or PostgREST HTTP behavior. Do not execute `bootstrap.sql` in a hosted project. No production data or credentials are needed by these tests.

After setup, perform a hosted smoke test with two separate customer accounts: submit responses to both public links, confirm each customer sees only their own rows, approve a pending wish, and check it appears only on the matching guestbook. Verify a guest cannot query `/rest/v1/rsvps` using the public key. Then archive a sample wedding and confirm submissions are rejected.

This foundation does not yet include distributed abuse throttling, CAPTCHA, duplicate detection across devices, or operational backup/retention workflows. Idempotency prevents duplicate retries, not intentional spam with fresh tokens. Add server-verified abuse controls before opening submissions to high-volume untrusted traffic. No payments are implemented.
