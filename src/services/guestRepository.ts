import { requireSupabase } from '../lib/supabase';
import type { RSVP, WeddingRepository, Wish } from './storage';
import { serviceError } from './errors';

const temporaryTokens = new Map<string, string>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function guestToken(key: string) {
  let existing = temporaryTokens.get(key);
  try {
    existing = localStorage.getItem(key) || existing;
  } catch {
    /* Memory fallback while storage is unavailable. */
  }
  if (!existing || !uuid.test(existing)) existing = crypto.randomUUID();
  temporaryTokens.set(key, existing);
  try {
    localStorage.setItem(key, existing);
  } catch {
    /* Never fail a database submission because browser storage is blocked. */
  }
  return existing;
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function response(value: unknown): RSVP | null {
  if (!value) return null;
  const row = record(value);
  if (
    typeof row.guest_name !== 'string' ||
    typeof row.guest_count !== 'number' ||
    !['attending', 'not_attending'].includes(String(row.attendance))
  )
    throw new Error('Your previous response could not be read.');
  return {
    name: row.guest_name,
    attending: row.attendance === 'attending',
    guests: row.guest_count,
    phone: String(row.phone || ''),
    message: String(row.message || ''),
    createdAt: String(row.created_at || ''),
  };
}

/** Every operation closes over one immutable wedding ID; the caller cannot
 * accidentally submit a form to the wedding most recently visited elsewhere. */
export function createGuestRepository(weddingId: string, maxGuests: number): WeddingRepository {
  const client = requireSupabase();
  const rsvpToken = guestToken(`wedding:${weddingId}:rsvp-token`);
  return {
    mode: 'supabase',
    async getRSVP() {
      const { data, error } = await client.rpc('get_guest_rsvp', {
        p_wedding_id: weddingId,
        p_submission_token: rsvpToken,
      });
      if (error)
        throw serviceError(error, 'Your previous response could not be loaded. Please try again.');
      return response(data);
    },
    async saveRSVP(input) {
      const name = input.name.trim(),
        message = input.message.trim(),
        phone = (input.phone || '').trim();
      if (!name || name.length > 120)
        throw new Error('Please add your name (up to 120 characters).');
      if (message.length > 2000 || phone.length > 40)
        throw new Error('Please shorten your message or phone number.');
      if (
        input.attending &&
        (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > maxGuests)
      )
        throw new Error(`Please choose 1 to ${maxGuests} guests.`);
      const saved = { ...input, name, message, phone, guests: input.attending ? input.guests : 0 };
      const { error } = await client.rpc('submit_rsvp', {
        p_wedding_id: weddingId,
        p_submission_token: rsvpToken,
        p_guest_name: name,
        p_attendance: input.attending ? 'attending' : 'not_attending',
        p_guest_count: saved.guests,
        p_phone: phone,
        p_message: message,
      });
      if (error)
        throw serviceError(
          error,
          'Your RSVP could not be sent. Check your connection and try again.',
        );
      return { ...saved, createdAt: new Date().toISOString() };
    },
    async getWishes() {
      const { data, error } = await client.rpc('get_public_wishes', { p_wedding_id: weddingId });
      if (error) throw serviceError(error, 'Wishes could not be loaded. Please try again.');
      if (!Array.isArray(data)) throw new Error('Wishes could not be read.');
      return data.map((value) => {
        const row = record(value);
        return {
          id: String(row.id),
          name: String(row.guest_name),
          message: String(row.message),
          createdAt: String(row.created_at),
          approved: true,
        } satisfies Wish;
      });
    },
    async addWish(name, message) {
      name = name.trim();
      message = message.trim();
      if (!name || !message) throw new Error('Please add your name and a wish.');
      if (name.length > 120 || message.length > 2000)
        throw new Error('Please shorten your name or wish.');
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify([name, message])),
      );
      const fingerprint = Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
      const token = guestToken(`wedding:${weddingId}:wish-token:${fingerprint}`);
      const { data, error } = await client.rpc('submit_wish', {
        p_wedding_id: weddingId,
        p_submission_token: token,
        p_guest_name: name,
        p_message: message,
      });
      if (error)
        throw serviceError(
          error,
          'Your wish could not be sent. Check your connection and try again.',
        );
      return { id: data!, name, message, createdAt: new Date().toISOString(), approved: false };
    },
  };
}
