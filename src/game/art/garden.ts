import { WORLD, type Obstacle } from '../world';

// Original code-drawn pixel art. No downloaded game assets or remote requests.
export function drawGarden(canvas: HTMLCanvasElement): Obstacle[] {
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const obstacles: Obstacle[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const block = (x: number, y: number, width: number, height: number) =>
    obstacles.push({ x: x + width / 2, y: y + height / 2, width, height });
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    for (let row = -ry; row <= ry; row += 4) {
      const w = Math.sqrt(Math.max(0, 1 - (row * row) / (ry * ry))) * rx;
      rect(x - Math.floor(w / 4) * 4, y + row, Math.floor(w / 4) * 8, 4, color);
    }
  };
  const flower = (x: number, y: number, shade = '#edc1b3') => {
    rect(x, y + 3, 2, 7, '#6b8d55');
    rect(x - 3, y + 6, 3, 2, '#819e63');
    rect(x - 3, y, 8, 3, shade);
    rect(x, y - 3, 3, 8, shade);
    rect(x, y, 2, 2, '#fff0c4');
  };
  const bush = (x: number, y: number, w = 36) => {
    ellipse(x, y + 8, w / 2 + 3, 12, '#81945d');
    ellipse(x, y, w / 2, 14, '#779455');
    ellipse(x - 5, y - 5, w / 2 - 4, 9, '#a0b777');
    for (let i = 0; i < w / 5; i++)
      flower(x - w / 2 + rand() * w, y - 9 + rand() * 15, rand() > 0.5 ? '#efc6b6' : '#fff0d5');
  };
  const tree = (x: number, y: number, scale = 1, pink = false) => {
    ellipse(x + 8, y + 7, 34 * scale, 13 * scale, '#859864');
    rect(x - 5, y - 26 * scale, 12, 33 * scale, '#867653');
    rect(x + 3, y - 26 * scale, 5, 30 * scale, '#a18c62');
    const tones = pink
      ? ['#bd9587', '#d6aa99', '#e8c2ad', '#f2d5bd']
      : ['#66845b', '#7b985f', '#94ad73', '#aec38b'];
    ellipse(x, y - 43 * scale, 38 * scale, 29 * scale, tones[0]);
    ellipse(x - 11 * scale, y - 54 * scale, 28 * scale, 25 * scale, tones[1]);
    ellipse(x + 15 * scale, y - 54 * scale, 25 * scale, 23 * scale, tones[1]);
    ellipse(x - 4 * scale, y - 68 * scale, 25 * scale, 17 * scale, tones[2]);
    for (let i = 0; i < 28 * scale; i++) {
      const xx = (rand() - 0.5) * 56 * scale;
      const yy = (rand() - 0.5) * 36 * scale;
      rect(
        x + xx,
        y - 52 * scale + yy,
        4 + Math.floor(rand() * 2) * 3,
        4,
        tones[rand() > 0.6 ? 3 : 2],
      );
    }
    block(x - 16 * scale, y - 24 * scale, 32 * scale, 32 * scale);
  };
  const lamp = (x: number, y: number) => {
    rect(x - 4, y, 10, 4, '#8c8061');
    rect(x, y - 34, 3, 34, '#8c8061');
    rect(x - 5, y - 44, 13, 14, '#bcaa78');
    rect(x - 3, y - 42, 9, 9, '#fff0ba');
    rect(x - 6, y - 46, 15, 3, '#8c8061');
    block(x - 5, y - 7, 12, 12);
  };
  const bench = (x: number, y: number) => {
    rect(x, y, 42, 15, '#a99372');
    rect(x, y + 2, 42, 3, '#d2bc91');
    rect(x, y + 8, 42, 3, '#d2bc91');
    rect(x + 3, y + 15, 4, 6, '#8c7659');
    rect(x + 35, y + 15, 4, 6, '#8c7659');
    block(x, y, 42, 21);
  };
  const label = (text: string, x: number, y: number) => {
    c.font = '10px monospace';
    const w = c.measureText(text).width + 18;
    rect(x - w / 2, y - 9, w, 21, '#6f795c');
    rect(x - w / 2 + 1, y - 10, w - 2, 19, '#fff5de');
    c.fillStyle = '#626b50';
    c.textAlign = 'center';
    c.fillText(text, x, y + 3);
  };
  const path = (x: number, y: number, w: number, h: number) => {
    rect(x - 4, y - 4, w + 8, h + 8, '#b5bc8b');
    rect(x, y, w, h, '#e3d6b5');
    for (let i = 0; i < (w * h) / 120; i++)
      rect(
        x + Math.floor((rand() * w) / 3) * 3,
        y + Math.floor((rand() * h) / 3) * 3,
        3 + Math.floor(rand() * 2) * 3,
        2,
        rand() > 0.5 ? '#d5c9a6' : '#ece0c2',
      );
  };
  rect(0, 0, 960, 800, '#aabb82');
  for (let i = 0; i < 7500; i++) {
    const x = Math.floor(rand() * 320) * 3,
      y = Math.floor(rand() * 267) * 3;
    rect(x, y, 3, 2, ['#b6c58e', '#a0b47b', '#bac990', '#9eb27a'][Math.floor(rand() * 4)]);
    if (i % 22 === 0) {
      rect(x + 2, y - 3, 2, 4, '#8fa56b');
      rect(x + 5, y - 1, 2, 3, '#8fa56b');
    }
  }
  path(441, 235, 78, 565);
  path(146, 328, 678, 55);
  path(139, 364, 48, 230);
  path(154, 562, 637, 58);
  path(766, 360, 49, 238);
  path(213, 458, 553, 47);
  path(240, 570, 90, 85);
  path(675, 561, 77, 87);
  // Picket fence along the garden perimeter, with a welcoming opening.
  for (let x = 18; x < 955; x += 18) {
    if (x > 421 && x < 539) continue;
    rect(x, 748, 6, 26, '#d7d9b8');
    rect(x, 746, 6, 4, '#f2edd3');
    rect(x - 4, 755, 23, 4, '#f2edd3');
    rect(x - 4, 767, 23, 3, '#f2edd3');
  }
  block(0, 750, 420, 12);
  block(539, 750, 421, 12);
  // Glasshouse: layered terracotta roof, mullioned windows, gold doors.
  ellipse(482, 234, 156, 28, '#8f9e6c');
  rect(349, 120, 266, 117, '#e7dec1');
  rect(357, 130, 250, 100, '#f5ecd4');
  for (let x = 365; x < 600; x += 39) {
    rect(x, 143, 29, 64, '#80998a');
    rect(x + 3, 146, 23, 58, '#b2c4ad');
    rect(x + 5, 150, 8, 23, '#d2ddc2');
    rect(x + 14, 146, 2, 58, '#f5ecd4');
    rect(x + 2, 173, 26, 3, '#f5ecd4');
  }
  rect(451, 160, 62, 77, '#bdab80');
  rect(456, 166, 51, 69, '#7e9787');
  rect(460, 170, 19, 59, '#bbccad');
  rect(484, 170, 19, 59, '#bbccad');
  rect(477, 199, 2, 7, '#f9e8b6');
  rect(484, 199, 2, 7, '#f9e8b6');
  for (let y = 0; y < 60; y += 5) {
    const inset = (60 - y) * 1.35;
    rect(323 + inset, 67 + y, 318 - inset * 2, 5, y % 10 ? '#c3a085' : '#d0b091');
    for (let x = 325 + inset; x < 633 - inset; x += 19)
      rect(x + (y % 10 ? 7 : 0), 67 + y, 1, 5, '#b89378');
  }
  rect(323, 126, 318, 6, '#a98e71');
  rect(344, 134, 7, 106, '#cfbd96');
  rect(613, 134, 7, 106, '#cfbd96');
  rect(440, 235, 84, 7, '#f4e9ca');
  rect(434, 242, 95, 7, '#cfc29f');
  rect(455, 249, 53, 61, '#c89f8d');
  rect(460, 249, 43, 61, '#e3bdab');
  block(346, 118, 277, 123);
  label('THE WEDDING HALL', 481, 103);
  for (const x of [350, 615]) {
    bush(x, 235, 47);
    lamp(x + (x < 400 ? -22 : 22), 266);
  }
  // Invitation pavilion.
  rect(96, 267, 193, 44, '#d6caaa');
  rect(89, 306, 208, 8, '#ece1c2');
  for (const x of [107, 267]) {
    rect(x, 207, 9, 101, '#bca983');
    rect(x + 2, 210, 4, 95, '#f7edcc');
  }
  for (let y = 0; y < 50; y += 5)
    rect(80 + (50 - y) * 1.5, 160 + y, 230 - (50 - y) * 3, 5, y % 10 ? '#c6b597' : '#e8d9b7');
  rect(86, 209, 217, 8, '#f6e8c6');
  for (let x = 111; x < 280; x += 15) {
    rect(x, 217, 3, 15, '#efe3c3');
    flower(x, 222, '#e4b9aa');
  }
  rect(170, 264, 49, 26, '#b69c76');
  rect(167, 260, 55, 8, '#eee1bc');
  rect(186, 243, 20, 18, '#fff8e8');
  rect(190, 248, 12, 2, '#bfac83');
  rect(191, 253, 10, 2, '#c8b997');
  block(168, 248, 52, 41);
  block(107, 213, 10, 94);
  block(267, 213, 10, 94);
  bush(97, 306);
  bush(293, 307);
  label('THE INVITATION', 194, 299);
  // Pelamin: modest couple sprites are added separately, against a floral dais.
  rect(645, 261, 167, 49, '#d2c2a0');
  rect(640, 304, 177, 9, '#f7ecd3');
  rect(650, 254, 157, 6, '#faf0d8');
  for (let x = 662; x < 801; x += 12) {
    rect(x, 192, 9, 63, '#f6ebd4');
    rect(x, 195, 3, 60, '#e6d9bd');
  }
  for (let y = 0; y < 55; y += 4) {
    const half = Math.sqrt(Math.max(0, 1 - (1 - y / 55) ** 2)) * 78;
    rect(729 - half, 159 + y, half * 2, 5, '#f7ead0');
  }
  for (let x = 655; x < 810; x += 12) bush(x, 210 - Math.sin(((x - 650) / 160) * Math.PI) * 37, 23);
  rect(692, 250, 75, 25, '#c3ab80');
  rect(697, 248, 65, 17, '#fcf1d8');
  rect(694, 266, 71, 15, '#eee0bf');
  rect(690, 263, 7, 22, '#d1b989');
  rect(763, 263, 7, 22, '#d1b989');
  block(688, 247, 84, 25);
  bush(650, 294, 38);
  bush(809, 294, 38);
  label('THE PELAMIN', 729, 314);
  // Central garden fountain, with stepping stones and flower beds.
  ellipse(480, 431, 78, 47, '#b0ae88');
  ellipse(480, 427, 75, 44, '#e8dec1');
  ellipse(480, 425, 65, 35, '#9aaf9c');
  ellipse(480, 422, 60, 30, '#9fc5bd');
  ellipse(480, 420, 51, 23, '#b4d4c5');
  for (let i = 0; i < 25; i++) rect(433 + rand() * 87, 406 + rand() * 28, 7, 2, '#d8e6d1');
  rect(474, 383, 12, 42, '#c7c9ae');
  ellipse(480, 386, 27, 9, '#f1e8cd');
  ellipse(480, 382, 22, 6, '#b5d2bf');
  rect(478, 365, 4, 18, '#dde5ca');
  rect(475, 368, 10, 4, '#eaf0d8');
  block(417, 401, 126, 48);
  for (const [x, y] of [
    [370, 403],
    [591, 403],
    [371, 448],
    [591, 448],
  ])
    bush(x, y, 47);
  bench(336, 507);
  bench(581, 507);
  // Story nook, the wishing tree and its hanging ribbons.
  tree(119, 466, 1.2, true);
  tree(805, 427, 1.5, true);
  for (let i = 0; i < 12; i++) {
    const x = 764 + rand() * 78,
      y = 362 + rand() * 47;
    rect(x, y, 1, 17, '#fbebcf');
    rect(x - 2, y + 14, 6, 9, i % 2 ? '#fff3db' : '#dcae97');
  }
  rect(141, 449, 35, 25, '#9c8565');
  rect(144, 452, 29, 18, '#f0e3c3');
  block(141, 449, 35, 25);
  label('OUR STORY', 154, 480);
  rect(835, 429, 37, 26, '#a08966');
  rect(838, 432, 31, 19, '#eee2c1');
  block(835, 429, 37, 26);
  for (let i = 0; i < 5; i++) rect(841 + i * 5, 435 + (i % 2) * 5, 4, 8, '#d5b19b');
  label('WISHING TREE', 791, 447);
  // RSVP desk, clock and welcome arch.
  rect(250, 566, 93, 27, '#b09977');
  rect(246, 561, 101, 9, '#f8eacc');
  rect(253, 575, 87, 12, '#d8c2a0');
  rect(267, 552, 18, 9, '#fff9e9');
  rect(270, 554, 10, 1, '#bcb493');
  bush(340, 554, 24);
  block(247, 560, 99, 34);
  label('RSVP', 296, 587);
  rect(704, 526, 18, 47, '#aa9570');
  ellipse(713, 526, 26, 27, '#a58d63');
  ellipse(713, 523, 22, 23, '#f8eac8');
  rect(711, 507, 3, 18, '#7c805f');
  rect(713, 522, 12, 3, '#7c805f');
  rect(710, 503, 5, 2, '#b09d76');
  block(692, 506, 42, 68);
  label('SAVE THE DATE', 715, 578);
  for (const x of [418, 539]) {
    rect(x, 650, 8, 73, '#c4b68e');
    rect(x + 2, 651, 3, 69, '#f3e7c6');
    bush(x + 3, 703, 29);
  }
  for (let x = 414; x < 550; x += 10) {
    const y = 651 - Math.sin(((x - 414) / 135) * Math.PI) * 29;
    rect(x, y, 12, 7, '#d0bf97');
    bush(x + 2, y, 21);
  }
  label('Welcome to Our Wedding', 482, 631);
  // Reception picnic tables and chairs.
  for (const [x, y] of [
    [310, 390],
    [626, 661],
    [167, 668],
    [858, 574],
  ]) {
    ellipse(x, y + 5, 26, 16, '#849363');
    for (const dx of [-31, 25]) {
      rect(x + dx, y - 8, 9, 16, '#cfbd96');
      rect(x + dx, y - 11, 9, 4, '#f5e5c5');
      block(x + dx, y - 9, 9, 17);
    }
    ellipse(x, y - 5, 23, 17, '#e4d6b7');
    ellipse(x, y - 8, 23, 16, '#faf0d6');
    flower(x, y - 14);
    rect(x - 15, y - 8, 6, 4, '#c8c9aa');
    rect(x + 10, y - 8, 6, 4, '#c8c9aa');
    block(x - 23, y - 20, 46, 28);
  }
  // Food stall, cars and garden lights.
  rect(67, 554, 52, 31, '#b99a70');
  rect(60, 532, 65, 21, '#e4d6b3');
  for (let x = 60; x < 125; x += 13) rect(x, 532, 7, 21, '#a5b285');
  rect(65, 552, 4, 33, '#9a805e');
  rect(117, 552, 4, 33, '#9a805e');
  block(61, 551, 61, 36);
  for (const [x, y, color] of [
    [310, 154, '#e6dcc1'],
    [655, 120, '#91a899'],
  ] as const) {
    rect(x, y, 25, 49, '#778365');
    rect(x - 2, y + 7, 29, 8, '#63755c');
    rect(x - 2, y + 33, 29, 8, '#63755c');
    rect(x + 1, y - 3, 23, 47, color);
    rect(x + 4, y + 6, 17, 10, '#8ca69c');
    rect(x + 4, y + 29, 17, 8, '#8ca69c');
    block(x - 2, y - 3, 29, 49);
  }
  for (const [x, y] of [
    [392, 343],
    [562, 344],
    [224, 484],
    [742, 492],
    [398, 603],
    [565, 603],
    [416, 737],
    [544, 737],
  ])
    lamp(x, y);
  // Strung fairy lights, each wire made from little pixels.
  for (const [start, end, y] of [
    [295, 655, 328],
    [193, 756, 549],
  ]) {
    for (let x = start; x < end; x += 3)
      rect(x, y + Math.sin(((x - start) / (end - start)) * Math.PI) * 19, 3, 1, '#8e9270');
    for (let x = start + 12; x < end; x += 24) {
      const yy = y + Math.sin(((x - start) / (end - start)) * Math.PI) * 19;
      rect(x, yy, 1, 5, '#8e9270');
      rect(x - 2, yy + 4, 5, 6, '#fff1ba');
    }
  }
  // Dense border planting frames the world.
  for (let x = 18; x < 960; x += 56) {
    tree(x, (x > 345 && x < 625 ? 30 : 73) + rand() * 30, 1 + rand() * 0.25);
    if (x < 345 || x > 625) tree(x + 19, 145 + rand() * 22, 0.8 + rand() * 0.3);
  }
  for (let y = 200; y < 738; y += 80) {
    tree(28 + rand() * 10, y, 1.1);
    tree(931 + rand() * 10, y + 28, 1.15);
  }
  for (const [x, y, s] of [
    [81, 354, 0.8],
    [868, 315, 1],
    [362, 700, 0.8],
    [870, 693, 1.1],
    [66, 706, 0.9],
    [605, 567, 0.65],
    [232, 710, 0.7],
  ])
    tree(x, y, s);
  for (let i = 0; i < 80; i++) {
    const x = 65 + rand() * 830,
      y = 640 + rand() * 95;
    if (x > 392 && x < 567) continue;
    if (i % 3 === 0) flower(x, y, '#f2e5bd');
    else rect(x, y, 3, 3, '#e5d9b2');
  }
  return obstacles;
}

