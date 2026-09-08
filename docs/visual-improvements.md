# Wedding garden visual refinement

**Final independent visual score: 8.52 / 10 — PASS. Three rounds used.**

| Round                         | Mean of 15 categories | Status |
| ----------------------------- | --------------------: | ------ |
| [1](visual-review-round-1.md) |                  8.11 | FAIL   |
| [2](visual-review-round-2.md) |                  8.38 | FAIL   |
| [3](visual-review-round-3.md) |                  8.52 | PASS   |

The requested 8.5 threshold is met by a narrow margin. Visual rounds stop here.
Each linked report includes every category score and the actual evidence reviewed.

## Inspection findings

The original scene used 16 × 24 character frames enlarged to 32 × 48 world units,
then magnified again by the camera. Environment ellipses advanced in four-pixel
rows and foliage repeated coarse rectangular marks. Flat materials and little
contact shading made the map feel like placeholder artwork. Most supporting UI
text was 6–11px and pale; NPC greetings covered architecture regardless of the
player's distance. On phones the controls occupied the same view as the guest.

The original art direction was retained: a top-down pixel garden, an ivory/sage
wedding invitation, modest Muslim characters, and a warm Malaysian celebration.

## Rendering approach

- Characters are authored on a real 32 × 48 pixel grid. Their world size remains
  unchanged, with matching foot collision boxes and four-direction animations.
- Environment artwork uses a 1920 × 1600 backing canvas for the same 960 × 800
  world. Finer shapes and additional detail are drawn explicitly, rather than
  resizing the old artwork.
- Phaser texture sampling retains pixel edges. High-density screens use a
  separate backing resolution (up to 2×, bounded for wide viewports) and an
  equivalent camera scale. Physics and movement remain in world units.
- The scene texture is generated once. Previews share a cached composite, copied
  into smaller display buffers; opening the village map does not redraw the
  artwork. The desktop minimap uses about 0.12 MiB instead of 11.72 MiB at DPR 1.
  Character animation and the small ambient effect pool remain in Phaser. React
  position updates remain throttled.
- Pixel-world labels and greetings are rendered with higher text resolution.
  Nearby greetings are shown selectively to keep the scene readable.
- On portrait phones, a dedicated control strip keeps movement buttons outside
  the playable view. Forms use 16px inputs to avoid iPhone input zoom.

## Independent critic process

An independent critic inspects actual desktop and mobile screenshots after each
completed round. The score is the arithmetic mean of fifteen category scores,
each from 1.0 to 10.0. The requested passing score is **8.5**, with at most three
improvement rounds. These are subjective visual evaluations, not customer
research or a guarantee of commercial performance.

The review files record every score, the evidence inspected, and the changes
recommended for the next round. Review captures are created with:

```sh
npm run dev
node scripts/capture-visuals.mjs 1
```

Screenshots are stored in the ignored `artifacts/visual/round-1/` folder. The
script moves the player along the garden paths using the touch-input bridge
and opens the couple card through the village map. It captures actual game and forms;
its sprite contact sheet and whole-world image use the production art modules.

## Round 1

Build passed. Eight development browser tests passed, with one production-only
asset test skipped. The independent critic scored **8.11 / 10: FAIL**. Major
remaining problems were overlapping prompts, crowded phone/landscape HUD,
distant keepsake subjects, rigid poses, and repetitive garden composition.

## Round 2

- Moved interaction hints below the player and use A wording on touch devices.
  Only the closest speaking NPC shows a greeting at a time.
- Reduced mobile HUD surfaces, combined location/progress, and added a
  collapsible minimap. Removed the 400px minimum height on short screens.
- Composed an 800 × 840 keepsake with a clean pelamin backdrop and larger grouped
  characters. Both artwork and characters use integer, proportional scaling.
- Gave characters relaxed arms, individual gestures and softer expressions.
- Added distinct canopy silhouettes, three irregular planting drifts, and a
  floral pelamin with a rose carpet. Fixed landmark collision footprints stayed
  unchanged; the final audit below also restores the original perimeter layout.
- Strengthened supporting text contrast while retaining the invitation palette.

Round 2 production build passed. The critic scored **8.38 / 10: FAIL**. The
remaining blockers were a landscape quest card over the player, an inherited
CSS transform shrinking direction buttons to 35.2px, and clipped invitation
actions on the reviewed phone screen.

