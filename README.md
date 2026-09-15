# A Garden of Us

A complete React + TypeScript + Phaser 3 wedding invitation: an original pixel
garden, a modest Malay Muslim bride and groom, and a warm invitation interface.
All artwork, fonts, and music are served locally. No game art is downloaded.

[Wedding website](https://akramidris.github.io/pixel-wedding-rsvp/) ·
[GitHub repository](https://github.com/akramidris/pixel-wedding-rsvp) ·
[Deployment runs](https://github.com/akramidris/pixel-wedding-rsvp/actions/workflows/deploy.yml)

## Local Development

Install **Node.js 22.12 or newer**, then open this folder in a terminal:

```sh
npm install
npm run dev
```

Open the local URL Vite prints (normally http://localhost:5173). To test on your
phone, use your computer's LAN IP with port 5173 while both devices are on the
same Wi-Fi. The development server listens on all interfaces.

## Production Build

```sh
npm run build
npm run preview
```

The production website is generated in `dist/`. Do not open `index.html` directly
from the filesystem; use the development or preview server.

On Windows, use `npm.cmd` if PowerShell blocks the `npm.ps1` wrapper. Node.js,
Git, and GitHub CLI should be installed and available on your terminal's PATH.

## Personalise your wedding

Edit **`src/config/wedding.ts`**. This is the single source for names, family
members, invitation wording, story timeline, date, schedule, location, map URLs,
contact numbers, and music. The included Adam & Hana wedding and venue details
are sample content. Replace them before sharing.

- Keep `isoDate` and `endDate` ISO 8601 values with the correct UTC offset.
  The countdown and calendar download use these timestamps.
- Change the formatted date, time, and timezone labels alongside those timestamps.
- Replace both navigation URLs with links to your exact venue.
- Optional contact numbers produce telephone links in the venue card.
- Use a unique `storageKey` for a different wedding.
- Music is off by default. Selecting music on at the landing screen expresses a
  preference; playback starts only after clicking **Enter Wedding**.
- Replace `public/audio/garden-melody.wav` and update `music.src` if desired.
- Update the static social description/title in `index.html` if you want custom
  search previews. Visible wedding details all come from the configuration.

## Explore

- **WASD / arrow keys**: walk, with animated movement in four directions.
- **E / Enter / Space**: interact when close to a person or place.
- **M**: toggle the village map.
- **Escape**: open the pause menu; close an open card.
- Touchscreen: drag the analog joystick at bottom left; **A** interacts at bottom right.
  Small drags stroll, full drags reach normal speed, and release stops immediately.
  The joystick has a 15% radial dead zone and supports a second finger on A or the menu.
- The top toolbar provides map, music/volume, fullscreen, and the wedding menu.
- The map and menu give direct access to details for guests who prefer reading.
- Movement pauses while cards are open or the window loses focus. Forms accept
  normal typing, including spaces and arrow-key navigation.

Eight places to discover: Welcome Garden, Invitation Pavilion, Our Story,
Date & Time, Wedding Hall, Pelamin, Wishing Tree, and RSVP Counter. Ten NPCs
welcome visitors. Collision boundaries protect trees, furniture, hall, fountain,
fences, and NPCs. The camera follows the guest through the garden.

At the pelamin, **Take Photo** creates an illustrated PNG keepsake containing
the guest and the couple. This is a composed photo frame, not a live camera
capture. Guests can download it. The schedule also provides an `.ics` calendar.

## Guestbook and RSVP storage

This MVP uses **localStorage on the guest's device**. Wishes and the latest RSVP
persist after a reload in the same browser. They are **not sent to the couple**,
shared with other guests, or synchronised across devices. This is disclosed on
the forms. Declined RSVPs save zero guests. Empty/whitespace-only entries are
rejected; messages are bounded and rendered as plain text. Storage errors are
shown without claiming a successful submission.

To receive real responses, implement `WeddingRepository` in
`src/services/storage.ts` using your backend and replace the exported repository.
The React components already use asynchronous methods:

```ts
interface WeddingRepository {
  getWishes(): Promise<Wish[]>;
  addWish(name: string, message: string): Promise<Wish>;
  getRSVP(): Promise<RSVP | null>;
  saveRSVP(rsvp: Omit<RSVP, 'createdAt'>): Promise<RSVP>;
}
```

For Supabase/Firebase, enforce field validation and access rules on the server,
keep administrative credentials off the client, add spam/rate protection, and
decide whether wishes require moderation. Add a guest/session identifier to
retrieve and update each guest's RSVP. Remove the local-only wording once the
connected service is implemented and tested. Clear only your wedding's prefixed
keys if you wish to reset sample responses.

## Project structure

```text
src/
  config/wedding.ts          Central wedding configuration
  components/               Landing, cards, forms, map, music, mobile controls
  data/npcDialogue.ts        Family and guest dialogue
  game/
    art/garden.ts           Original canvas pixel tiles, architecture, sprites
    entities/               Animated Player and collidable NPCs
    scenes/WeddingScene.ts  Phaser scene and world assembly
    systems/                Proximity and interaction system
    bridge.ts               Typed React ↔ Phaser event bridge
    world.ts                World dimensions and destination coordinates
    createGame.ts           Responsive Phaser game boot
  services/storage.ts       Replaceable asynchronous persistence adapter
  App.tsx                   Invitation/game state and overlay routing
  styles.css                Responsive ivory, sage, gold, and rose UI
public/audio/               Original locally served instrumental loop
scripts/generate-audio.py   Reproducible music generation (optional)
tests/                     Browser integration tests
```

Phaser and the game are lazy-loaded after entry. Pixel textures are generated
once, with nearest-neighbour rendering and small sprite sheets. The minimap
receives position updates at about 8 Hz; React is not updated each game frame.
All font files are bundled from Fontsource packages. There are no external CDN
requests. Navigation opens external apps only after the guest clicks a link.

Keyboard focus is trapped in invitation dialogs, background scrolling is locked,
and controls have accessible names. An alternative map/menu path exposes every
piece of information without requiring movement. Reduced-motion CSS is supported.

## Browser tests

```sh
npx playwright install chromium
npm test
```

Tests launch the local development server automatically and cover the landing,
game loading, keyboard movement, paused form input, guestbook/RSVP persistence,
navigation, calendar/photo downloads, map, and mobile layout/controls.

Analog touch tests also cover gradual speed, arbitrary angles, normalized
diagonals, multi-touch, release/cancellation, rotation, and collision. See
[mobile joystick notes](docs/mobile-joystick.md) for input tuning and layout details.

The same suite can check a production build under a GitHub Pages-style prefix.
For example, in PowerShell (the prefix below is only a local test value):

```powershell
$env:PAGES_BASE_PATH = '/pages-check/'
npm run build
$env:TEST_PRODUCTION = '1'
npm test
Remove-Item Env:TEST_PRODUCTION
Remove-Item Env:PAGES_BASE_PATH
```

This starts `npm run preview` on port 4175 and visits `/pages-check/`, verifying
the actual compiled website instead of the development server. Rebuild normally
after removing the test prefix if you want a standard local preview.

## Environment Variables

**None are required. No GitHub repository secrets are needed for this version.**
There is no Supabase SDK, client, or active Supabase configuration. RSVP and wishes
continue to use localStorage on each guest's device; deploying to Pages does not
turn these into shared submissions.

`.env.example` documents optional settings without containing credentials.
`.env` and all `.env.*` files except `.env.example` are ignored by Git.

- `PAGES_BASE_PATH`: optional **build-process environment variable**, for example
  `/your-repository/` or `/`. The workflow supplies it from GitHub Pages metadata.
  Set this in your shell or hosting environment; it is not a frontend `VITE_*`
  variable and is not read from a local `.env` file.
- `GITHUB_REPOSITORY`: provided automatically by GitHub Actions (`owner/repo`).
  It is a fallback for deriving the base path, not a secret.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: **not currently used**. These
  would only be needed after adding a Supabase adapter. At that point, set the
  two public values as repository secrets and explicitly pass them to the build
  step's `env`. All `VITE_*` values are public in the compiled site, even when
  their build-time source is a GitHub Secret. Never pass a service-role key,
  database password, or private API credential to the frontend build.

GitHub automatically supplies the workflow's scoped `GITHUB_TOKEN`; do not add
a personal access token as a repository secret for this deployment.

## Deploy

The application is a static website. No backend or server is needed for the
local-storage version. Vite derives the production base path from Pages metadata,
then an existing custom-domain CNAME, `GITHUB_REPOSITORY`, or the GitHub `origin`
remote. With none of these available it uses portable relative asset URLs (`./`).
Local development stays at `/`. No React Router is installed, so no HashRouter
conversion or refresh workaround is necessary.

### Vercel

Push this project to a repository, import it into Vercel, select **Vite**, set
the build command to `npm run build`, and the output directory to `dist`.
Use Node 22 or newer, then deploy. No SPA route rewrite is needed because this
project uses state-based screens rather than URL routes.

### Netlify

Import your repository. Set **Build command** to `npm run build` and
**Publish directory** to `dist`, with Node 22 or newer. Alternatively, run the
build locally and drag the `dist` folder into Netlify's manual deploy interface.

## GitHub Pages Deployment

This project uses **`akramidris/pixel-wedding-rsvp`**, with `main` as the deployment
branch and `https://github.com/akramidris/pixel-wedding-rsvp.git` as `origin`.
Fetch and preserve existing history before adding changes from another checkout.
Never force-push this deployment.

1. In the repository, open **Settings → Pages → Build and deployment → Source**
   and select **GitHub Actions**. GitHub Actions must also be allowed for the repo.
2. Push the verified source to `main`. The included
   [deployment workflow](.github/workflows/deploy.yml) runs automatically on
   pushes to `main`; it can also be run from **Actions → Deploy wedding to GitHub
   Pages → Run workflow**. If the existing repository uses a different default
   branch, update the workflow's push branch to that branch before pushing.
3. The workflow checks out the code, sets up Node 22, reads Pages metadata, runs
   `npm ci` and `npm run build`, uploads only `dist`, and deploys using the
   `github-pages` environment. Official actions are pinned to commit SHAs.
4. Open the deployment URL shown in the successful Actions run. Check both the
   build job and deploy job; a successful local build alone does not mean the
   public website has been published.

The workflow grants `contents: read`, `pages: write`, and `id-token: write` and
uses the official artifact-based Pages deployment. `dist` and `node_modules` are
not committed. If the repository's environment protection requires approval,
approve the `github-pages` deployment in GitHub.

For CLI authentication, sign in locally:

```powershell
gh auth login --hostname github.com --git-protocol https --web --scopes workflow
gh auth setup-git
```

## GitHub Pages URL

**https://akramidris.github.io/pixel-wedding-rsvp/**

- Repository site: `https://USERNAME.github.io/REPOSITORY-NAME/`.
- A repository named `USERNAME.github.io`: `https://USERNAME.github.io/`.

The workflow obtains the actual base path from `actions/configure-pages`, so it does
not hardcode a sample repository name. Fonts are bundled by Vite; pixel art and
sprites are generated locally; music uses `import.meta.env.BASE_URL`. No asset
depends on a hardcoded root `/assets/` path.

For a future custom domain, configure the real domain and its DNS in Pages
settings, then rerun the workflow. Pages metadata supplies the root base path.
No fake domain or `CNAME` file is included.

Before sharing, replace sample wedding/venue information, verify navigation
links, and connect the repository adapter if you want to actually collect
guest responses. Test on your target phones; 60 FPS is a design target, not a
guarantee for every device. Fullscreen support depends on the browser, especially
on iPhone. The game remains usable in the regular browser viewport.

## Implementation references

- [Vite guide](https://vite.dev/guide/)
- [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy#github-pages)
- [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Phaser Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade)

These are development references; the website does not request them at runtime.
