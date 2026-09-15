import type { weddingConfig } from '../config/wedding';

export type WeddingStatus = 'draft' | 'active' | 'archived' | 'expired';
export type WeddingTheme = 'sage' | 'rose' | 'champagne';
export type Attendance = 'attending' | 'not_attending';
export type StoryItem = { year: string; title: string; description: string };
export type ScheduleItem = { time: string; title: string; detail: string };
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

/** Validated presentation data: only this model enters the existing game. */
export type WeddingConfig = typeof weddingConfig & {
  id: string;
  slug: string;
  theme: WeddingTheme;
  template: 'garden';
  status: WeddingStatus;
  settings: { maxGuests: number; demo: boolean };
};

export interface WeddingRecord {
  id: string;
  owner_id: string | null;
  slug: string;
  groom_name: string;
  bride_name: string;
  wedding_date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address: string;
  google_maps_url: string;
  waze_url: string;
  theme: WeddingTheme;
  template: 'garden';
  music_url: string | null;
  status: WeddingStatus;
  story: StoryItem[];
  schedule: ScheduleItem[];
  settings: { [key: string]: Json | undefined };
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type WeddingInput = Omit<WeddingRecord, 'id' | 'created_at' | 'updated_at'>;
export type PublicWeddingRecord = Omit<
  WeddingRecord,
  'owner_id' | 'created_at' | 'updated_at' | 'expires_at' | 'status'
>;
export type PublicWeddingResult =
  | { state: 'active'; wedding: PublicWeddingRecord }
  | { state: 'not_found' | 'expired' | 'unavailable'; wedding: null };

export interface Profile {
  id: string;
  role: 'admin' | 'customer';
  display_name: string;
  created_at: string;
}
export interface RSVPRecord {
  id: string;
  wedding_id: string;
  guest_name: string;
  attendance: Attendance;
  guest_count: number;
  phone: string;
  message: string;
  created_at: string;
}
export interface WishRecord {
  id: string;
  wedding_id: string;
  guest_name: string;
  message: string;
  approved: boolean;
  created_at: string;
}
