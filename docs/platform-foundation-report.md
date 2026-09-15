# Multi-wedding platform foundation report

Prepared 15 September 2026 for the existing `akramidris/pixel-wedding-rsvp` repository.

The application now supports one shared game and independently owned weddings in one Supabase project. Hosted Supabase is not connected yet; the migration and public configuration must be applied before real accounts, invitations, and responses work. The original sample remains available at `#/demo` and is explicitly labelled as a device-only preview.

## 1. Existing architecture discovered

- React 19, TypeScript, Vite 6, and Phaser 3.90, with an existing pixel-art garden and React information/form overlays.
- One sample wedding in `src/config/wedding.ts`; RSVP and wishes previously used local storage.
- Existing desktop controls, mobile analog joystick, collision handling, music, local artwork/fonts/audio, photo keepsake, and responsive portrait/landscape layouts.
- GitHub Actions deploys the existing `main` branch to GitHub Pages at `/pixel-wedding-rsvp/`.
- Starting commit: `8975905` (`Replace mobile D-pad with responsive analog joystick`). A local Git backup exists at ignored `artifacts/pre-platform-8975905.bundle`.
- Baseline verification started from a clean `main`: `npm ci` reported zero vulnerabilities, the initial production build passed, and three existing game/mobile checks passed before integration.

## 2. New architecture implemented

```text
Public slug route → WeddingPage → wedding service → Supabase RPC
                 → validated WeddingConfig → WeddingProvider → existing React/Phaser game

Guest forms → repository bound to wedding UUID → restricted submission RPCs
Dashboard   → verified Supabase Auth session → tables protected by RLS
```

Database access stays in the React/service layer. Wedding data loads on navigation, not every frame. Switching weddings remounts the experience and clears scene/input/form/audio state. All weddings share the `garden` template; sage, rose, and champagne themes change interface accents. No payment integration was added.

## 3. Database tables created

The complete [initial migration](../supabase/migrations/202609150001_platform_foundation.sql) creates these tables when applied:

| Table      | Purpose and constraints                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles` | UUID linked to `auth.users`; protected `customer`/`admin` role; display name.                                                                     |
| `weddings` | UUID, required owner, unique validated slug, names/date/time/venue/URLs, theme/template, status/expiry, story/schedule/settings JSON, timestamps. |
| `rsvps`    | Wedding foreign key, validated attendance/count, guest details, timestamps, unique per-wedding submission token.                                  |
| `wishes`   | Wedding foreign key, guest name/message, creation time, private submission token, `approved=false` by default.                                    |

Names, URLs, counts, JSON shapes and sizes are bounded. Wedding end time must follow start time. Indexes support ownership and per-wedding record queries. The migration has passed isolated PostgreSQL execution; it has **not** been applied to a hosted project.

## 4. RLS policies created

RLS is enabled on all four tables, with ten policies:

| Table      | Policies                                                                             |
| ---------- | ------------------------------------------------------------------------------------ |
| `profiles` | `profiles_read`, `profiles_update_name`                                              |
| `weddings` | `weddings_read`, `weddings_admin_insert`, `weddings_update`, `weddings_admin_delete` |
| `rsvps`    | `rsvps_read`, `rsvps_admin_delete`                                                   |
| `wishes`   | `wishes_read`, `wishes_moderate`                                                     |

Anonymous guests have no direct table privileges. Public RPCs return allowlisted active wedding details, approved wishes, or the guest's own token-matched response. Owners can access only their weddings' private records; admins can manage all weddings. Column grants prevent token disclosure and role edits. A trigger prevents customers changing owner, slug, status, expiry, template, settings, identity, or creation time. Security-definer functions use fixed search paths and explicit grants; privileged helpers remain in the unexposed `private` schema.

## 5. Authentication implementation

`AuthContext` uses real Supabase email/password authentication, persisted sessions, logout, current-user verification, and protected database profiles. Dashboard routes wait for verification. Admin access requires the protected `admin` role, enforced again by database policies. Public wedding guests need no account. Account provisioning and password resets initially remain administrative; public registration and email recovery callback screens are outside this foundation.

## 6. Multi-wedding routing implementation

GitHub Pages uses `HashRouter` with the existing repository base:

| Route after `#`                         | Purpose                                 |
| --------------------------------------- | --------------------------------------- |
| `/` / `/demo`                           | Platform home / preserved sample garden |
| `/wedding/:slug`                        | Database-backed public invitation       |
| `/login`                                | Account sign-in                         |
| `/dashboard`                            | Customer's own weddings                 |
| `/dashboard/weddings/:weddingId/edit`   | Owner content editor                    |
| `/dashboard/weddings/:weddingId/rsvp`   | Private responses and export            |
| `/dashboard/weddings/:weddingId/wishes` | Wish moderation                         |
| `/admin`                                | Platform administration                 |
| `/admin/weddings/new`                   | Create and assign a wedding             |
| `/admin/weddings/:weddingId/edit`       | Admin content and platform settings     |