export type CharacterStyle =
  'guest' | 'groom' | 'bride' | 'father' | 'mother' | 'host' | 'photographer' | 'staff';
export function drawCharacter(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: CharacterStyle,
  direction = 0,
  step = 0,
  scale = 2,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  const r = (a: number, b: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(a, b, w, h);
  };
  const female = kind === 'bride' || kind === 'mother';
  const dress =
    kind === 'bride'
      ? '#f8ecd5'
      : kind === 'groom'
        ? '#eee4c7'
        : kind === 'mother'
          ? '#c69687'
          : kind === 'host'
            ? '#b1c49b'
            : kind === 'staff'
              ? '#dbc7a3'
              : '#819c82';
  r(3, 22, 10, 2, '#6f7b5b');
  r(5, 19, 3, 4 - (step === 1 ? 1 : 0), '#746956');
  r(9, 19, 3, 4 - (step === 2 ? 1 : 0), '#746956');
  r(4, 11, 9, female ? 11 : 8, dress);
  r(3, 12 + (step === 1 ? 1 : 0), 2, 7, dress);
  r(13, 12 + (step === 2 ? 1 : 0), 2, 7, dress);
  r(3, 18, 2, 2, '#c69a79');
  r(13, 18, 2, 2, '#c69a79');
  if (female) {
    r(3, 19, 12, 3, dress);
    r(3, 3, 11, 11, dress);
    r(5, 1, 7, 3, dress);
    r(2, 7, 2, 9, dress);
    r(13, 7, 2, 9, dress);
  }
  r(5, 5, 7, 7, '#dfb494');
  r(6, 11, 5, 2, '#cfa481');
  if (!female) {
    r(4, 3, 9, 4, '#58574b');
    r(4, 6, 2, 3, '#58574b');
  }
  if (kind === 'groom' || kind === 'father') {
    r(4, 1, 9, 4, '#454d44');
    r(5, 16, 7, 4, '#b6a474');
    r(5, 17, 7, 1, '#d6c18d');
    r(8, 12, 1, 4, '#b4a47a');
  }
  if (direction !== 3) {
    r(direction === 1 ? 5 : 7, 8, 1, 1, '#534f44');
    if (direction === 0) r(10, 8, 1, 1, '#534f44');
  } else r(5, 5, 7, 7, female ? dress : '#58574b');
  if (kind === 'bride') {
    r(4, 3, 8, 1, '#c7af74');
    r(7, 2, 3, 1, '#e4cf8f');
    r(10, 15, 4, 5, '#8caa7d');
    r(9, 15, 3, 3, '#e3b3a0');
    r(12, 17, 3, 3, '#fff4dc');
  }
  if (kind === 'photographer') {
    r(5, 14, 7, 4, '#505a50');
    r(7, 14, 3, 3, '#bac6ad');
  }
  c.restore();
}

export function makeSprites(kind: CharacterStyle): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16 * 12;
  canvas.height = 24;
  const c = canvas.getContext('2d')!;
  for (let direction = 0; direction < 4; direction++)
    for (let frame = 0; frame < 3; frame++)
      drawCharacter(c, (direction * 3 + frame) * 16, 0, kind, direction, frame, 1);
  return canvas;
}
