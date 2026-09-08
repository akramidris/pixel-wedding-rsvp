import { WORLD, type Obstacle } from '../world';

// Original art at two source pixels per world pixel. The extra density is used
// for new contours, joinery and foliage; gameplay geometry stays independent.
export const ART_SCALE = 2;

export function drawGarden(
  canvas: HTMLCanvasElement,
  { portrait = false }: { portrait?: boolean } = {},
): Obstacle[] {
  canvas.width = WORLD.width * ART_SCALE;
  canvas.height = WORLD.height * ART_SCALE;
  const c = canvas.getContext('2d')!;
  c.scale(ART_SCALE, ART_SCALE);
  c.imageSmoothingEnabled = false;
  const obstacles: Obstacle[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const p = {
    lawn: '#a7b58b',
    lawnLight: '#b0bd94',
    lawnDark: '#9eae82',
    leafDark: '#405f4c',
    leaf: '#57765a',
    leafMid: '#6e8c65',
    leafLight: '#91a77a',
    leafTip: '#b3c395',
    ivory: '#faf1dc',
    cream: '#eadfc5',
    gold: '#b59a65',
    timber: '#78634d',
    timberDark: '#554d3c',
    timberLight: '#b5a183',
    rose: '#d6a59a',
    roseLight: '#f0cbb8',
    stone: '#dfd7bf',
  };
  const snap = (v: number) => Math.round(v * ART_SCALE) / ART_SCALE;
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(snap(x), snap(y), snap(w), snap(h));
  };
  const block = (x: number, y: number, width: number, height: number) =>
    obstacles.push({ x: x + width / 2, y: y + height / 2, width, height });
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    for (let row = -ry; row < ry; row += 1) {
      const extent = Math.sqrt(Math.max(0, 1 - (row + 0.5) ** 2 / (ry * ry))) * rx;
      const w = Math.floor(extent * 2) / 2;
      rect(x - w, y + row, w * 2, 1, color);
    }
  };
  const shadow = (x: number, y: number, rx: number, ry: number) => {
    ellipse(x + 4, y + 3, rx + 3, ry + 2, '#64795322');
    ellipse(x + 2, y + 1, rx, ry, '#4a61442a');
  };
  const diamond = (x: number, y: number, size: number, color: string) => {
    for (let row = -size; row <= size; row += 0.5) {
      const width = size - Math.abs(row);
      rect(x - width, y + row, width * 2 + 0.5, 0.5, color);
    }
  };
  const blossom = (x: number, y: number, color = p.roseLight, size = 1) => {
    rect(x - 2.5 * size, y - size, 5 * size, 2 * size, color);
    rect(x - size, y - 2.5 * size, 2 * size, 5 * size, color);
    rect(x - 1.5 * size, y - 1.5 * size, 3 * size, 3 * size, color);
    rect(x, y, size, size, '#fff3cb');
    rect(x - size, y - size, size, size, '#fff7e8');
    rect(x + size, y + size, size, size, '#c09377');
  };
  const flower = (x: number, y: number, color = p.roseLight) => {
    rect(x, y + 1, 0.5, 7, p.leaf);
    rect(x - 2, y + 4, 2, 1, p.leafMid);
    rect(x + 0.5, y + 3, 2, 1, p.leafMid);
    blossom(x, y, color, 0.7);
  };
  const frond = (x: number, y: number, length = 17, mirror = 1) => {
    for (let i = 0; i < length; i += 1) {
      const xx = x + i * 0.4 * mirror,
        yy = y - i;
      rect(xx, yy, 0.5, 1.5, p.leaf);
      if (i % 3 === 0) {
        rect(xx - 3, yy - 1, 3, 1, p.leafMid);
        rect(xx + 1, yy - 2, 3.5, 1, p.leafLight);
      }
    }
  };
  const bush = (x: number, y: number, width = 36, floral = true) => {
    shadow(x, y + 8, width * 0.51, 7);
    ellipse(x, y + 2, width * 0.52, 10, p.leafDark);
    ellipse(x - width * 0.19, y - 2, width * 0.31, 9, p.leaf);
    ellipse(x + width * 0.23, y - 1, width * 0.29, 8, p.leafMid);
    ellipse(x - width * 0.1, y - 6, width * 0.3, 7, p.leafMid);
    for (let i = 0; i < width / 1.8; i++) {
      const xx = x + (rand() - 0.5) * width * 0.91,
        yy = y - 8 + rand() * 14;
      rect(xx, yy, 1.5 + rand() * 2.5, 1, i % 3 ? p.leafLight : p.leaf);
      if (floral && i % 4 === 0) blossom(xx, yy - 1, i % 8 ? p.roseLight : p.ivory, 0.75);
    }
  };
  const tree = (x: number, y: number, scale = 1, flowering = false) => {
    shadow(x + 6, y + 2, 32 * scale, 11 * scale);
    const bark = flowering ? '#81705a' : '#73664c';
    rect(x - 3.5 * scale, y - 34 * scale, 8 * scale, 36 * scale, '#594f3d');
    rect(x - 2 * scale, y - 36 * scale, 5 * scale, 36 * scale, bark);
    rect(x + 1 * scale, y - 27 * scale, 1.5 * scale, 25 * scale, '#ac9871');
    rect(x - 7 * scale, y - 2, 7 * scale, 3, bark);
    rect(x + 3 * scale, y - 1, 6 * scale, 2, bark);
    for (let i = 0; i < 14; i++) {
      rect(x - i * 0.65 * scale, y - (22 + i) * scale, 2 * scale, 2 * scale, bark);
      rect(x + i * 0.6 * scale, y - (29 + i) * scale, 2 * scale, 2 * scale, bark);
    }
    const tones = flowering
      ? ['#7e7661', '#9e9477', '#b7ad8a', '#cfbb9a', '#e4c8aa']
      : [p.leafDark, p.leaf, p.leafMid, p.leafLight, p.leafTip];
    // Authored spreading, upright and leaning crowns vary the silhouettes.
    // Selection consumes no randomness, preserving every existing collider.
    const variant = flowering ? 2 : Math.floor(x / 11 + y / 19) % 3;
    const clusters = [
      [
        [0, -46, 30, 22],
        [-21, -46, 18, 16],
        [22, -49, 17, 17],
        [-16, -63, 21, 16],
        [10, -65, 23, 17],
        [-2, -78, 16, 12],
      ],
      [
        [0, -48, 22, 25],
        [-14, -44, 15, 17],
        [16, -58, 15, 19],
        [-9, -66, 18, 20],
        [7, -77, 16, 18],
        [-3, -88, 12, 12],
      ],
      [
        [1, -50, 32, 20],
        [-25, -46, 16, 15],
        [25, -56, 16, 17],
        [-16, -65, 21, 14],
        [10, -72, 22, 16],
        [-4, -79, 16, 12],
      ],
    ][variant];
    for (const [dx, dy, rx, ry] of clusters) {
      ellipse(x + dx * scale, y + dy * scale, rx * scale, ry * scale, tones[0]);
      ellipse(
        x + (dx - 1) * scale,
        y + (dy - 3) * scale,
        (rx - 1) * scale,
        (ry - 3) * scale,
        tones[1],
      );
    }
    for (const [dx, dy, rx, ry] of clusters.slice(1)) {
      ellipse(
        x + (dx - 3) * scale,
        y + (dy - 5) * scale,
        (rx - 4) * scale,
        ry * 0.48 * scale,
        tones[2],
      );
      ellipse(
        x + (dx - 5) * scale,
        y + (dy - 8) * scale,
        (rx - 7) * scale,
        ry * 0.24 * scale,
        tones[3],
      );
    }
    for (let i = 0; i < 76 * scale; i++) {
      const cluster = clusters[Math.floor(rand() * clusters.length)];
      const xx = x + (cluster[0] + (rand() - 0.5) * cluster[2] * 1.5) * scale;
      const yy = y + (cluster[1] - 4 + (rand() - 0.5) * cluster[3]) * scale;
      rect(xx, yy, (1.5 + rand() * 2) * scale, 1 * scale, tones[i % 4 ? 3 : 4]);
      rect(xx + scale, yy - scale, 1.5 * scale, scale, tones[i % 3 ? 2 : 4]);
      if (flowering && i % 7 === 0) blossom(xx, yy, i % 2 ? p.roseLight : p.ivory, 0.65 * scale);
    }
    block(x - 16 * scale, y - 24 * scale, 32 * scale, 32 * scale);
  };
  const lamp = (x: number, y: number) => {
    shadow(x, y + 1, 8, 3);
    rect(x - 3.5, y, 9, 2, p.timberDark);
    rect(x - 2, y - 2, 6, 2, p.gold);
    rect(x, y - 35, 2, 34, p.timberDark);
    rect(x + 0.5, y - 35, 0.5, 32, '#cbb78e');
    rect(x - 3.5, y - 46, 9, 12, p.timberDark);
    rect(x - 2.5, y - 45, 7, 9, '#e9c681');
    rect(x - 1.5, y - 44, 4.5, 7, '#fff1bf');
    rect(x + 0.5, y - 45, 0.5, 9, p.gold);
    rect(x - 3.5, y - 36.5, 9, 1, p.gold);
    rect(x - 5, y - 47, 12, 1.5, p.timberDark);
    rect(x - 3, y - 49, 8, 2, p.timberDark);
    rect(x - 1, y - 51, 4, 2, p.gold);
    rect(x, y - 53, 2, 2, p.timberDark);
    block(x - 5, y - 7, 12, 12);
  };
  const bench = (x: number, y: number) => {
    shadow(x + 22, y + 20, 24, 5);
    rect(x, y + 1, 42, 10, p.timberDark);
    for (let yy = 1; yy < 10; yy += 3) {
      rect(x + 1, y + yy, 40, 2, '#ad9272');
      rect(x + 1, y + yy, 40, 0.5, '#cbbb95');
    }
    rect(x - 1, y + 11, 44, 5, p.timber);
    rect(x, y + 11, 42, 1, '#d6c09b');
    rect(x + 1, y + 14, 40, 0.5, '#bea783');
    for (const dx of [3, 35]) {
      rect(x + dx, y + 16, 3, 5, p.timberDark);
      rect(x + dx - 1, y + 7, 1, 7, p.timberDark);
      rect(x + dx - 2, y + 7, 5, 1, p.timberDark);
    }
    block(x, y, 42, 21);
  };
  const label = (text: string, x: number, y: number) => {
    c.font = '600 8px "Trebuchet MS", sans-serif';
    const width = Math.ceil(c.measureText(text).width) + 23;
    rect(x - width / 2, y - 7, width, 17, '#59654e25');
    rect(x - width / 2, y - 9, width, 16, '#b4a383');
    rect(x - width / 2 + 0.5, y - 8.5, width - 1, 14.5, '#fcf3df');
    rect(x - width / 2 + 2, y - 7, width - 4, 11.5, '#eadfc5');
    rect(x - width / 2 + 2.5, y - 6.5, width - 5, 10.5, '#fcf3df');
    diamond(x - width / 2 + 6, y - 1, 1, '#bca06a');
    diamond(x + width / 2 - 6, y - 1, 1, '#bca06a');
    c.fillStyle = '#59634d';
    c.textAlign = 'center';
    c.fillText(text, snap(x), snap(y + 1.5));
  };
  const lattice = (x: number, y: number, width: number, height: number) => {
    rect(x, y, width, height, '#625746');
    for (let xx = x + 3; xx < x + width - 2; xx += 6) {
      for (let yy = y + 3; yy < y + height - 2; yy += 6) {
        diamond(xx, yy, 2.5, '#c6b18b');
        diamond(xx, yy, 1.5, '#71614a');
        rect(xx, yy, 0.5, 0.5, '#ecdbb5');
      }
    }
  };
  const urn = (x: number, y: number, scale = 1) => {
    shadow(x, y, 8 * scale, 3 * scale);
    ellipse(x, y - 7 * scale, 7 * scale, 8 * scale, '#b79e77');
    ellipse(x - scale, y - 8 * scale, 5 * scale, 7 * scale, '#e2cfa5');
    rect(x - 5 * scale, y - 15 * scale, 10 * scale, 2 * scale, p.gold);
    rect(x - 4 * scale, y - 1 * scale, 8 * scale, 2 * scale, p.gold);
    frond(x - 2 * scale, y - 14 * scale, 20 * scale, -1);
    frond(x + 2 * scale, y - 15 * scale, 17 * scale, 1);
    for (let i = 0; i < 7; i++) {
      const xx = x + (i - 3) * 2.5 * scale;
      const yy = y - (19 + (3 - Math.abs(i - 3)) * 2.2) * scale;
      rect(xx, yy, 0.5, y - 14 * scale - yy, p.leafMid);
      blossom(xx, yy, i % 2 ? p.ivory : p.roseLight, 0.9 * scale);
    }
  };
  const bungaTelur = (x: number, y: number) => {
    rect(x - 4, y - 7, 8, 7, '#c6ad7b');
    rect(x - 3, y - 7, 2, 6, '#eddbaf');
    rect(x - 5, y - 1, 10, 1, '#987b50');
    for (let i = 0; i < 5; i++) {
      const xx = x + (i - 2) * 3,
        yy = y - 19 - (2 - Math.abs(i - 2)) * 3;
      rect(xx, yy + 2, 0.5, y - 5 - yy, '#a19366');
      rect(xx - 2, yy + 3, 4, 1, p.rose);
      rect(xx - 2, yy + 4, 1, 4, p.roseLight);
      ellipse(xx, yy, 1.5, 2.5, p.ivory);
      rect(xx - 0.5, yy - 1.5, 0.5, 2, '#fffaf0');
    }
  };
  const plantedBed = (x: number, y: number, mirror = 1) => {
    // Low, irregular groundcover drifts soften the lawns without new obstacles.
    // Local arithmetic deliberately leaves the world-generation seed unchanged.
    for (const [dx, dy, rx, ry] of [
      [-18, 1, 18, 7],
      [4, -3, 23, 10],
      [25, 3, 13, 6],
    ]) {
      ellipse(x + dx * mirror, y + dy, rx, ry, '#869b725e');
      ellipse(x + (dx - 1) * mirror, y + dy - 1, rx - 1, ry - 1, '#93a57b');
    }
    for (let i = 0; i < 23; i++) {
      const xx = x + (((i * 17) % 64) - 31) * mirror;
      const yy = y + ((i * 7) % 13) - 6;
      const height = 3 + (i % 4);
      rect(xx, yy - height, 0.5, height, '#617f5e');
      rect(xx - 1.5, yy - 2, 1.5, 0.5, '#bed0a0');
      rect(xx + 0.5, yy - 3, 1.5, 0.5, '#748e64');
      if (i % 3 === 0) blossom(xx, yy - height, i % 2 ? p.roseLight : p.ivory, 0.65);
    }
    for (const [dx, dy] of [
      [-22, 5],
      [5, 7],
      [21, 0],
    ]) {
      ellipse(x + dx * mirror, y + dy, 4, 2, '#7d8b6a');
      ellipse(x + dx * mirror - 0.5, y + dy - 1, 3.5, 1.5, '#c7c6a8');
    }
    frond(x - 8 * mirror, y - 2, 12, mirror);
    frond(x + 14 * mirror, y + 1, 9, -mirror);
  };

  // Calm lawn leaves room for the eye to read the celebration.
  rect(0, 0, WORLD.width, WORLD.height, p.lawn);
  for (let i = 0; i < 100; i++)
    ellipse(
      rand() * 960,
      rand() * 800,
      10 + rand() * 30,
      3 + rand() * 8,
      i % 2 ? '#afbc9336' : '#91a57826',
    );
  for (let i = 0; i < 1350; i++) {
    const x = Math.floor(rand() * 960),
      y = Math.floor(rand() * 800);
    rect(x, y, 1 + rand() * 2, 0.5, i % 3 ? p.lawnLight : p.lawnDark);
    if (i % 6 === 0) {
      rect(x, y - 2, 0.5, 2, '#8fa274');
      rect(x + 1.5, y - 1.5, 0.5, 1.5, '#bac79c');
    }
  }
  // One connected paving surface prevents borders crossing path junctions.
  const paths = [
    [441, 235, 78, 565],
    [146, 328, 678, 55],
    [139, 364, 48, 230],
    [154, 562, 637, 58],
    [766, 360, 49, 238],
    [213, 458, 553, 47],
    [240, 570, 90, 85],
    [675, 561, 77, 87],
  ];
  for (const [x, y, w, h] of paths) rect(x - 4, y - 4, w + 8, h + 8, '#899b723f');
  for (const [x, y, w, h] of paths) rect(x - 2, y - 2, w + 4, h + 4, '#b6b79a');
  c.save();
  c.beginPath();
  for (const [x, y, w, h] of paths) c.rect(x, y, w, h);
  c.clip();
  rect(0, 0, WORLD.width, WORLD.height, '#c5bfa6');
  for (let y = 229; y < 802; y += 10) {
    for (let x = 128 - (Math.floor(y / 10) % 2) * 10; x < 837; x += 20) {
      const colors = ['#e2d9c0', '#dfd6bd', '#e7dec7', '#ddd4bb', '#e3dbc4'];
      rect(x + 0.5, y + 0.5, 19, 9, colors[Math.floor(rand() * colors.length)]);
      rect(x + 1, y + 1, 18, 0.5, '#f1e9d458');
      if (rand() > 0.8) rect(x + 3 + rand() * 11, y + 3 + rand() * 4, 2, 0.5, '#c4b99c');
    }
  }
  c.restore();
  plantedBed(285, 433);
  plantedBed(658, 426, -1);
  plantedBed(689, 701);
  for (let x = 18; x < 955; x += 18) {
    if (x > 421 && x < 539) continue;
    rect(x + 2, 750, 4, 26, '#78876030');
    rect(x - 4, 755, 23, 2, '#dcd6bd');
    rect(x - 4, 767, 23, 2, '#dcd6bd');
    rect(x, 748, 4, 26, '#f0ead4');
    rect(x, 748, 1, 26, '#c6c5a8');
    rect(x + 1, 746, 2, 2, '#f8f0dc');
  }
  block(0, 750, 420, 12);
  block(539, 750, 421, 12);

  // Malay timber hall: limas roof, carved ventilation panels and scalloped eaves.
  shadow(483, 236, 151, 22);
  rect(348, 122, 272, 114, '#796b53');
  rect(353, 128, 262, 100, '#cbbda0');
  for (let y = 134; y < 229; y += 8) {
    rect(355, y, 258, 0.5, '#aa98773d');
    rect(355, y + 0.5, 258, 0.5, '#f5e6c431');
  }
  rect(350, 224, 268, 13, '#897858');
  rect(350, 225, 268, 1, '#c4b38e');
  for (let x = 359; x < 613; x += 12) {
    rect(x, 229, 6, 5, '#514f3e');
    rect(x, 229, 6, 0.5, '#ad9972');
  }
  for (const x of [364, 408, 528, 572]) {
    rect(x - 2, 153, 34, 63, '#9a8260');
    rect(x, 155, 30, 57, '#4d6358');
    rect(x + 2, 158, 12, 50, '#7e9a89');
    rect(x + 16, 158, 12, 50, '#88a28e');
    rect(x + 3, 159, 4, 20, '#bdcdb039');
    rect(x + 15, 156, 1, 53, '#d4c6a3');
    rect(x + 1, 180, 28, 1, '#d4c6a3');
    rect(x - 4, 156, 4, 55, '#8a7655');
    rect(x + 30, 156, 4, 55, '#8a7655');
    for (let y = 159; y < 208; y += 5) {
      rect(x - 3, y, 2, 0.5, '#c7b18a');
      rect(x + 31, y, 2, 0.5, '#c7b18a');
    }
    rect(x - 4, 213, 38, 2, '#e4d5b3');
    lattice(x, 135, 30, 12);
  }
  rect(450, 151, 65, 85, '#6f6048');
  rect(454, 154, 57, 81, '#b7a17c');
  rect(458, 160, 49, 75, '#627365');
  for (const x of [460, 484]) {
    rect(x, 163, 20, 68, '#7b9480');
    rect(x + 2, 165, 16, 31, '#9fb29a');
    rect(x + 2, 200, 16, 28, '#a4946f');
    lattice(x + 4, 202, 12, 24);
    rect(x + 3, 166, 4, 19, '#d5e0bf49');
  }
  rect(480, 158, 2, 78, '#dcc69a');
  rect(477, 192, 1.5, 6, '#f9e2a4');
  rect(484, 192, 1.5, 6, '#f9e2a4');
  lattice(453, 134, 59, 12);
  for (let row = 0; row < 61; row++) {
    const inset = (60 - row) * 1.37;
    rect(
      322 + inset,
      66 + row,
      320 - inset * 2,
      1,
      row % 4 === 0 ? '#87715a' : row % 4 === 1 ? '#ba9d7b' : '#ac8e6d',
    );
    const left = 322 + inset,
      right = 642 - inset;
    rect(left, 66 + row, (482 - left) * 0.24, 1, '#cab08b33');
    rect(right - (right - 482) * 0.25, 66 + row, (right - 482) * 0.25, 1, '#725f493c');
    if (row % 4 !== 0)
      for (let x = left + (Math.floor(row / 4) % 2) * 6; x < right; x += 12)
        rect(x, 66 + row, 0.5, 1, '#796b505e');
  }
  rect(398, 63, 168, 3, '#716049');
  rect(397, 62, 170, 1, '#d5bd94');
  for (const [x, direction] of [
    [398, -1],
    [564, 1],
  ])
    for (let i = 0; i < 9; i++) rect(x + i * direction, 63 - i * 0.4, 1, 2, '#9f875e');
  rect(320, 126, 324, 4, '#685c47');
  rect(321, 126, 322, 1, '#d1bc95');
  rect(328, 130, 309, 3, '#aa916b');
  for (let x = 330; x < 635; x += 6) {
    rect(x, 133, 4, 2, '#d3be94');
    rect(x + 1, 135, 2, 2, '#c7af86');
    rect(x + 1.5, 137, 1, 1, '#9c825d');
  }
  for (const x of [345, 613]) {
    rect(x, 134, 7, 106, '#806b4f');
    rect(x + 1, 134, 4, 103, '#ceb992');
    rect(x + 1, 136, 1, 96, '#f1dfb7');
    rect(x - 1, 227, 9, 3, '#e8d5ad');
    rect(x - 1, 236, 9, 3, '#ad946d');
  }
  rect(440, 235, 84, 6, '#f2e6ca');
  rect(440, 240, 84, 1, '#a9a084');
  rect(434, 242, 95, 7, '#dbcfb0');
  rect(434, 242, 95, 1, '#f9edd4');
  rect(455, 249, 53, 61, '#ac8172');
  rect(457, 249, 49, 61, '#d3a898');
  rect(459, 249, 1, 60, '#efd7b8');
  rect(503, 249, 1, 60, '#efd7b8');
  for (let y = 253; y < 310; y += 10) {
    diamond(462, y, 1, '#f0d5b3');
    diamond(500, y, 1, '#f0d5b3');
  }
  block(346, 118, 277, 123);
  label('THE WEDDING HALL', 481, 106);
  for (const x of [350, 615]) {
    bush(x, 235, 47);
    lamp(x + (x < 400 ? -22 : 22), 266);
    urn(x + (x < 400 ? 19 : -19), 237, 0.8);
  }

  // Invitation pavilion with a woven roof, carved frieze and floral swag.
  shadow(192, 310, 107, 11);
  rect(96, 267, 193, 44, '#b4a688');
  rect(98, 267, 189, 37, '#e1d3b3');
  for (let y = 270; y < 305; y += 6) rect(99, y, 187, 0.5, '#c1b392');
  rect(89, 306, 208, 8, '#bcad8b');
  rect(89, 306, 208, 2, '#f2e6cb');
  for (const x of [107, 267]) {
    rect(x, 207, 9, 101, '#8e7958');
    rect(x + 1, 207, 6, 98, '#dcc9a1');
    rect(x + 2, 210, 1, 93, '#f7e9c8');
    rect(x - 2, 229, 13, 3, '#b79a6b');
    rect(x - 2, 301, 13, 4, '#bdab83');
  }
  for (let row = 0; row < 50; row++) {
    const inset = (50 - row) * 1.5;
    rect(80 + inset, 160 + row, 230 - inset * 2, 1, row % 4 === 0 ? '#ad9671' : '#d5c09a');
    if (row % 4)
      for (let x = 82 + inset; x < 305 - inset; x += 9) rect(x, 160 + row, 0.5, 1, '#bca37d');
  }
  rect(153, 158, 84, 2, '#9a815c');
  rect(83, 209, 223, 4, '#8e7957');
  rect(84, 209, 221, 1, '#f0deb5');
  lattice(113, 214, 155, 10);
  for (let x = 111; x < 279; x += 6) {
    rect(x, 224, 3, 2, '#e8d3ab');
    rect(x + 1, 226, 1, 2, '#c3a775');
  }
  for (let x = 121; x < 264; x += 5) {
    const yy = 230 + Math.sin(((x - 120) / 145) * Math.PI) * 8;
    rect(x, yy, 5, 1, p.leafMid);
    if (x % 3 === 0) blossom(x, yy, p.ivory, 0.75);
  }
  rect(170, 264, 49, 26, '#8d7858');
  rect(172, 267, 45, 22, '#c0a783');
  lattice(176, 272, 37, 12);
  rect(167, 260, 55, 6, '#f5e9cb');
  rect(167, 265, 55, 1, '#aa916b');
  rect(184, 242, 23, 20, '#c3ab7d');
  rect(185, 242, 21, 19, p.ivory);
  rect(187, 244, 17, 15, '#b8a079');
  rect(187.5, 244.5, 16, 14, p.ivory);
  diamond(195, 248, 1.5, p.gold);
  rect(190, 252, 10, 0.5, '#a2926f');
  rect(192, 254, 6, 0.5, '#b9a985');
  block(168, 248, 52, 41);
  block(107, 213, 10, 94);
  block(267, 213, 10, 94);
  bush(97, 306);
  bush(293, 307);
  urn(129, 285, 0.7);
  label('THE INVITATION', 194, 298);

  // Pelamin: ivory drapery, champagne arch, floral garland, carved settee and
  // traditional bunga telur. The couple is placed separately by the scene.
  shadow(729, 311, 90, 11);
  rect(645, 261, 167, 49, '#bbaa86');
  rect(647, 262, 163, 40, '#eadcc0');
  for (let x = 650; x < 811; x += 10) rect(x, 281, 0.5, 21, '#d7c8a9');
  rect(640, 304, 177, 9, '#d7c6a2');
  rect(640, 304, 177, 1.5, '#fff3db');
  rect(643, 310, 171, 0.5, '#b3a184');
  // A warm rose carpet gives the ivory couple clear visual separation.
  rect(697, 275, 63, 29, '#b98579');
  rect(699, 275, 59, 29, '#cfa396');
  rect(701, 277, 0.5, 25, '#f4dcb8');
  rect(755, 277, 0.5, 25, '#f4dcb8');
  for (let y = 280; y < 304; y += 7) {
    diamond(704, y, 1, '#f0d3ac');
    diamond(752, y, 1, '#f0d3ac');
  }
  for (let row = 0; row < 101; row++) {
    const half = row < 49 ? Math.sqrt(Math.max(0, 1 - (1 - row / 49) ** 2)) * 72 : 72;
    rect(729 - half, 157 + row, half * 2, 1, '#ccb890');
    if (half > 3) rect(732 - half, 159 + row, half * 2 - 6, 1, '#f7ebd3');
  }
  for (let x = 662; x < 801; x += 9) {
    const top = 162 + (1 - Math.sqrt(Math.max(0, 1 - ((x - 729) / 72) ** 2))) * 47;
    rect(x, top, 3, 256 - top, '#e5d6ba');
    rect(x + 3, top, 2, 256 - top, '#fff4df');
    rect(x + 7, top + 1, 0.5, 255 - top, '#d0bd9b');
  }
  for (let row = 0; row < 76; row++) {
    const width = 19 - Math.sin((row / 77) * Math.PI) * 10;
    rect(656, 183 + row, width, 1, '#eee0c5');
    rect(802 - width, 183 + row, width, 1, '#e9d9bb');
    rect(657 + width * 0.5, 183 + row, 1, 1, '#fff5df');
    rect(801 - width * 0.5, 183 + row, 1, 1, '#fff2d9');
  }
  rect(655, 225, 13, 2, '#bd9d68');
  rect(790, 225, 13, 2, '#bd9d68');
  for (let x = 655; x <= 806; x += 8) {
    const yy = 212 - Math.sin(((x - 651) / 159) * Math.PI) * 48;
    ellipse(x, yy, 9, 6, '#7c9170');
    ellipse(x - 1, yy - 2, 7, 4, '#9aac83');
    blossom(x - 3, yy - 2, p.ivory, 1.1);
    blossom(x + 3, yy + 1, x % 3 ? p.roseLight : '#e5b7a5', 0.9);
    rect(x - 4, yy + 5, 2, 4, '#bcc9a2');
  }
  for (const x of [660, 798])
    for (let y = 217; y < 246; y += 6) {
      rect(x, y, 0.5, 6, '#9cae82');
      blossom(x + (y % 2 ? 1 : -1), y, p.ivory, 0.65);
    }
  // Airy, asymmetrical floral shoulders frame faces instead of filling the arch.
  for (const [x, y, side] of [
    [658, 204, -1],
    [796, 214, 1],
  ]) {
    frond(x + side * 3, y + 7, 25, side);
    frond(x + side * 6, y + 13, 18, side);
    for (let i = 0; i < 7; i++) {
      const xx = x + side * (((i * 5) % 14) - 2),
        yy = y + i * 4 - 10;
      ellipse(xx, yy, 4.5, 3, '#879c72');
      blossom(xx - 1, yy - 1, i % 3 ? p.ivory : p.roseLight, 1 + (i % 2) * 0.15);
    }
  }
  rect(692, 250, 75, 25, '#a98b59');
  ellipse(729, 249, 34, 14, '#c4a56f');
  ellipse(729, 249, 31, 11, '#faf0d9');
  rect(698, 250, 63, 18, '#f4e6cb');
  for (let x = 704; x < 760; x += 10) {
    diamond(x, 251, 1, '#ceba91');
    diamond(x + 5, 257, 1, '#d5c3a0');
  }
  rect(696, 266, 67, 12, '#dfcfae');
  rect(697, 266, 65, 2, '#fff2d9');
  rect(728, 266, 1, 10, '#bdad8d');
  for (const x of [690, 763]) {
    rect(x, 260, 7, 24, '#b2935f');
    ellipse(x + 3.5, 259, 4.5, 3, '#ddc597');
    rect(x + 1, 263, 1, 19, '#efd8aa');
    rect(x + 1, 283, 5, 2, '#91744a');
  }
  diamond(729, 234, 3, '#cfb077');
  block(688, 247, 84, 25);
  bush(650, 294, 38);
  bush(809, 294, 38);
  urn(671, 285, 0.8);
  urn(787, 285, 0.8);
  bungaTelur(677, 263);
  bungaTelur(780, 263);
  if (!portrait) label('THE PELAMIN', 729, 314);

  // Limestone fountain: fine coping, shaded water and sparse, delicate ripples.
  shadow(482, 434, 77, 34);
  ellipse(480, 432, 77, 43, '#aaa58a');
  ellipse(480, 428, 76, 42, '#d8cfb3');
  ellipse(480, 425, 75, 40, '#f0e6cd');
  ellipse(480, 425, 66, 32, '#6d998f');
  ellipse(480, 424, 63, 29, '#7eaea1');
  ellipse(478, 421, 57, 25, '#99c3b3');
  ellipse(473, 417, 46, 19, '#adcdbb');
  for (let i = 0; i < 34; i++) {
    const xx = (rand() - 0.5) * 109,
      yy = (rand() - 0.5) * 46;
    if ((xx * xx) / (55 * 55) + (yy * yy) / (24 * 24) > 1) continue;
    rect(480 + xx, 423 + yy, 2 + rand() * 6, 0.5, i % 2 ? '#d9e6cd' : '#729f94');
    if (i % 5 === 0) rect(481 + xx, 424 + yy, 3, 0.5, '#eef0d8');
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    rect(480 + Math.cos(a) * 71, 425 + Math.sin(a) * 36, 0.5, 3, '#b5b197');
  }
  ellipse(480, 424, 12, 4, '#6d9d9138');
  rect(474, 382, 12, 41, '#a8b299');
  rect(475, 383, 4, 39, '#dee1c4');
  rect(479, 383, 3, 39, '#c6ceb0');
  ellipse(480, 386, 27, 8, '#b6bea2');
  ellipse(480, 383, 28, 8, '#eee6cb');
  ellipse(480, 381, 23, 5.5, '#8cb8a7');
  ellipse(480, 380, 19, 3.5, '#b7d4bd');
  rect(478.5, 366, 3, 16, '#b3c9ad');
  rect(478.5, 366, 1, 16, '#edf0d3');
  ellipse(480, 366, 4, 2, '#f3efd2');
  for (const x of [456, 466, 493, 502]) {
    rect(x, 385, 0.5, 20 + rand() * 12, '#dfebcf9c');
    rect(x + 0.5, 388, 0.5, 15, '#a9d0bd');
  }
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

  // Story and wishing tree, with pearl ribbons and tiny handwritten cards.
  tree(119, 466, 1.2, true);
  c.save();
  // Rendering invisibly retains the exact random sequence and collider list,
  // while a keepsake crop receives an unobstructed stage background.
  if (portrait) c.globalAlpha = 0;
  tree(805, 427, 1.5, true);
  for (let i = 0; i < 12; i++) {
    const x = 767 + (i % 6) * 14,
      y = 349 + Math.floor(i / 6) * 23 + (i % 3) * 5;
    rect(x, y, 0.5, 19, '#f5e8ca');
    rect(x - 2, y + 16, 5, 7, '#ab9473');
    rect(x - 2, y + 15, 4.5, 7, i % 2 ? p.ivory : '#e5beaa');
    rect(x - 1, y + 17, 2.5, 0.5, '#b19776');
    rect(x - 1, y + 19, 2, 0.5, '#bba483');
    rect(x, y + 13, 0.5, 1, '#9f865d');
  }
  c.restore();
  rect(141, 449, 35, 25, '#806c50');
  rect(143, 451, 31, 20, '#c9b58f');
  rect(145, 452, 27, 17, '#fcf0d5');
  rect(158, 452, 0.5, 17, '#b7a783');
  for (let y = 456; y < 466; y += 3) {
    rect(147, y, 8, 0.5, '#c1ad87');
    rect(161, y, 8, 0.5, '#c1ad87');
  }
  blossom(167, 456, p.rose, 0.55);
  block(141, 449, 35, 25);
  label('OUR STORY', 154, 480);
  rect(835, 429, 37, 26, '#806f51');
  rect(837, 431, 33, 21, '#c6af86');
  rect(839, 433, 29, 17, '#e4d3ae');
  for (let i = 0; i < 5; i++) {
    const xx = 841 + i * 5,
      yy = 435 + (i % 2) * 5;
    rect(xx, yy, 4, 7, i % 2 ? p.ivory : p.roseLight);
    rect(xx + 1, yy + 2, 2, 0.5, '#a2906e');
    rect(xx + 1, yy + 4, 1.5, 0.5, '#b4a181');
  }
  block(835, 429, 37, 26);
  label('WISHING TREE', 791, 447);

  // Songket-inspired RSVP counter and an open guest register.
  shadow(296, 592, 53, 8);
  rect(250, 566, 93, 27, '#816b4f');
  rect(253, 570, 87, 19, '#a8916d');
  rect(256, 572, 81, 15, '#d7c6a4');
  for (let x = 259; x < 336; x += 7) {
    diamond(x, 576, 2, '#ab9069');
    diamond(x + 3.5, 582, 1.5, '#bca47c');
  }
  rect(246, 561, 101, 8, '#d8c5a0');
  rect(246, 561, 101, 2, '#fbefcf');
  rect(246, 568, 101, 1, '#a08b65');
  rect(254, 560, 26, 1, '#c0af8c');
  rect(262, 552, 24, 9, '#bcac8b');
  rect(263, 551, 22, 9, '#fff5df');
  rect(273, 552, 0.5, 7, '#c5b68f');
  for (const x of [266, 276]) for (const y of [554, 556, 558]) rect(x, y, 6, 0.5, '#b4a27f');
  rect(289, 554, 0.5, 6, '#776e55');
  rect(289, 553, 0.5, 1, '#ccad70');
  bush(340, 554, 24);
  urn(314, 561, 0.5);
  block(247, 560, 99, 34);
  label('RSVP', 296, 587);

  // Fine clock ticks, a pendulum and carved champagne case.
  shadow(715, 574, 25, 5);
  rect(704, 526, 18, 47, '#8b7453');
  rect(706, 532, 14, 39, '#c1a77c');
  rect(709, 538, 8, 28, '#776f54');
  rect(712, 539, 1, 17, '#e1c793');
  ellipse(713, 558, 3, 4, '#e0c493');
  ellipse(713, 526, 26, 27, '#796b4e');
  ellipse(713, 524, 24, 25, '#c5a978');
  ellipse(713, 523, 21.5, 22.5, '#fbefd4');
  ellipse(713, 523, 19.5, 20.5, '#e4d4af');
  ellipse(713, 523, 19, 20, '#fbefd4');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rect(
      713 + Math.sin(a) * 16.5,
      523 - Math.cos(a) * 17.5,
      i % 3 ? 0.5 : 1,
      i % 3 ? 1 : 2,
      '#a48d62',
    );
  }
  rect(712.5, 509, 1, 15, '#59664e');
  rect(713, 522.5, 11, 1, '#59664e');
  ellipse(713, 523, 1.5, 1.5, '#a28c62');
  rect(699, 571, 28, 3, '#bfa77d');
  block(692, 506, 42, 68);
  label('SAVE THE DATE', 715, 578);

  // Entrance arch with narrow timber carving and floral sprays.
  for (const x of [418, 539]) {
    shadow(x + 3, 724, 11, 4);
    rect(x, 650, 8, 73, '#a78c62');
    rect(x + 1, 651, 5, 71, '#e1cfa8');
    rect(x + 2, 651, 1, 69, '#fff0cb');
    for (let y = 661; y < 720; y += 10) diamond(x + 4, y, 1.5, '#bea279');
    rect(x - 2, 718, 12, 5, '#c4ad83');
    bush(x + 3, 703, 29);
  }
  for (let x = 418; x <= 546; x++) {
    const y = 651 - Math.sin(((x - 414) / 135) * Math.PI) * 29;
    rect(x, y, 1, 5, '#a98f66');
    rect(x, y, 1, 1, '#f4dfb5');
  }
  for (let x = 417; x < 548; x += 7) {
    const y = 650 - Math.sin(((x - 414) / 135) * Math.PI) * 29;
    ellipse(x, y, 7.5, 5, '#658360');
    ellipse(x - 1, y - 2, 6, 4, '#9caf85');
    blossom(x - 2, y - 2, x % 2 ? p.ivory : p.roseLight, 0.9);
    if (x % 3 === 0) blossom(x + 2, y + 2, p.rose, 0.7);
  }
  label('SELAMAT DATANG', 482, 642);

  // Linen tables, cane chairs, porcelain settings and tiny glasses.
  for (const [x, y] of [
    [310, 390],
    [626, 661],
    [167, 668],
    [858, 574],
  ]) {
    shadow(x, y + 7, 29, 14);
    for (const dx of [-31, 25]) {
      rect(x + dx, y - 8, 9, 16, '#a88e67');
      rect(x + dx + 1, y - 8, 7, 11, '#ddc59b');
      rect(x + dx, y - 12, 9, 4, '#ead8b3');
      rect(x + dx + 1, y - 11, 7, 1, '#bda278');
      rect(x + dx + 1, y + 8, 1.5, 4, '#897453');
      rect(x + dx + 6, y + 8, 1.5, 4, '#897453');
      block(x + dx, y - 9, 9, 17);
    }
    ellipse(x, y - 1, 23, 18, '#bda987');
    ellipse(x, y - 4, 23, 17, '#e6d8b9');
    for (const dx of [-17, -10, 0, 10, 17]) rect(x + dx, y + 4, 0.5, 7, '#c6b593');
    ellipse(x, y - 8, 23, 15, '#fff2d9');
    ellipse(x, y - 8, 20, 12, '#f8ecd2');
    for (const dx of [-13, 13]) {
      ellipse(x + dx, y - 8, 5, 3.5, '#c3c8ab');
      ellipse(x + dx, y - 8.5, 4.5, 3, '#fff9e8');
      ellipse(x + dx, y - 8.5, 3, 2, '#e7dfc4');
      rect(x + dx - 7, y - 11, 0.5, 5, '#8b927d');
      rect(x + dx + 6, y - 11, 0.5, 5, '#8b927d');
      rect(x + dx, y - 17, 2, 3, '#d5debe');
      rect(x + dx + 0.5, y - 16.5, 0.5, 2, '#fff8df');
    }
    ellipse(x, y - 9, 3, 2, '#c7ad7f');
    rect(x - 1.5, y - 16, 3, 7, '#cdbd92');
    blossom(x - 2, y - 18, p.roseLight, 0.8);
    blossom(x + 2, y - 17, p.ivory, 0.9);
    block(x - 23, y - 20, 46, 28);
  }

  // Scalloped food-stall awning, carved counter and covered brass dishes.
  shadow(92, 585, 37, 5);
  rect(67, 554, 52, 31, '#947958');
  rect(69, 560, 48, 22, '#ceb38a');
  lattice(74, 565, 38, 13);
  rect(60, 532, 65, 17, '#e9d9b8');
  for (let x = 60; x < 125; x += 10) rect(x, 532, 5, 17, '#8c9b78');
  rect(60, 531, 65, 1, '#f4e4c2');
  for (let x = 60; x < 125; x += 5)
    ellipse(x + 2.5, 549, 2.5, 3, (x - 60) % 10 ? '#e9d9b8' : '#8c9b78');
  for (const x of [65, 117]) {
    rect(x, 552, 4, 33, '#816a4c');
    rect(x + 1, 552, 1, 31, '#d6b98b');
  }
  rect(66, 556, 54, 3, '#f6e6c5');
  for (const x of [79, 98]) {
    ellipse(x, 555, 7, 2, '#a18c62');
    ellipse(x, 553, 6, 3, '#ddc599');
    rect(x - 1, 549, 2, 1.5, '#9b8157');
    rect(x - 4, 552, 3, 0.5, '#f9e3b6');
  }
  block(61, 551, 61, 36);
  for (const [x, y, color] of [
    [310, 154, '#e6dcc1'],
    [655, 120, '#91a899'],
  ] as const) {
    c.save();
    if (portrait) c.globalAlpha = 0;
    shadow(x + 13, y + 35, 17, 16);
    rect(x - 2, y + 7, 29, 7, '#566255');
    rect(x - 2, y + 33, 29, 7, '#566255');
    rect(x, y - 2, 25, 46, '#6d7b66');
    rect(x + 1, y - 3, 23, 47, color);
    rect(x + 3, y - 3, 19, 1, '#f4ecd7');
    rect(x + 4, y + 6, 17, 10, '#688b84');
    rect(x + 5, y + 7, 6, 7, '#b2c8b4');
    rect(x + 4, y + 29, 17, 8, '#75958a');
    rect(x + 3, y + 18, 1, 9, '#f1e7cb6e');
    rect(x + 2, y + 1, 4, 2, '#fff2bf');
    rect(x + 19, y + 1, 4, 2, '#fff2bf');
    rect(x + 3, y + 41, 4, 1, '#bb7e6b');
    rect(x + 18, y + 41, 4, 1, '#bb7e6b');
    block(x - 2, y - 3, 29, 49);
    c.restore();
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
  for (const [start, end, y] of [
    [295, 655, 328],
    [193, 756, 549],
  ]) {
    for (let x = start; x < end; x += 0.5)
      rect(x, y + Math.sin(((x - start) / (end - start)) * Math.PI) * 19, 0.5, 0.5, '#6d7759');
    for (let x = start + 12; x < end; x += 24) {
      const yy = y + Math.sin(((x - start) / (end - start)) * Math.PI) * 19;
      rect(x, yy, 0.5, 4, '#70785b');
      ellipse(x, yy + 5.5, 3.5, 3.5, '#fff0b927');
      rect(x - 1, yy + 3.5, 2, 1.5, '#b69b65');
      ellipse(x, yy + 6, 1.5, 2, '#fff2c5');
      rect(x - 0.5, yy + 5, 0.5, 1, '#fff9de');
    }
  }
  // Layered border planting encloses the world while preserving clear paths.
  c.save();
  if (portrait) c.globalAlpha = 0;
  // Canonical perimeter layout from the original garden. Keeping collider
  // centres and sizes separate from foliage randomness prevents visual detail
  // edits from changing navigation. The original records are retained verbatim
  // after drawing so reconstructed tree anchors cannot introduce float drift.
  const perimeterLayout = [
    [18, 89.57567084906623, 38.68911426886916],
    [37, 145.19098766995592, 32.0895292699337],
    [74, 65.19272507308051, 33.859111007303],
    [93, 144.7260948757641, 29.601333481073382],
    [130, 74.9671396757476, 37.52309027686715],
    [149, 157.46045297039672, 34.82236544489861],
    [186, 87.10600816039369, 35.582410883158445],
    [205, 145.1518119419925, 34.463737934827805],
    [242, 81.86305414466187, 32.864849638193846],
    [261, 148.03382075866682, 27.33908663094044],
    [298, 74.55719263432547, 34.470124777406454],
    [317, 154.69519100924953, 32.48613694012165],
    [354, 37.655020147096366, 34.41635197773576],
    [410, 34.289359842892736, 38.59868964552879],
    [466, 34.534022368025035, 35.589306969195604],
    [522, 45.71735690673813, 34.61633612960577],
    [578, 47.209636009763926, 39.584582943469286],
    [634, 91.6190230823122, 33.811592653393745],
    [653, 141.27825751872734, 33.40880576819181],
    [690, 81.9107053144835, 34.753990434110165],
    [709, 159.26582339899613, 29.209888432919982],
    [746, 70.67505898466334, 39.48961643129587],
    [765, 158.97840360822158, 30.345088033378126],
    [802, 89.07303299522027, 34.03054994344711],
    [821, 152.53862663106992, 33.47113284915686],
    [858, 66.87021780898795, 35.95311201363802],
    [877, 146.2149564222433, 34.28035111576319],
    [914, 84.16075110947713, 38.151392728090286],
    [933, 150.48940373258665, 34.74402370303869],
    [28.42777477996424, 191.2, 35.2],
    [940.4447572622448, 218.8, 36.8],
    [30.67980767181143, 271.2, 35.2],
    [937.5054822480306, 298.79999999999995, 36.8],
    [28.679906310979277, 351.20000000000005, 35.2],
    [940.0962366573513, 378.79999999999995, 36.8],
    [28.65182230202481, 431.20000000000005, 35.2],
    [935.6549079800025, 458.79999999999995, 36.8],
    [34.59219400258735, 511.20000000000005, 35.2],
    [931.199130428955, 538.8, 36.8],
    [30.79520854121074, 591.2, 35.2],
    [935.1846719337627, 618.8, 36.8],
    [30.707982829306275, 671.2, 35.2],
    [935.0103360265493, 698.8, 36.8],
  ] as const;
  for (const [x, centerY, size] of perimeterLayout) {
    tree(x, centerY + size / 4, size / 32);
    obstacles[obstacles.length - 1] = { x, y: centerY, width: size, height: size };
  }
  for (const [x, y, scale] of [
    [81, 354, 0.8],
    [868, 315, 1],
    [362, 700, 0.8],
    [870, 693, 1.1],
    [66, 706, 0.9],
    [605, 567, 0.65],
    [232, 710, 0.7],
  ])
    tree(x, y, scale);
  c.restore();
  for (let i = 0; i < 65; i++) {
    const x = 65 + rand() * 830,
      y = 645 + rand() * 85;
    if (x > 392 && x < 567) continue;
    if (i % 3 === 0) flower(x, y, '#f2e5bd');
    else {
      rect(x, y, 0.5, 3, '#7f9669');
      rect(x + 1.5, y + 1, 0.5, 2, '#839b6c');
    }
  }
  return obstacles;
}

export { drawCharacter, makeSprites } from './characters';
export type { CharacterStyle } from './characters';
