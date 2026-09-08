export type AreaId =
  'welcome' | 'story' | 'invitation' | 'schedule' | 'venue' | 'pelamin' | 'wishes' | 'rsvp';
export interface Area {
  id: AreaId;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  icon: string;
}
export const WORLD = { width: 960, height: 800, start: { x: 477, y: 687 } };
export const areas: Area[] = [
  {
    id: 'welcome',
    name: 'Welcome Garden',
    subtitle: 'Your little adventure begins',
    x: 480,
    y: 638,
    icon: 'flower',
  },
  {
    id: 'invitation',
    name: 'Invitation Pavilion',
    subtitle: 'An invitation from the heart',
    x: 195,
    y: 325,
    icon: 'mail',
  },
  {
    id: 'schedule',
    name: 'Date & Time',
    subtitle: 'Save a very special date',
    x: 714,
    y: 596,
    icon: 'calendar',
  },
  {
    id: 'venue',
    name: 'Wedding Hall',
    subtitle: 'A place to celebrate together',
    x: 483,
    y: 263,
    icon: 'home',
  },
  {
    id: 'pelamin',
    name: 'The Pelamin',
    subtitle: 'Meet the happy couple',
    x: 727,
    y: 332,
    icon: 'heart',
  },
  {
    id: 'wishes',
    name: 'Wishing Tree',
    subtitle: 'Leave a little love behind',
    x: 791,
    y: 466,
    icon: 'tree',
  },
  {
    id: 'story',
    name: 'Our Story',
    subtitle: 'Every love has a beginning',
    x: 157,
    y: 492,
    icon: 'book',
  },
  {
    id: 'rsvp',
    name: 'RSVP Counter',
    subtitle: 'Save your seat at our table',
    x: 296,
    y: 612,
    icon: 'check',
  },
];
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}