`VITE_ROUTER_MODE=browser` enables clean URLs on hosting configured to rewrite SPA routes to `index.html`. Invalid/unknown/draft weddings show a not-found state; archived weddings are unavailable; expired weddings show an expiration state. Records are retained.

## 7. RSVP implementation

Real weddings submit through `submit_rsvp` with an immutable wedding UUID, random private per-wedding token, name, attendance, guest count, optional phone, and message. Validation, busy/success/error states, and retry protection are included. Repeated submissions from the same device update that wedding's response. Only tokens/preferences remain local; response records are stored in Supabase. Database functions reject closed/expired weddings even when the page was opened earlier. Guests cannot list RSVP records.

## 8. Wishes implementation

`submit_wish` always records the correct wedding UUID and creates a pending wish. Retry tokens avoid duplicate retries. The guestbook receives only approved wishes through `get_public_wishes`. Owners/admins can approve or hide authorized wishes; no wish deletion control is exposed. Submission failures remain visible and do not pretend to save locally.

## 9. Dashboard implementation

Customers see only weddings they own, with attending/declining response totals, expected guest count, and wish count. Actions open the game, content editor, responses, wishes, CSV export, or copyable invitation link. RSVP pages show all requested columns, name search, attendance filters, totals, and correctly escaped CSV with spreadsheet-formula protection. Queries page through all authorized records. The editor supports names, date/time, venue, map links, structured/reorderable story and schedule rows, theme, and HTTPS music. Customer update payloads omit protected platform fields.

The cream/sage interface adapts to narrow screens and supports normal form scrolling, loading/error/empty states, disabled saving controls, and save/moderation feedback.

## 10. Admin implementation

Admins see total/active/draft/expired wedding counts and total RSVP responses, plus a searchable wedding list with couple, slug, date, status, owner, and creation time. They can create weddings and edit content, owner, slug, status, template, and expiry. Slugs are validated and unique; an existing owner profile is required. Once hosted setup is complete, creating an active wedding makes its URL available immediately without another repository, code change, branch, or deployment.

## 11. Files created

New files across the implementation and report commits:

```text
docs/database.md
docs/platform-foundation-report.md
scripts/env-security.ts
src/Router.tsx
src/auth/AuthContext.tsx
src/context/WeddingContext.tsx
src/lib/csv.ts
src/lib/supabase.ts
src/lib/urls.ts
src/platform/Dashboard.tsx
src/platform/PlatformPages.tsx
src/platform/Responses.tsx
src/platform/WeddingEditor.tsx
src/platform/WeddingPage.tsx
src/platform/platform.css
src/services/errors.ts
src/services/guestRepository.ts
src/services/platform.ts
src/services/weddings.ts
src/types/database.ts
src/types/wedding.ts
src/wedding-theme.css
supabase/migrations/202609150001_platform_foundation.sql
supabase/seed.sql
supabase/tests/bootstrap.sql
supabase/tests/run-database-tests.mjs
supabase/tests/tenant-security.sql
tests/env-security.spec.ts
tests/fixtures/platform.ts
tests/platform.spec.ts
```

## 12. Files modified

Tracked files changed from starting commit `8975905`:

```text
.env.example
.github/workflows/deploy.yml
README.md
package-lock.json
package.json
playwright.config.ts
scripts/capture-joystick.mjs
scripts/capture-landscape.mjs
scripts/capture-visuals.mjs
src/App.tsx
src/components/Countdown.tsx
src/components/GameView.tsx
src/components/GardenPreview.tsx
src/components/MusicControls.tsx
src/components/RSVPModal.tsx
src/components/StartScreen.tsx
src/components/VenueModal.tsx
src/components/WeddingInvitation.tsx
src/components/WishModal.tsx
src/data/npcDialogue.ts
src/game/createGame.ts
src/game/scenes/WeddingScene.ts
src/main.tsx
src/services/storage.ts
tests/joystick.spec.ts
tests/production-assets.spec.ts
tests/rendering.spec.ts
tests/wedding.spec.ts
vite.config.ts
```

`.gitignore` already contains the required secret/build/dependency exclusions and did not need modification. Generated builds, local backups, dependencies, and test artifacts are excluded from this inventory.

