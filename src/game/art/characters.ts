export type CharacterStyle =
  'guest' | 'groom' | 'bride' | 'father' | 'mother' | 'host' | 'photographer' | 'staff';

export const SPRITE_WIDTH = 32;
export const SPRITE_HEIGHT = 48;

const outfits = {
  guest: { light: '#afc4b5', main: '#779887', shade: '#526f63', edge: '#3c514a' },
  groom: { light: '#fff8e8', main: '#e7ddc4', shade: '#bfb394', edge: '#837861' },
  bride: { light: '#fffaf0', main: '#f0e7d6', shade: '#d5c8b6', edge: '#a39884' },
  father: { light: '#b9bbc6', main: '#848eaa', shade: '#626b84', edge: '#474d64' },
  mother: { light: '#dcc0b7', main: '#b98c8e', shade: '#926a78', edge: '#6d5264' },
  host: { light: '#b6c9a4', main: '#849775', shade: '#5b765e', edge: '#425547' },
  photographer: { light: '#bfc1b0', main: '#8e988c', shade: '#697368', edge: '#45514a' },
  staff: { light: '#f0dfc3', main: '#cebb99', shade: '#9e8c71', edge: '#716653' },
} satisfies Record<CharacterStyle, { light: string; main: string; shade: string; edge: string }>;

/**
 * Original 32 × 48 artwork on a one-pixel grid. Stepped silhouettes, restrained
 * fabric shading and a shared light source give the cast a consistent finish.
 * Directions: down, left, right, up. Frame 0 is idle; 1 and 2 alternate steps.
 */
