import type { Json, Profile, RSVPRecord, WeddingInput, WeddingRecord, WishRecord } from './wedding';

type Shape<T> = { [Key in keyof T]: T[Key] };
type Table<Row, Insert = Partial<Row>> = {
  Row: Shape<Row>;
  Insert: Shape<Insert>;
  Update: Partial<Shape<Row>>;
  Relationships: [];
};
export interface Database {
  public: {
    Tables: {
      weddings: Table<WeddingRecord, WeddingInput>;
      profiles: Table<Profile>;
      rsvps: Table<RSVPRecord>;
      wishes: Table<WishRecord>;
    };
    Views: Record<string, never>;
    Functions: {
      get_public_wedding: { Args: { p_slug: string }; Returns: Json };
      get_public_wishes: { Args: { p_wedding_id: string }; Returns: Json };
      get_guest_rsvp: { Args: { p_wedding_id: string; p_submission_token: string }; Returns: Json };
      submit_rsvp: {
        Args: {
          p_wedding_id: string;
          p_submission_token: string;
          p_guest_name: string;
          p_attendance: string;
          p_guest_count: number;
          p_phone: string;
          p_message: string;
        };
        Returns: string;
      };
      submit_wish: {
        Args: {
          p_wedding_id: string;
          p_submission_token: string;
          p_guest_name: string;
          p_message: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