## 13. Environment variables required

| Variable                 | Value and use                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project HTTPS URL; required for real weddings/authentication.              |
| `VITE_SUPABASE_ANON_KEY` | Public anon JWT or publishable key; required. Never use a private/service-role key. |
| `VITE_ROUTER_MODE`       | Optional; defaults to `hash`. Use `browser` only with SPA rewrites.                 |
| `PAGES_BASE_PATH`        | Build-time path; supplied by Pages metadata, normally `/pixel-wedding-rsvp/`.       |

[`.env.example`](../.env.example) contains empty public configuration placeholders. Local values belong in ignored `.env.local`. All `VITE_*` values are public in the compiled website. A build-time guard rejects privileged Supabase keys before bundling.

## 14. Supabase steps still required manually

No hosted project credentials, configured environment, or authenticated Supabase CLI connection were available. Complete these steps in one project:

1. In SQL Editor, run the **entire** [migration](../supabase/migrations/202609150001_platform_foundation.sql) once. It assumes the four platform table names are unused; reconcile an existing conflicting schema first. Keep `public` exposed to the Data API and `private` unexposed.
2. In **Authentication → Users**, create the administrator as an email/password account. Run the exact promotion/verification SQL in [Create the first administrator](database.md#create-the-first-administrator), replacing only `YOUR_ADMIN_EMAIL` with that account. Browser code cannot promote roles.
3. Create customer password accounts through Supabase Auth; they automatically receive customer profiles. Assign wedding ownership through the admin editor.
4. Run [seed.sql](../supabase/seed.sql) after the first admin exists. It creates Akram/Aisyah and Amir/Nurul with different dates, venues, stories, schedules, and themes. Rerunning does not overwrite matching existing slugs. Reassign demo owners if testing separate customer accounts.
5. Obtain only the public project URL and anon/publishable key for local/GitHub configuration. Perform the hosted smoke test in [database setup](database.md#verification-and-practical-limits): admin login/create, anonymous submissions to both weddings, separate customer visibility, moderation, and rejection after closure.

Do not run `supabase/tests/bootstrap.sql` on the hosted project; it is exclusively an isolated test Auth shim.

## 15. GitHub settings still required manually

The existing repository's Pages deployment uses GitHub Actions. In **Settings → Secrets and variables → Actions**, add repository secrets named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the two public configuration values. The workflow reads **secrets**, not repository variables. No private Supabase key is required.

After applying the database and setting those values, run **Actions → Deploy wedding to GitHub Pages → Run workflow** on `main`. Ensure **Settings → Pages → Source** remains **GitHub Actions**. Subsequent database wedding edits/creation require no redeployment. The workflow runs locked dependency installation, the PostgreSQL security suite, production build, and Pages deployment.

## 16. Test results

| Verification                          | Result and scope                                                                                                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL migration/security suite   | **PASS: 94 named assertions**, plus successful two-wedding seed replay. Uses the actual PostgreSQL engine through PGlite with isolated Supabase Auth role shims.                                                        |
| New platform browser suite            | **PASS: all 23 tests in the full run.** Exercises the real Supabase client against isolated HTTP fixtures for auth, routes, editor, dashboard, submissions, and errors.                                                 |
| CSV export assertions                 | **PASS:** quotes, commas, newlines, formula prefixes, phone text, correct wedding filename, and exclusion of the other wedding's private guest.                                                                         |
| Credential scan                       | **PASS:** 91 current source files, 8 built files, and 86 historical blobs checked; no real secrets found. Test-only dummy credentials are not live keys.                                                                |
| Existing game/mobile regression suite | **PASS:** all 23 applicable checks against the compiled Pages build, including controls, collisions, rotation, music, forms, game assets, and build-key protection.                                                     |
| Final combined test results           | **PASS:** 45 applicable development checks across the full run and targeted fixes; production run **23 passed, 23 skipped**. The production skips are fixture-dependent platform tests already verified in development. |
| Visual review                         | **PASS:** desktop and 390px phone home/dashboard/editor/RSVP/admin layouts; no horizontal page overflow or browser exceptions, and long editor forms scroll.                                                            |
| Hosted Supabase smoke test            | **Not run:** project/configuration unavailable. Required after setup.                                                                                                                                                   |
| Physical Android/iPhone testing       | **Not run:** browser viewport/touch emulation is available evidence, not physical-device verification.                                                                                                                  |

The SQL suite verifies tenant isolation, anonymous guest-list denial, protected owner/profile fields, token privacy/idempotency, expired submission rejection, wish moderation, admin creation, and validation. HTTP fixtures test frontend behavior; they are not the evidence for database authorization. The production application contains no fake authentication or fake database mode for real wedding routes.

The first development run passed 43 checks and identified two timing-dependent joystick tests. One now compares real displacement over equal controlled frame intervals; the other moves away from the fountain before testing cancellation. Both targeted retests passed, then both passed again in the complete production run. No movement implementation change was needed. Visual review also caught a mock HTTP `Content-Range` exposure omission; the corrected fixture and strengthened admin totals/create test passed. The new platform suite totals 23 passing tests, including that targeted recheck.

## 17. `npm run build` result

**PASS:** `npm run build` completed TypeScript checks and Vite compilation with `PAGES_BASE_PATH=/pixel-wedding-rsvp/`. No Supabase fixture credentials were included. The build emits the expected size advisory for the main and Phaser chunks; Phaser stays in its own chunk and its scene starts when entering the garden. Existing art/audio are retained. The local entry is `index-Bg6_yBXK.js`; the GitHub build with explicit empty configuration values emits `index-B0qrJlnn.js`.

## 18. Git commit

Implementation commit: [`e1d5307cf98e08b61c2826eef18631d74553505e`](https://github.com/akramidris/pixel-wedding-rsvp/commit/e1d5307cf98e08b61c2826eef18631d74553505e), `Build multi-wedding RSVP platform foundation`. This report is recorded in a documentation follow-up commit. Local credentials, dependencies, builds, and artifacts are excluded.

## 19. Git push result

**PASS:** implementation commit `e1d5307` pushed to the existing `origin/main`, advancing it from `8975905`. No force push, history rewrite, duplicate repository, or branch deletion was performed.

## 20. Deployment status

**PASS:** [GitHub Actions run 34929446426](https://github.com/akramidris/pixel-wedding-rsvp/actions/runs/34929446426) built and deployed implementation commit `e1d5307`. Its database job repeated all 94 security assertions successfully. Existing site: [pixel-wedding-rsvp](https://akramidris.github.io/pixel-wedding-rsvp/).

Live browser checks passed for the home page, sign-in setup state, both wedding hash routes, anonymous dashboard/admin redirects, sample game, desktop movement, phone joystick movement/release, and menu interaction. No browser exceptions or HTTP asset errors were observed. The live JavaScript entry exactly matches the artifact downloaded from that successful Actions run; SHA-256: `1a127c3df99668d9379cbf839f032aa75c370abb5cc13dac5a05eacdecf4f33b`. The report-only follow-up does not change application code or configuration.

A successful frontend deployment without Supabase configuration can serve the platform and sample game, but cannot accept real responses. The application shows a setup/unavailable state until the hosted steps are complete.

## 21. Demo Wedding A URL

[Akram & Aisyah](https://akramidris.github.io/pixel-wedding-rsvp/#/wedding/akram-aisyah) — 20 February 2027, The Glasshouse, Kuala Lumpur. Available after migration, seed, and frontend configuration.

## 22. Demo Wedding B URL

[Amir & Nurul](https://akramidris.github.io/pixel-wedding-rsvp/#/wedding/amir-nurul) — 12 June 2027, Taman Botani Reception Hall, Putrajaya. Available after migration, seed, and frontend configuration.

## 23. Known remaining issues and explicit confirmations

- Hosted Supabase setup and live end-to-end verification remain required; no migration was silently applied to an unknown project.
- Account provisioning/password recovery are administrative. Public recovery flows, abuse throttling/CAPTCHA, backup/retention operations, and physical-device checks remain operational work before taking real customers.
- Guest retry tokens are per device and wedding. Clearing browser storage or changing devices loses editing access to that existing response; it does not remove the database record. Idempotency does not prevent deliberate spam with new tokens.

Explicit confirmations:

- **No service-role key is exposed by this implementation.** The client uses public configuration only; privileged keys are rejected before a build can inline them.
- **No database password is added or committed by this change.** The source/build/history scan found no real secrets; no live private Supabase credentials were available for setup.
- **`.env` is ignored.** `git check-ignore` also confirmed `.env.local`, `.env.production`, `node_modules`, and `dist` exclusions.
- **Wedding A and Wedding B RSVP data are isolated.** This is verified by the PostgreSQL authorization/token tests and frontend wedding-ID tests; hosted verification remains pending configuration.
- **The existing game is preserved.** Its artwork, Phaser scenes, bride/groom, movement, analog joystick, desktop controls, interactions, invitation, venue, schedule, wishes/RSVP UI, music, and responsive design remain in the shared experience. Final regression results are reported separately above; emulated phone checks do not claim physical Android/iPhone coverage.
