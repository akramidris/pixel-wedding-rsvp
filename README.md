# A Garden of Us — Wedding Platform

One React + TypeScript + Vite application, one Phaser garden game, one Supabase
project, and many independently owned weddings. The existing artwork, bride and
groom, movement, analog joystick, interactions, music, invitation, venue, story,
schedule, photo keepsake, and responsive design are retained.

[Website](https://akramidris.github.io/pixel-wedding-rsvp/) ·
[Repository](https://github.com/akramidris/pixel-wedding-rsvp) ·
[Deployment](https://github.com/akramidris/pixel-wedding-rsvp/actions/workflows/deploy.yml)

**Hosted Supabase has not been connected yet.** The code, database migration,
security policies, editor, and dashboards are ready for setup. Until the required
environment values and database are configured, real invitation routes show an
unavailable state and sign-in is disabled. They never pretend to save real RSVPs
locally. The `/demo` route remains an explicitly labelled sample experience whose
sample responses stay on the device.

## First deployment setup

1. Create or choose **one Supabase project**. Apply the complete
   [migration](supabase/migrations/202609150001_platform_foundation.sql) once in
   its SQL Editor. All four platform table names must be available. See
   [database setup](docs/database.md) for the exact steps and existing-data precautions.
2. In Supabase Authentication, create an email/password administrator account.
   Promote only that account using the exact trusted SQL in
   [database setup](docs/database.md#create-the-first-administrator). Customers
   receive the `customer` role automatically. Create their email/password accounts
   in Supabase and assign wedding owners in the admin editor.
3. Optionally run [seed.sql](supabase/seed.sql) after creating the administrator.
   It creates two distinct active demo weddings without overwriting existing slugs.
4. In this GitHub repository, open **Settings → Secrets and variables → Actions**.
   Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, using the project's URL
   and public anon/publishable key. These values are public browser configuration;
   never substitute a service-role/secret key, database password, or signing secret.
5. Run **Actions → Deploy wedding to GitHub Pages → Run workflow**. Open
   `#/login`, sign in, create an active wedding, and share its invitation link.

GitHub Pages is already configured for this repository's Actions deployment.
Each newly created or edited wedding is stored in Supabase and needs **no code
change, new repository, new branch, or new deployment**. Only frontend/configuration
changes require deployment.

This initial authentication UI supports email/password sign-in and logout.
Account provisioning and password resets are handled administratively; email
invitation/recovery callback pages and public self-registration are not included.

## Local development

Install Node.js 22.12 or newer, then:

```sh
npm ci
```

Copy `.env.example` to `.env.local` and supply the same public values:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
VITE_ROUTER_MODE=hash
```

```sh
npm run dev
```

The game preview works without Supabase at `http://localhost:5173/#/demo`.
For a phone on the same Wi-Fi, open your computer's LAN address at port 5173.
On PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

`.env`, `.env.local`, other `.env.*` files, credentials, dependencies, builds,
test artifacts, and local backups are ignored by Git. `.env.example` contains no
credentials. A build-time guard rejects privileged Supabase keys before Vite
can inline them into the public JavaScript bundle.

## Routes

GitHub Pages uses hash routing because it cannot rewrite arbitrary SPA paths.
The repository base remains `/pixel-wedding-rsvp/`.

| Route after `#`                         | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `/`                                     | Platform home                                      |
| `/demo`                                 | Original sample garden; device-only sample storage |
| `/wedding/:slug`                        | Active wedding from Supabase; no guest login       |
| `/login`                                | Supabase email/password authentication             |
| `/dashboard`                            | Authenticated customer's own weddings              |
| `/dashboard/weddings/:weddingId/edit`   | Owner content editor                               |
| `/dashboard/weddings/:weddingId/rsvp`   | Guest list, totals, filters, search, CSV           |
| `/dashboard/weddings/:weddingId/wishes` | Approve/hide wishes                                |
| `/admin`                                | Administrator overview and all weddings            |
| `/admin/weddings/new`                   | Create and assign a wedding                        |
| `/admin/weddings/:weddingId/edit`       | Admin content, owner, slug, status, expiry         |

Demo URLs after database setup:

- [Akram & Aisyah](https://akramidris.github.io/pixel-wedding-rsvp/#/wedding/akram-aisyah)
- [Amir & Nurul](https://akramidris.github.io/pixel-wedding-rsvp/#/wedding/amir-nurul)

On hosting with SPA rewrites, set `VITE_ROUTER_MODE=browser`, configure all
application paths to serve `index.html`, and set the correct `PAGES_BASE_PATH`.
The same route definitions then use clean `/wedding/:slug` URLs.

## Data flow and boundaries

```text
Wedding URL → WeddingPage → public wedding service → Supabase RPC
            → validated WeddingConfig → WeddingProvider → React + Phaser

Guest forms → repository bound to wedding UUID → restricted Supabase RPC
Dashboard   → verified Auth session → Supabase tables protected by RLS
```

Wedding data loads when its route opens, never every game frame. Phaser receives
configuration and never queries the database. Switching weddings tears down the
old scene, audio, input and form state. The sample config in `src/config/wedding.ts`
is used only for the preview and generic presentation defaults, not customer data.

The editor supports couple names, date/time, venue, HTTPS map links, story,
schedule, theme and music. Admins additionally control owner, slug, status and
expiration. The original `garden` template is shared by every wedding; sage,
rose and champagne themes adjust interface accents. Times default to Malaysia
time (`+08:00`); advanced public settings are described in [database setup](docs/database.md).

RSVPs include the correct immutable `wedding_id`, attendance, count, name, optional
phone and message. A random device token permits retrieving/updating only that
device's response to that wedding; retries do not duplicate it. Only these
tokens and tutorial preferences are stored locally for real weddings. Clearing
browser storage or switching devices loses that response-editing capability.
Guests never gain access to the full guest list.

New wishes await approval. The public guestbook only receives approved wishes.
Wish retries use an idempotency token. Owners can approve/hide their own wedding's
wishes. Dashboard exports page through all authorized records, quote CSV cells,
and neutralize spreadsheet formula prefixes.

Draft/unknown invitations are not publicly discoverable. Active unexpired
weddings are playable and accept responses. Archived and expired weddings show
graceful closed states; their records are retained. The database enforces these
rules even if a page was opened before the wedding closed.

## Explore the garden

- **WASD / arrow keys:** walk.
- **E / Enter / Space:** interact nearby.
- **M:** village map. **Escape:** menu/close card.
- **Touch:** drag the bottom-left analog joystick; bottom-right **A** interacts.
  Short drags stroll, full drags reach normal speed, and release stops immediately.
- Cards and dashboard forms scroll normally. Movement pauses while a card is
  open. Safe areas, portrait/landscape layouts and Retina canvas sizing remain.
- The map/menu also gives direct access to information without walking.
- Music is off by default and starts only with guest consent. Fonts, default
  audio, and pixel art are local; optional customer music uses an HTTPS URL.

See [joystick notes](docs/mobile-joystick.md) and the earlier
[visual improvements](docs/visual-improvements.md).

## Verification

```sh
npm run test:database
npx playwright install chromium
npm test
npm run build
```

Database tests apply the real migration to isolated PostgreSQL via PGlite with
Supabase Auth role shims. They exercise RLS, privileges, tokens, expiry, validation,
owner/admin boundaries, and two-wedding seed replay. They do not replace a final
smoke test against your hosted Supabase project.

Browser tests use the actual Supabase JS client with isolated HTTP fixtures for
the platform journeys. Their fake URL/key is injected only into the development
test server; it is not a deployment configuration or fake application auth mode.
Database security is tested separately with actual SQL, not inferred from those
HTTP fixtures. The existing garden controls and features have regression tests.

For the compiled GitHub Pages build in PowerShell:

```powershell
$env:PAGES_BASE_PATH = '/pixel-wedding-rsvp/'
npm.cmd run build
$env:TEST_PRODUCTION = '1'
npm.cmd test
Remove-Item Env:TEST_PRODUCTION
Remove-Item Env:PAGES_BASE_PATH
```

Fixture-dependent platform browser tests are skipped for this real production
configuration. The compiled game, asset paths and existing controls still run.
Do not run builds while a production preview test is reading `dist/`.

## Deployment and next operational work

Push verified changes to `main`. The existing workflow installs locked dependencies,
runs the PostgreSQL security suite, builds with Pages metadata and the two public
Supabase settings, then deploys `dist/`. Never commit `dist/`, `node_modules`, or
private credentials. There are no payments, subscriptions or payment APIs.

Before accepting real customers, finish hosted setup and verify an actual admin
login, wedding creation, anonymous RSVP, dashboard receipt and moderation. Add
appropriate abuse controls/rate limits or CAPTCHA at the submission boundary,
privacy/retention procedures and backups, and a password recovery workflow.
Anonymous database functions enforce tenancy and status, but are not a complete
anti-spam service. Verify the controls on physical Android/iPhone devices;
automated phone testing uses browser emulation.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[Supabase Auth](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[React Router HashRouter](https://reactrouter.com/api/declarative-routers/HashRouter).
