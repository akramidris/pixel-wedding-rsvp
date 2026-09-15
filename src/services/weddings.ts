import { weddingConfig as sample } from '../config/wedding';
import { requireSupabase } from '../lib/supabase';
import { safeHttpsUrl } from '../lib/urls';
import type { PublicWeddingResult, WeddingConfig, StoryItem, ScheduleItem } from '../types/wedding';
import { serviceError } from './errors';

export const validSlug = (slug: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 80;
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, fallback = '', limit = 2000) =>
  typeof value === 'string' ? value.slice(0, limit) : fallback;
function rows<T>(value: unknown, keys: string[]): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 30)
    .filter((item) => keys.every((key) => typeof object(item)[key] === 'string'))
    .map((item) => Object.fromEntries(keys.map((key) => [key, text(object(item)[key])]))) as T[];
}

export function mapWeddingConfig(value: unknown): WeddingConfig {
  const record = object(value),
    settings = object(record.settings);
  const id = text(record.id),
    slug = text(record.slug);
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !validSlug(slug) ||
    !text(record.groom_name).trim() ||
    !text(record.bride_name).trim()
  )
    throw new Error(
      'This invitation has incomplete wedding information. Please contact the couple.',
    );
  const date = text(record.wedding_date),
    start = text(record.start_time),
    end = text(record.end_time);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(start) ||
    !/^\d{2}:\d{2}(:\d{2})?$/.test(end)
  )
    throw new Error('This invitation has an invalid wedding date or time.');
  const offset = /^[+-](0\d|1[0-4]):[0-5]\d$/.test(text(settings.utc_offset))
    ? text(settings.utc_offset)
    : '+08:00';
  const isoDate = `${date}T${start}${offset}`,
    endDate = `${date}T${end}${offset}`;
  if (!Number.isFinite(Date.parse(isoDate)) || Date.parse(endDate) <= Date.parse(isoDate))
    throw new Error('This invitation has an invalid wedding schedule.');
  const calendarDay = new Date(`${date}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    calendarDay.toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });
  const clock = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  };
  const invitation = object(settings.invitation);
  const theme = ['sage', 'rose', 'champagne'].includes(text(record.theme))
    ? (record.theme as WeddingConfig['theme'])
    : 'sage';
  if (record.template !== 'garden')
    throw new Error('This invitation template is not supported yet.');
  return {
    id,
    slug,
    status: 'active',
    theme,
    template: 'garden',
    title: text(settings.title, sample.title, 120),
    groom: {
      name: text(record.groom_name, '', 120),
      fullName: text(settings.groom_full_name, text(record.groom_name), 160),
      father: text(settings.groom_father, "Groom's father", 120),
      mother: text(settings.groom_mother, "Groom's mother", 120),
    },
    bride: {
      name: text(record.bride_name, '', 120),
      fullName: text(settings.bride_full_name, text(record.bride_name), 160),
      father: text(settings.bride_father, "Bride's father", 120),
      mother: text(settings.bride_mother, "Bride's mother", 120),
    },
    wedding: {
      date: format({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      shortDate: format({ day: 'numeric', month: 'long', year: 'numeric' }),
      day: format({ weekday: 'long' }),
      isoDate,
      endDate,
      time: `${clock(start)} – ${clock(end)}`,
      timezone: text(settings.timezone, 'Asia/Kuala_Lumpur'),
      timezoneLabel: `UTC${offset}`,
      reception: 'Wedding Reception',
    },
    venue: {
      name: text(record.venue_name),
      address: text(record.venue_address),
      googleMaps: safeHttpsUrl(text(record.google_maps_url), 'Google Maps', true),
      waze: safeHttpsUrl(text(record.waze_url), 'Waze', true),
      facilities: rows(settings.facilities, ['title', 'detail']),
    },
    contact: {
      groom: text(settings.contact_groom, '', 40).replace(/[^+\d\s()-]/g, ''),
      bride: text(settings.contact_bride, '', 40).replace(/[^+\d\s()-]/g, ''),
    },
    invitation: Object.fromEntries(
      Object.entries(sample.invitation).map(([key, fallback]) => [
        key,
        text(invitation[key], fallback),
      ]),
    ) as WeddingConfig['invitation'],
    story: rows<StoryItem>(record.story, ['year', 'title', 'description']),
    schedule: rows<ScheduleItem>(record.schedule, ['time', 'title', 'detail']),
    music: {
      src: record.music_url ? safeHttpsUrl(text(record.music_url), 'Music') : sample.music.src,
      defaultVolume:
        typeof settings.default_volume === 'number'
          ? Math.min(1, Math.max(0, settings.default_volume))
          : 0.3,
    },
    storageKey: `wedding:${id}`,
    settings: {
      maxGuests: Number.isInteger(settings.max_guests)
        ? Math.max(1, Math.min(20, settings.max_guests as number))
        : 5,
      demo: false,
    },
  };
}

export async function loadPublicWedding(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicWeddingResult> {
  if (!validSlug(slug)) return { state: 'not_found', wedding: null };
  const request = requireSupabase().rpc('get_public_wedding', { p_slug: slug });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error)
    throw serviceError(
      error,
      'The wedding could not be loaded. Check your connection and try again.',
    );
  const result = object(data);
  if (result.state === 'active' && result.wedding) {
    mapWeddingConfig(result.wedding);
    return result as unknown as PublicWeddingResult;
  }
  if (['not_found', 'expired', 'unavailable'].includes(text(result.state)))
    return { state: result.state as 'not_found' | 'expired' | 'unavailable', wedding: null };
  throw new Error('The wedding service returned an unexpected response. Please try again.');
}

export const demoWeddingConfig: WeddingConfig = {
  ...sample,
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'sample-garden',
  theme: 'sage',
  template: 'garden',
  status: 'active',
  settings: { maxGuests: 5, demo: true },
};
