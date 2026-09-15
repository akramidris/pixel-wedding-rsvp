import type { WeddingConfig } from '../types/wedding';
import type { CharacterStyle } from '../game/art/garden';
export interface NPCData {
  name: string;
  kind: CharacterStyle;
  x: number;
  y: number;
  bubble: string;
  message: string;
}
export function createNPCDialogue(w: WeddingConfig): NPCData[] {
  return [
    {
      name: w.groom.name,
      kind: 'groom',
      x: 711,
      y: 298,
      bubble: 'Our favourite day ♡',
      message:
        'Thank you for being part of our special day! Your presence and prayers mean the world to us.',
    },
    {
      name: w.bride.name,
      kind: 'bride',
      x: 743,
      y: 298,
      bubble: '',
      message: 'Thank you for being part of our special day ♡ Come stand beside us for a photo!',
    },
    {
      name: w.bride.father || 'Bride’s family',
      kind: 'father',
      x: 570,
      y: 286,
      bubble: 'Selamat datang!',
      message:
        'Assalamualaikum. We are so happy to welcome you. May this day be filled with blessings for everyone.',
    },
    {
      name: w.bride.mother || 'Bride’s family',
      kind: 'mother',
      x: 598,
      y: 301,
      bubble: '',
      message:
        'Selamat datang! Thank you for celebrating with our family. Please make yourself at home.',
    },
    {
      name: w.groom.father || 'Groom’s family',
      kind: 'father',
      x: 373,
      y: 288,
      bubble: 'Welcome!',
      message:
        'Welcome to our celebration. The surau is inside the hall, and our hosts will gladly help you find your way.',
    },
    {
      name: w.groom.mother || 'Groom’s family',
      kind: 'mother',
      x: 348,
      y: 310,
      bubble: '',
      message:
        'We are grateful to share this joyful day with you. Don’t forget to leave a wish at the wishing tree!',
    },
    {
      name: 'Wedding Host',
      kind: 'host',
      x: 530,
      y: 679,
      bubble: 'Selamat datang!',
      message:
        'Assalamualaikum! Welcome to our wedding celebration. Follow the paths to discover the invitation, meet our families, and leave a little love behind.',
    },
    {
      name: 'Photographer',
      kind: 'photographer',
      x: 674,
      y: 356,
      bubble: 'A little memory?',
      message:
        'Meet the couple at the pelamin and choose Take Photo to save a framed garden memory with your character.',
    },
    {
      name: 'A wedding guest',
      kind: 'guest',
      x: 634,
      y: 689,
      bubble: 'Such a lovely day!',
      message:
        'There’s so much to discover here. I left my wish at the tree — have you found it yet?',
    },
    {
      name: 'Food Stall Staff',
      kind: 'staff',
      x: 93,
      y: 614,
      bubble: 'Jemput makan!',
      message:
        'Jemput makan! Please join us for lunch at the reception. Enjoy the food and the company.',
    },
  ];
}

// Preview canvases share only the artwork positions, never customer details.
export const npcPlacements: Pick<NPCData, 'kind' | 'x' | 'y'>[] = [
  { kind: 'groom', x: 711, y: 298 },
  { kind: 'bride', x: 743, y: 298 },
  { kind: 'father', x: 570, y: 286 },
  { kind: 'mother', x: 598, y: 301 },
  { kind: 'father', x: 373, y: 288 },
  { kind: 'mother', x: 348, y: 310 },
  { kind: 'host', x: 530, y: 679 },
  { kind: 'photographer', x: 674, y: 356 },
  { kind: 'guest', x: 634, y: 689 },
  { kind: 'staff', x: 93, y: 614 },
];
