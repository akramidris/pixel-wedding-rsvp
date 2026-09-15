# Mobile analog joystick

The previous four-button directional pad has been replaced with a fixed-center
analog joystick at the bottom left. The separate circular A button remains at
the bottom right and becomes more prominent near an interaction. The cream and
sage controls use 55% idle opacity and 92% active joystick opacity.

## Input and movement

`MobileJoystick` uses native Pointer Events and pointer capture. One pointer owns
the stick until release or cancellation; another finger can operate A or open a
menu. Captured movement continues outside the base. A release, cancelled touch,
lost capture, modal opening, blur, hidden document, resize, orientation change,
or component removal clears input. Old touches cannot resume a cancelled drag.
Dialog backdrops only dismiss a gesture that began on that backdrop, so a
release from the joystick or menu button cannot close a newly opened card.

The thumb moves through CSS custom properties, without setting React state on
pointer movement. The typed bridge exposes `directionX`, `directionY`,
`magnitude`, `angle`, and `isActive`; Phaser reads the current vector each frame.
The UI is independent of the player and collision implementation.

The configurable radial dead zone defaults to **0.15** in
`src/game/controls/joystick.ts`. For displacement `(dx, dy)` and usable radius `r`:

```text
distance = hypot(dx, dy)
travel = min(1, distance / r)
magnitude = travel <= 0.15 ? 0 : (travel - 0.15) / 0.85
direction = (dx / distance, dy / distance)
velocity = direction * magnitude * 150
```

The exact center produces zero direction and speed. The 15% dead zone prevents
accidental drift, and the remaining travel maps continuously to 0–100% speed.
At 57.5% travel the guest walks at 50% speed; full travel reaches 150 world units
per second. Unit direction vectors ensure diagonals are no faster than cardinal
movement. Angles use `atan2(dy, dx)` radians, with positive Y pointing downward.

The larger movement axis chooses the four-direction walking animation; an equal
diagonal uses the horizontal direction. Animation cadence follows movement speed.
Release immediately zeros velocity and restores the facing idle frame, while
the visual thumb returns to center over 90ms. There is no acceleration or
deceleration delay. The existing camera follow and collision geometry remain in
use.

WASD and arrow keys still move at normal speed, taking priority while held.
E, Enter, and Space retain desktop interaction. Touch controls appear when
`(any-pointer: coarse)` matches or `navigator.maxTouchPoints > 0`, including
touchscreen laptops. Narrow desktop windows alone do not enable them. The React
layout and Phaser interaction hint share this detection function.

## Phone layout

The fixed center gives guests a visible, stable place to start each drag. The
base uses `clamp(120px, 34vw, 144px)` in portrait and
`clamp(110px, 30vh, 126px)` in short landscape viewports. Portrait reserves a
control tray below the game; short landscape uses translucent corner controls
to preserve vertical play space. Insets account for phone safe areas.

`touch-action: none`, disabled selection, and overscroll suppression prevent
control drags from scrolling the page. Invitation cards retain their internal
scrolling. The map/menu path remains available for guests who prefer direct
access to wedding information.

## Files

- `src/components/MobileJoystick.tsx`: pointer ownership, thumb rendering, resets.
- `src/components/MobileControls.tsx`: joystick and independent A button.
- `src/game/controls/joystick.ts`: reusable state and radial input math.
- `src/game/controls/touch.ts`, `src/hooks/useTouchControls.ts`: touch detection.
- `src/game/bridge.ts`, `src/game/entities/Player.ts`: input delivery, movement,
  animation, immediate stop, and keyboard priority.
- `src/App.tsx`, `src/components/GameView.tsx`: responsive integration, touch
  menu actions, tutorial, and accessible instructions.
- `src/components/Modal.tsx`: prevent a prior touch release from dismissing a
  newly opened card while retaining intentional backdrop dismissal.
- `src/game/scenes/WeddingScene.ts`: matching A/E interaction hint.
- `src/joystick.css`, `src/main.tsx`: themed controls and responsive layout.
- `tests/joystick.spec.ts`, `tests/wedding.spec.ts`, `tests/rendering.spec.ts`:
  analog input and existing feature regression coverage.
- `scripts/capture-joystick.mjs`: desktop, phone, landscape, and tablet evidence.
- `README.md`, `docs/mobile-joystick.md`: controls and tuning documentation.

## Verification

`npm run build` succeeds for `/pixel-wedding-rsvp/`, with the existing Phaser
bundle-size advisory. Production validation covered all 22 automated checks:
21 passed in the full run, and the final mobile layout check passed in a
targeted rerun after changing its full-page screenshot to a viewport capture.
The full-page capture had reset Chromium's touch emulation to desktop defaults.

The joystick tests use Chromium's actual touch-event dispatch and captured
pointers. Movement assertions observe physics positions from the minimap,
including partial versus full speed, arbitrary angles, diagonal normalization,
quick reversals, release outside the base, multiple fingers, A/menu interaction,
cancellation, rotation, focus loss, and fountain collision. Pure math checks
cover the center, dead-zone boundary, clamping, angles, and invalid samples.

Visual evidence is captured at 360×667, 390×844, 844×390, 768×1024, 1280×800, and
a narrow 500×800 desktop window. An independent visual/code review found no
required layout fixes.

Physical Android and iPhone testing is the next useful UX check, particularly
thumb reach and safe areas with expanding browser bars. Browser emulation does
not establish real-device performance or Safari-specific behavior. A floating
base or handedness preference can be considered after feedback from guests.