## Round 3 (final)

- Removed the passive quest card from landscape gameplay. Interaction labels
  remain below the guest and are clamped inside the camera view.
- Corrected the higher-specificity landscape transform. The rendered touch
  buttons now measure at least 44 × 44 CSS pixels.
- Compacted the phone invitation and gave its three actions a sticky footer.
- Suppressed ambient greetings when an interaction is available, clearing the
  entrance sign and leaving one contextual interaction hint.
- Enlarged and grouped the keepsake figures at a clean integer 5× scale.
- Decoupled perimeter tree geometry from artwork randomness. An independent
  comparison found that Round 1's extra drawing calls shifted 43 perimeter
  trees. Canonical records now restore all **91 original collision boxes
  exactly**, for both normal rendering and the portrait backdrop.

The dedicated browser regression passed with a DPR of 2: portrait/landscape
backing resolution, rotation without movement, actual held touch input,
collapsible minimap, 44px targets, invitation actions visible at 390 × 844 and
reachable at 390 × 667. Builds passed after every major improvement round.

## Files and assets

- `src/game/art/characters.ts`: original 32 × 48 character frames and gestures.
- `src/game/art/garden.ts`: denser environment, portrait backdrop and fixed
  perimeter geometry. No external raster art was added.
- `src/game/createGame.ts`, `src/game/scenes/WeddingScene.ts`,
  `src/game/entities/Player.ts`, `src/game/entities/NPC.ts`: rendering density,
  world-size integration, collision footprints, hints and keepsakes.
- `src/components/GardenPreview.tsx`, `MiniMap.tsx`, `Modal.tsx`,
  `StartScreen.tsx`, `src/App.tsx`, `src/main.tsx`, `src/visuals.css`: cached
  previews, refined typography and responsive invitation/game controls.
- `tests/rendering.spec.ts`: regression coverage for the rendering and touch
  changes. `playwright.config.ts` runs graphics tests serially to avoid shared-GPU
  contention. `scripts/capture-visuals.mjs` and `scripts/capture-landscape.mjs`
  reproduce local review screenshots.
- `docs/visual-review-round-1.md`, `visual-review-round-2.md`,
  `visual-review-round-3.md`: independent category scores and evidence.

No deployment workflow, backend adapter, wedding content, venue link or music
behavior was replaced by the visual work.

## Remaining weaknesses and next visual improvements

The critic still sees repeating foliage motifs, a rectangular path layout,
similar NPC proportions and some small secondary labels. A future design pass
could vary planting around individual landmarks, distinguish family members
more strongly, and improve the smallest label hierarchy. More elaborate lighting
or motion should follow profiling on physical iPhone, Android and tablet hardware.
These are future recommendations, not an additional fourth improvement round.

## Final verification

- `PAGES_BASE_PATH=/pixel-wedding-rsvp/ npm run build`: **PASS**. TypeScript and
  Vite compile successfully. The existing Phaser chunk-size notice remains.
- `TEST_PRODUCTION=1 PAGES_BASE_PATH=/pixel-wedding-rsvp/ npm test`:
  **10 passed, 0 failed, 0 skipped**, in 1.6 minutes with the final serial test
  configuration. An earlier parallel run hit startup contention; serial testing
  resolves it without weakening functional or size assertions.
- Coverage includes movement, collisions, paused cards, downloads, map,
  local RSVP/wish persistence, opt-in music, mobile controls, Retina rendering,
  rotation, invitation action reach, fonts/audio and production asset paths.
- Every round's capture reported no browser errors. Independent comparison
  confirmed all 91 original collision records exactly, including portrait mode.

This is a visual quality pass. The original device-only RSVP/wish storage remains
as documented below; the score does not imply a shared submission backend.

## Product limits preserved

This work changes visual presentation. Wedding details still come from
`src/config/wedding.ts`, and the current example wedding details remain samples.
RSVPs and wishes still save on the guest's device; receiving shared submissions
requires connecting the repository adapter to a backend. No Supabase connection
or URL router was present to change. GitHub Pages deployment remains supported.

Desktop and mobile emulation do not replace testing on physical iPhones and
Android devices. Performance must be checked on the devices used for delivery.