export function drawCharacter(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: CharacterStyle,
  direction = 0,
  step = 0,
  scale = 1,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  // Profiles share a silhouette; front and back have their own drawing.
  if (direction === 2) {
    c.translate(SPRITE_WIDTH, 0);
    c.scale(-1, 1);
  }
  const r = (a: number, b: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(a, b, w, h);
  };
  const p = outfits[kind];
  const side = direction === 1 || direction === 2;
  const back = direction === 3;
  const bride = kind === 'bride';
  const female = bride || kind === 'mother';
  const formal = kind === 'groom' || kind === 'father';
  const skin = kind === 'father' ? '#bd8c70' : '#d6a180';
  const skinLight = '#eac0a0';
  const skinShade = '#ae795f';
  const hair = kind === 'father' ? '#69665e' : '#46423c';
  const walkLeft = step === 1 ? -1 : 0;
  const walkRight = step === 2 ? -1 : 0;
  const armSwing = step === 1 ? 1 : step === 2 ? -1 : 0;
  const portraitPose = !side && !back && step === 0;
  const heldLeft = portraitPose && (formal || female || kind === 'photographer');
  const heldRight = portraitPose && (bride || kind === 'photographer');

  r(8, 45, 17, 2, '#33453229');
  r(5, 46, 23, 1, '#33453219');
  r(11, 45, 11, 1, '#33453224');
  if (bride) {
    // Scalloped veil behind the long gown and sleeves.
    r(10, 5, 13, 32, '#bfb6a4');
    r(8, 11, 17, 27, p.shade);
    r(7, 20, 19, 20, p.main);
    r(6, 29, 21, 12, '#e6ddce');
    r(8, 14, 2, 23, '#faf4e6');
    r(24, 20, 1, 18, '#f8f0e0');
    for (let i = 7; i < 27; i += 3) r(i, 40, 2, 1, p.light);
  }

  // Narrow legs, small shoes and independently animated feet.
  const leg = formal ? '#b9ac90' : kind === 'staff' ? '#766f62' : '#616d65';
  const shoe = formal ? '#655e51' : '#4f544c';
  r(side ? 12 : 10, 32, side ? 8 : 5, 12 + walkLeft, leg);
  r(side ? 16 : 18, 32, side ? 6 : 5, 12 + walkRight, leg);
  r(side ? 12 : 10, 36, 1, 8 + walkLeft, '#424e453b');
  r(side ? 10 : 9, 43 + walkLeft, side ? 9 : 7, 2, shoe);
  r(side ? 15 : 18, 43 + walkRight, side ? 8 : 6, 2, shoe);
  r(side ? 10 : 9, 43 + walkLeft, 4, 1, '#878477');
  r(side ? 15 : 18, 43 + walkRight, 4, 1, '#878477');

  if (side) {
    r(11, 20 + armSwing, 5, 8, p.edge);
    r(11, 21 + armSwing, 4, 7, p.main);
    r(10, 27 + armSwing, 5, 5, p.edge);
    r(11, 27 + armSwing, 3, 4, p.main);
    r(11, 30 + armSwing, 3, 1, p.light);
    r(11, 32 + armSwing, 2, 3, skin);
  } else {
    // Softly sloped shoulders and bent elbows replace the old parallel rails.
    r(8, 19 + armSwing, 4, 3, p.edge);
    r(7, 21 + armSwing, 4, 6, p.edge);
    r(7, 21 + armSwing, 3, 5, p.main);
    r(7, 21 + armSwing, 1, 4, p.light);
    r(6, 26 + armSwing, 5, 3, p.edge);
    r(7, 25 + armSwing, 4, 3, p.main);
    if (!heldLeft && !(portraitPose && kind === 'host')) {
      r(7, 29 + armSwing, 4, 3, p.edge);
      r(8, 28 + armSwing, 3, 3, p.main);
      r(8, 30 + armSwing, 3, 1, p.light);
      r(8, 32 + armSwing, 2, 3, skin);
      r(8, 32 + armSwing, 1, 2, skinLight);
    }
    r(22, 20 - armSwing, 4, 3, p.edge);
    r(23, 22 - armSwing, 4, 5, p.edge);
    r(23, 22 - armSwing, 3, 5, p.shade);
    r(24, 27 - armSwing, 4, 3, p.edge);
    r(23, 26 - armSwing, 4, 3, p.main);
    if (!heldRight) {
      r(23, 30 - armSwing, 4, 3, p.edge);
      r(23, 29 - armSwing, 3, 3, p.shade);
      r(23, 31 - armSwing, 3, 1, p.main);
      r(23, 33 - armSwing, 2, 3, skin);
      r(23, 33 - armSwing, 1, 2, skinLight);
    }
  }

  r(side ? 12 : 11, 18, 11, 2, p.edge);
  r(side ? 12 : 9, 20, side ? 11 : 15, 9, p.edge);
  r(side ? 12 : 10, 29, side ? 11 : 13, 6, p.edge);
  r(side ? 12 : 10, 19, side ? 10 : 13, 10, p.main);
  r(side ? 12 : 11, 29, side ? 10 : 11, 5, p.main);
  r(side ? 13 : 10, 19, 2, 13, p.light);
  r(21, 21, 2, 13, p.shade);
  r(side ? 13 : 11, 34, side ? 9 : 11, 1, p.shade);
  if (female) {
    // Long baju kurung / bridal gown with tailored waist and softly flared hem.
    r(9, 26, 15, 10, p.edge);
    r(8, 34, 17, 6, p.edge);
    r(7, 39, 19, 5, p.edge);
    r(8, 43, 8, 2 + walkLeft, p.shade);
    r(16, 43, 9, 2 + walkRight, p.shade);
    r(10, 25, 13, 11, p.main);
    r(9, 34, 15, 7, p.main);
    r(8, 40, 17, 3, p.main);
    r(10, 35, 2, 7, p.light);
    r(12, 28, 2, 9, p.light);
    r(15, 31, 1, 12, p.shade);
    r(18, 36, 1, 7, p.light);
    r(22, 35, 1, 8, p.shade);
    if (bride) {
      r(10, 26, 13, 1, '#bcab7c');
      r(15, 26, 3, 2, '#e2d2a7');
      r(16, 26, 1, 1, '#fff6d9');
      r(9, 42, 15, 1, '#d5c399');
      for (let i = 10; i < 24; i += 3) {
        r(i, 40, 1, 1, p.light);
        r(i + 1, 41, 1, 1, '#cbb990');
      }
    } else {
      for (let i = 11; i < 23; i += 5) {
        r(i, 34, 1, 1, '#e2beb2');
        r(i - 1, 35, 3, 1, '#ceaaa0');
        r(i, 36, 1, 1, '#e2beb2');
        r(i + 1, 41, 1, 1, '#e2beb2');
      }
    }
  } else if (formal) {
    // Baju Melayu collar and buttons, above a gold songket sampin.
    if (!back) {
      r(side ? 12 : 14, 18, side ? 4 : 5, 2, p.light);
      r(side ? 12 : 16, 19, 1, 9, '#b49b65');
      for (let i = 20; i < 29; i += 2) r(side ? 12 : 16, i, 1, 1, '#877347');
      if (!side) {
        r(19, 22, 3, 1, p.shade);
        r(20, 21, 1, 1, p.light);
      }
    }
    const weave = kind === 'groom' ? '#b6a171' : '#9d8690';
    const wovenLight = kind === 'groom' ? '#e3cea0' : '#cab0ac';
    r(side ? 11 : 9, 29, side ? 13 : 15, 9, p.edge);
    r(side ? 12 : 10, 29, side ? 11 : 13, 8, weave);
    r(side ? 12 : 10, 30, side ? 11 : 13, 1, wovenLight);
    r(side ? 12 : 10, 36, side ? 11 : 13, 1, wovenLight);
    for (let i = side ? 13 : 11; i < 23; i += 4) {
      r(i, 32, 1, 1, wovenLight);
      r(i - 1, 33, 3, 1, wovenLight);
      r(i, 34, 1, 1, wovenLight);
    }
    r(20, 29, 1, 8, '#76644264');
  } else if (kind === 'photographer') {
    // Waistcoat plus camera: body, strap, metal rim and a tiny glass reflection.
    r(side ? 12 : 10, 19, 3, 15, '#697665');
    if (!side) r(20, 19, 3, 15, '#5e6b5a');
    if (!back) {
      r(13, 20, 1, 7, '#3f4d42');
      if (!side) r(19, 20, 1, 7, '#3f4d42');
      r(side ? 9 : 11, 27, 11, 7, '#3f4944');
      r(side ? 10 : 12, 28, 9, 5, '#5c6660');
      r(side ? 13 : 15, 28, 4, 5, '#bfbc9f');
      r(side ? 14 : 16, 29, 2, 3, '#364f51');
      r(side ? 14 : 16, 29, 1, 1, '#c3d9d1');
      r(side ? 10 : 12, 26, 3, 1, '#424c45');
      r(side ? 10 : 12, 29, 2, 1, '#d2c9a9');
    }
  } else if (kind === 'staff') {
    r(side ? 14 : 12, 21, side ? 7 : 9, 15, '#a87c66');
    r(side ? 14 : 12, 23, 1, 11, '#cca187');
    r(side ? 14 : 12, 29, side ? 6 : 9, 1, '#825d51');
    r(15, 30, 4, 3, '#bd8c72');
    if (back) r(10, 27, 13, 1, '#b98c72');
  } else {
    if (!back) {
      r(side ? 12 : 14, 18, side ? 4 : 5, 2, p.light);
      r(side ? 12 : 16, 20, 1, 5, p.shade);
      r(side ? 12 : 16, 21, 1, 1, '#d8ccaa');
      if (!side) r(19, 23, 3, 1, p.shade);
    }
    r(side ? 12 : 10, 33, side ? 10 : 13, 1, p.shade);
  }

  // Small, role-specific idle gestures keep the wedding party relaxed. All
  // forearms remain covered; only hands extend beyond the narrow cuffs.
  if (heldLeft) {
    const handX = bride ? 14 : kind === 'photographer' ? 11 : 15;
    const handY = bride ? 31 : kind === 'photographer' ? 30 : 29;
    r(8, 27, 4, 4, p.edge);
    r(9, 27, 3, 3, p.main);
    r(11, handY - 2, handX - 10, 4, p.shade);
    r(11, handY - 2, handX - 10, 2, p.main);
    r(handX - 1, handY - 1, 2, 3, p.light);
    r(handX + 1, handY, 3, 2, skin);
    r(handX + 1, handY, 2, 1, skinLight);
  }
  if (heldRight) {
    r(21, 28, 5, 4, p.shade);
    r(21, 28, 4, 2, p.main);
    r(19, 30, 4, 3, p.light);
    r(18, 31, 3, 2, skin);
    r(18, 31, 2, 1, skinLight);
  }
  if (portraitPose && kind === 'host') {
    r(5, 25, 5, 4, p.edge);
    r(5, 25, 4, 3, p.main);
    r(4, 25, 2, 3, p.light);
    r(2, 24, 3, 2, skin);
    r(3, 23, 1, 1, skinLight);
  }

  if (female) {
    // Hijab fully covers hair, ears and neck; layered drape overlaps the bodice.
    const hijab = bride
      ? p
      : { light: '#f0d9c7', main: '#d9b6a6', shade: '#b78e85', edge: '#916e70' };
    r(12, 3, 9, 1, hijab.edge);
    r(10, 4, 13, 3, hijab.edge);
    r(9, 7, 15, 10, hijab.edge);
    r(8, 14, 17, 7, hijab.edge);
    r(10, 20, 13, 3, hijab.edge);
    r(12, 23, 9, 1, hijab.shade);
    r(12, 4, 9, 3, hijab.main);
    r(10, 7, 13, 10, hijab.main);
    r(9, 14, 15, 6, hijab.main);
    r(11, 20, 11, 3, hijab.main);
    r(11, 6, 2, 9, hijab.light);
    r(10, 14, 1, 5, hijab.light);
    r(22, 11, 1, 8, hijab.shade);
    r(19, 19, 3, 2, hijab.shade);
    r(16, 21, 4, 1, hijab.shade);
    if (!back) {
      if (side) {
        r(9, 9, 7, 7, skinShade);
        r(9, 9, 6, 6, skin);
        r(8, 12, 2, 2, skin);
        r(10, 9, 2, 2, skinLight);
        r(10, 12, 1, 1, '#53433e');
        r(9, 14, 1, 1, '#b4816c');
        r(10, 15, 2, 1, '#bf8b75');
        r(15, 8, 2, 8, hijab.light);
      } else {
        r(12, 8, 9, 7, skinShade);
        r(12, 8, 8, 7, skin);
        r(13, 15, 7, 2, skin);
        r(12, 8, 3, 3, skinLight);
        r(13, 12, 1, 1, '#59443e');
        r(18, 12, 1, 1, '#59443e');
        r(16, 13, 1, 1, skinShade);
        r(13, 14, 1, 1, '#d59b89');
        r(19, 14, 1, 1, '#d59b89');
        r(14, 14, 1, 1, '#bd8875');
        r(18, 14, 1, 1, '#bd8875');
        r(15, 15, 3, 1, '#bf8b78');
        r(12, 15, 1, 2, hijab.light);
        r(13, 17, 7, 1, hijab.light);
      }
      r(side ? 18 : 21, 18, 2, 2, '#bfa671');
      r(side ? 18 : 21, 18, 1, 1, '#fff7e4');
    } else {
      r(12, 8, 1, 9, hijab.light);
      r(19, 6, 1, 10, hijab.shade);
      r(14, 19, 6, 1, hijab.shade);
      if (bride) {
        r(10, 12, 1, 16, '#fff9ec');
        r(22, 13, 1, 17, '#ddd2bd');
        r(12, 26, 9, 1, '#e7d7b7');
      }
    }
    if (bride && !back) {
      r(12, 5, 8, 1, '#d7c38f');
      r(15, 4, 2, 1, '#fff3d4');
      // Hand-tied ivory and dusty-rose bouquet held close to the bodice.
      const bx = side ? 9 : 17;
      r(bx, 28, 2, 7, '#78906b');
      r(bx - 3, 27, 7, 3, '#73856b');
      r(bx - 4, 26, 3, 3, '#9daa83');
      r(bx + 3, 26, 2, 3, '#93a27b');
      r(bx - 2, 24, 4, 4, '#d7a898');
      r(bx - 1, 24, 2, 2, '#f4cebb');
      r(bx + 1, 26, 4, 4, '#fff5df');
      r(bx + 2, 27, 1, 1, '#ddc6a0');
      r(bx - 4, 28, 4, 3, '#f0c4ac');
      r(bx - 3, 28, 1, 1, '#ffe3c8');
      r(bx - 2, 32, 3, 2, skin);
      r(bx + 1, 31, 2, 2, skinLight);
      r(bx, 33, 2, 1, '#f0dcc1');
      r(bx + 1, 34, 1, 3, '#e5cdb0');
    }
  } else {
    // Adult faces have single-pixel features, warm cheek planes and narrow jaws.
    r(13, 15, 7, 4, skinShade);
    r(14, 15, 5, 3, skin);
    r(11, 5, 11, 10, hair);
    r(12, 14, 9, 3, hair);
    if (!back) {
      if (side) {
        r(10, 7, 9, 8, skin);
        r(10, 7, 3, 3, skinLight);
        r(9, 11, 2, 3, skin);
        r(11, 15, 7, 2, skinShade);
        r(11, 11, 1, 1, '#4f4039');
        r(10, 10, 2, 1, '#9e775b');
        r(17, 11, 2, 3, skinShade);
        r(18, 11, 1, 2, skinLight);
        r(10, 14, 1, 1, '#ad7e66');
        r(11, 15, 2, 1, '#b4876e');
      } else {
        r(11, 7, 11, 8, skin);
        r(12, 14, 9, 2, skin);
        r(13, 16, 7, 1, skinShade);
        r(11, 7, 3, 4, skinLight);
        r(10, 10, 1, 3, skinShade);
        r(22, 10, 1, 3, skinShade);
        r(13, 10, 2, 1, '#a78063');
        r(18, 10, 2, 1, '#a78063');
        r(13, 11, 1, 1, '#4f4039');
        r(19, 11, 1, 1, '#4f4039');
        r(16, 12, 1, 1, '#c38f6e');
        r(12, 13, 1, 1, '#dcaa89');
        r(20, 13, 1, 1, '#c99073');
        r(14, 14, 1, 1, '#b3856c');
        r(18, 14, 1, 1, '#b3856c');
        r(15, 14, 3, 1, '#ecc3a1');
        r(15, 15, 3, 1, '#b98b71');
      }
    }
    if (formal) {
      // Songkok: flat crown, woven highlight and a slightly curved lower edge.
      r(12, 2, 9, 1, '#3d4140');
      r(10, 3, 13, 5, '#353b39');
      r(11, 3, 11, 1, '#62645a');
      r(11, 4, 2, 3, '#4c514a');
      r(11, 8, 11, 1, '#2e3733');
      if (kind === 'father' && !back) {
        r(side ? 19 : 11, 9, 1, 4, '#b5afa0');
        if (!side) {
          r(21, 9, 1, 4, '#b5afa0');
          r(12, 10, 4, 3, '#60665e');
          r(17, 10, 4, 3, '#60665e');
          r(13, 11, 2, 1, skinLight);
          r(18, 11, 2, 1, skinLight);
          r(16, 11, 1, 1, '#60665e');
        }
      }
    } else {
      r(13, 3, 8, 1, hair);
      r(11, 4, 12, 3, hair);
      r(10, 6, 3, side ? 3 : 4, hair);
      r(20, 6, 3, 4, hair);
      r(12, 4, 6, 1, '#68665b');
      r(11, 5, 3, 1, '#777268');
      if (back) {
        r(11, 7, 12, 7, hair);
        r(12, 13, 10, 2, hair);
        r(12, 8, 1, 4, '#57594e');
        r(15, 14, 5, 1, '#363f37');
      } else if (!side) {
        r(13, 7, 2, 1, hair);
        r(21, 9, 1, 2, hair);
      }
    }
  }
  c.restore();
}

export function makeSprites(kind: CharacterStyle): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_WIDTH * 12;
  canvas.height = SPRITE_HEIGHT;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  for (let direction = 0; direction < 4; direction++)
    for (let frame = 0; frame < 3; frame++)
      drawCharacter(c, (direction * 3 + frame) * SPRITE_WIDTH, 0, kind, direction, frame);
  return canvas;
}
