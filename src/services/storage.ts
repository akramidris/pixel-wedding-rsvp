import { weddingConfig } from '../config/wedding';
export interface Wish {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}
export interface RSVP {
  name: string;
  attending: boolean;
  guests: number;
  message: string;
  createdAt: string;
}
// Implement this interface with Supabase / Firebase and replace the export below.
export interface WeddingRepository {
  getWishes(): Promise<Wish[]>;
  addWish(name: string, message: string): Promise<Wish>;
  getRSVP(): Promise<RSVP | null>;
  saveRSVP(rsvp: Omit<RSVP, 'createdAt'>): Promise<RSVP>;
}
const key = weddingConfig.storageKey;
function read<T>(suffix: string, fallback: T): T {
  const raw = localStorage.getItem(`${key}:${suffix}`);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('Your saved data could not be read. Please check your browser storage.');
  }
}
export const weddingRepository: WeddingRepository = {
  async getWishes() {
    const data = read<Wish[]>('wishes', []);
    if (!Array.isArray(data)) throw new Error('Your saved wishes could not be read.');
    return data
      .filter((w) => w && typeof w.name === 'string' && typeof w.message === 'string')
      .slice(0, 100);
  },
  async addWish(name, message) {
    if (!name.trim() || !message.trim()) throw new Error('Please add your name and a wish.');
    const wish = {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      message: message.trim().slice(0, 600),
      createdAt: new Date().toISOString(),
    };
    const wishes = await this.getWishes();
    localStorage.setItem(`${key}:wishes`, JSON.stringify([wish, ...wishes].slice(0, 100)));
    return wish;
  },
  async getRSVP() {
    return read<RSVP | null>('rsvp', null);
  },
  async saveRSVP(rsvp) {
    if (!rsvp.name.trim()) throw new Error('Please add your name.');
    if (rsvp.attending && (!Number.isInteger(rsvp.guests) || rsvp.guests < 1 || rsvp.guests > 5))
      throw new Error('Please choose 1 to 5 guests.');
    const saved = {
      ...rsvp,
      name: rsvp.name.trim().slice(0, 80),
      message: rsvp.message.trim().slice(0, 600),
      guests: rsvp.attending ? rsvp.guests : 0,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`${key}:rsvp`, JSON.stringify(saved));
    return saved;
  },
};
