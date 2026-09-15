import { requireSupabase } from '../lib/supabase';
import { safeHttpsUrl } from '../lib/urls';
import type { RSVPRecord, WeddingInput, WeddingRecord, WishRecord } from '../types/wedding';
import { serviceError } from './errors';
import { validSlug } from './weddings';

// Supabase normally caps a response at 1,000 rows. Page explicitly for complete
// totals and exports; never silently truncate a wedding's guest list.
async function collect<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>,
): Promise<T[]> {
  const result: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    if (error) throw serviceError(error, 'The records could not be loaded. Please try again.');
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}
function validate(input: Partial<WeddingInput>, creating = false): Partial<WeddingInput> {
  const result = { ...input };
  if (creating && (!input.owner_id || !input.slug || !validSlug(input.slug)))
    throw new Error(
      'Choose an owner and a valid slug (3–80 lowercase letters, numbers and hyphens).',
    );
  if (input.slug !== undefined && !validSlug(input.slug))
    throw new Error('Use a slug with 3–80 lowercase letters, numbers and single hyphens.');
  for (const field of ['groom_name', 'bride_name'] as const) {
    if (input[field] !== undefined && (!input[field]!.trim() || input[field]!.trim().length > 120))
      throw new Error('Each partner’s name must contain 1–120 characters.');
    if (input[field] !== undefined) result[field] = input[field]!.trim();
  }
  if (
    input.wedding_date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(input.wedding_date) ||
      !Number.isFinite(Date.parse(input.wedding_date)))
  )
    throw new Error('Please choose a valid wedding date.');
  if (input.start_time && input.end_time && input.end_time <= input.start_time)
    throw new Error('End time must be after start time on the wedding date.');
  for (const field of ['google_maps_url', 'waze_url', 'music_url'] as const) {
    if (input[field] !== undefined)
      result[field] = safeHttpsUrl(
        input[field] || '',
        field === 'music_url' ? 'Music' : 'Map',
        true,
      );
  }
  for (const field of ['story', 'schedule'] as const) {
    if (input[field] && (input[field]!.length > 30 || JSON.stringify(input[field]).length > 32768))
      throw new Error('Please use no more than 30 short story or schedule entries.');
  }
  return result;
}
const weddingColumns =
  'id,owner_id,slug,groom_name,bride_name,wedding_date,start_time,end_time,venue_name,venue_address,google_maps_url,waze_url,theme,template,music_url,status,story,schedule,settings,expires_at,created_at,updated_at' as const;
export const platformService = {
  listWeddings(ownerId?: string): Promise<WeddingRecord[]> {
    return collect((from, to) => {
      let query = requireSupabase()
        .from('weddings')
        .select(weddingColumns)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to);
      if (ownerId) query = query.eq('owner_id', ownerId);
      return query;
    });
  },
  async getWedding(id: string) {
    const { data, error } = await requireSupabase()
      .from('weddings')
      .select(weddingColumns)
      .eq('id', id)
      .maybeSingle();
    if (error) throw serviceError(error, 'This wedding could not be loaded.');
    if (!data) throw new Error('This wedding does not exist or you do not have access to it.');
    return data;
  },
  async createWedding(input: WeddingInput) {
    const { data, error } = await requireSupabase()
      .from('weddings')
      .insert(validate(input, true) as WeddingInput)
      .select(weddingColumns)
      .single();
    if (error)
      throw serviceError(
        error,
        'The wedding could not be created. Please check the values and try again.',
      );
    return data!;
  },
  async updateWedding(id: string, input: Partial<WeddingInput>) {
    const { data, error } = await requireSupabase()
      .from('weddings')
      .update(validate(input))
      .eq('id', id)
      .select(weddingColumns)
      .maybeSingle();
    if (error)
      throw serviceError(
        error,
        'The wedding could not be saved. Please check the values and try again.',
      );
    if (!data) throw new Error('You do not have access to edit this wedding.');
    return data;
  },
  listRsvps(weddingId: string): Promise<RSVPRecord[]> {
    return collect((from, to) =>
      requireSupabase()
        .from('rsvps')
        .select('id,wedding_id,guest_name,attendance,guest_count,phone,message,created_at')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
    );
  },
  listWishes(weddingId: string): Promise<WishRecord[]> {
    return collect((from, to) =>
      requireSupabase()
        .from('wishes')
        .select('id,wedding_id,guest_name,message,approved,created_at')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
    );
  },
  async moderateWish(id: string, weddingId: string, approved: boolean) {
    const { data, error } = await requireSupabase()
      .from('wishes')
      .update({ approved })
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select('id');
    if (error) throw serviceError(error, 'The wish could not be updated. Please try again.');
    if (!data?.length) throw new Error('You do not have access to update this wish.');
  },
  listProfiles() {
    return collect((from, to) =>
      requireSupabase()
        .from('profiles')
        .select('id,role,display_name,created_at')
        .order('display_name')
        .order('id')
        .range(from, to),
    );
  },
  async adminStats() {
    const client = requireSupabase();
    const now = new Date().toISOString();
    const responses = await Promise.all([
      client.from('weddings').select('id', { count: 'exact', head: true }),
      client
        .from('weddings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${now}`),
      client.from('weddings').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      client
        .from('weddings')
        .select('id', { count: 'exact', head: true })
        .or(`status.eq.expired,and(status.neq.draft,expires_at.lte.${now})`),
      client.from('rsvps').select('id', { count: 'exact', head: true }),
    ]);
    const error = responses.find((response) => response.error)?.error;
    if (error) throw serviceError(error, 'Platform totals could not be loaded.');
    const [total, active, draft, expired, rsvps] = responses.map((response) => response.count || 0);
    return { total, active, draft, expired, rsvps };
  },
};
