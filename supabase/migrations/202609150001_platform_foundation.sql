-- One database, many weddings. Apply with the Supabase CLI or SQL Editor.
-- Public guests use the allowlisted RPC API below, never raw table access.
begin;

revoke create on schema public from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Validate JSON consumed by the editor/game even when clients bypass the forms.
create function private.valid_content_rows(p_rows jsonb, p_kind text) returns boolean
language sql immutable set search_path = ''
as $$
  select case when jsonb_typeof(p_rows) is distinct from 'array' then false else not exists (
    select 1 from jsonb_array_elements(p_rows) as entry(item)
    where jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'title') is distinct from 'string'
      or char_length(btrim(item->>'title')) not between 1 and 120
      or jsonb_typeof(item->(case when p_kind = 'story' then 'year' else 'time' end)) is distinct from 'string'
      or char_length(btrim(item->>(case when p_kind = 'story' then 'year' else 'time' end))) not between 1 and 40
      or jsonb_typeof(item->(case when p_kind = 'story' then 'description' else 'detail' end)) is distinct from 'string'
      or char_length(btrim(item->>(case when p_kind = 'story' then 'description' else 'detail' end)))
        not between (case when p_kind = 'story' then 1 else 0 end) and 2000
  ) end;
$$;
revoke all on function private.valid_content_rows(jsonb, text) from public, anon, authenticated;
grant execute on function private.valid_content_rows(jsonb, text) to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  display_name text not null default '' check (char_length(display_name) <= 120),
  created_at timestamptz not null default now()
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  slug text not null unique check (char_length(slug) between 3 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  groom_name text not null check (char_length(btrim(groom_name)) between 1 and 120),
  bride_name text not null check (char_length(btrim(bride_name)) between 1 and 120),
  wedding_date date not null,
  start_time time not null default '11:00',
  end_time time not null default '16:00',
  venue_name text not null default '' check (char_length(venue_name) <= 200),
  venue_address text not null default '' check (char_length(venue_address) <= 1000),
  google_maps_url text not null default '' check (char_length(google_maps_url) <= 2048 and (google_maps_url = '' or google_maps_url ~ '^https://[^[:space:]]+$')),
  waze_url text not null default '' check (char_length(waze_url) <= 2048 and (waze_url = '' or waze_url ~ '^https://[^[:space:]]+$')),
  theme text not null default 'sage' check (theme in ('sage', 'rose', 'champagne')),
  template text not null default 'garden' check (template = 'garden'),
  music_url text not null default '' check (char_length(music_url) <= 2048 and (music_url = '' or music_url ~ '^https://[^[:space:]]+$')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived', 'expired')),
  story jsonb not null default '[]'::jsonb check (private.valid_content_rows(story, 'story') and jsonb_array_length(story) <= 30 and octet_length(story::text) <= 32768),
  schedule jsonb not null default '[]'::jsonb check (private.valid_content_rows(schedule, 'schedule') and jsonb_array_length(schedule) <= 30 and octet_length(schedule::text) <= 32768),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object' and octet_length(settings::text) <= 32768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  check (end_time > start_time),
  check (not (settings ? 'max_guests') or (jsonb_typeof(settings->'max_guests') = 'number'
    and (settings->>'max_guests') ~ '^([1-9]|1[0-9]|20)$'))
);
create index weddings_owner_id_idx on public.weddings(owner_id);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  submission_token uuid not null,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 120),
  attendance text not null check (attendance in ('attending', 'not_attending')),
  guest_count integer not null check (guest_count between 0 and 20),
  phone text not null default '' check (char_length(phone) <= 40),
  message text not null default '' check (char_length(message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, submission_token),
  check ((attendance = 'attending' and guest_count >= 1) or (attendance = 'not_attending' and guest_count = 0))
);
create index rsvps_wedding_created_idx on public.rsvps(wedding_id, created_at desc);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  submission_token uuid not null,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (wedding_id, submission_token)
);
create index wishes_wedding_created_idx on public.wishes(wedding_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.rsvps enable row level security;
alter table public.wishes enable row level security;

-- Read role from protected DB data, never user-editable Auth metadata.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'); $$;

create function private.can_manage_wedding(p_wedding_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select private.is_admin() or exists(select 1 from public.weddings where id = p_wedding_id and owner_id = (select auth.uid())); $$;

revoke all on function private.is_admin() from public, anon, authenticated;
revoke all on function private.can_manage_wedding(uuid) from public, anon, authenticated;
grant execute on function private.is_admin(), private.can_manage_wedding(uuid) to authenticated;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Existing Auth users safely become customers; metadata cannot promote them.
insert into public.profiles(id, display_name)
select id, left(coalesce(raw_user_meta_data->>'display_name', ''), 120) from auth.users
on conflict (id) do nothing;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_name on public.profiles for update to authenticated
using (id = (select auth.uid()) or (select private.is_admin()))
with check (id = (select auth.uid()) or (select private.is_admin()));

create policy weddings_read on public.weddings for select to authenticated
using (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy weddings_admin_insert on public.weddings for insert to authenticated
with check ((select private.is_admin()));
create policy weddings_update on public.weddings for update to authenticated
using (owner_id = (select auth.uid()) or (select private.is_admin()))
with check (owner_id = (select auth.uid()) or (select private.is_admin()));
create policy weddings_admin_delete on public.weddings for delete to authenticated
using ((select private.is_admin()));

create policy rsvps_read on public.rsvps for select to authenticated
using (private.can_manage_wedding(wedding_id));
create policy rsvps_admin_delete on public.rsvps for delete to authenticated
using ((select private.is_admin()));
create policy wishes_read on public.wishes for select to authenticated
using (private.can_manage_wedding(wedding_id));
create policy wishes_moderate on public.wishes for update to authenticated
using (private.can_manage_wedding(wedding_id))
with check (private.can_manage_wedding(wedding_id));

-- RLS isolates rows; this trigger additionally protects platform-owned columns.
create function private.guard_wedding_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Wedding identity cannot be changed' using errcode = '42501';
  end if;
  -- Trusted SQL roles can administer these fields; browser roles must be admin.
  if current_user in ('anon', 'authenticated') and not private.is_admin() and
     (new.owner_id is distinct from old.owner_id or new.slug is distinct from old.slug or
      new.status is distinct from old.status or new.expires_at is distinct from old.expires_at or
      new.template is distinct from old.template or new.settings is distinct from old.settings) then
    raise exception 'Only an administrator can change platform settings' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.guard_wedding_update() from public, anon, authenticated;
create trigger protect_wedding_columns before update on public.weddings
for each row execute function private.guard_wedding_update();

-- Revoke Supabase default grants explicitly, then expose the minimum dashboard API.
revoke all on public.profiles, public.weddings, public.rsvps, public.wishes from public, anon, authenticated;
grant select on public.profiles, public.weddings to authenticated;
-- Guest tokens are bearer credentials, unnecessary even for admin dashboards.
grant select (id, wedding_id, guest_name, attendance, guest_count, phone, message, created_at, updated_at)
  on public.rsvps to authenticated;
grant select (id, wedding_id, guest_name, message, approved, created_at)
  on public.wishes to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on public.weddings to authenticated;
grant delete on public.rsvps to authenticated;
grant update (approved) on public.wishes to authenticated;

create function public.get_public_wedding(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  w public.weddings%rowtype;
  public_settings jsonb;
begin
  if p_slug is null or char_length(p_slug) not between 3 and 80 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return jsonb_build_object('state', 'not_found', 'wedding', null);
  end if;
  select * into w from public.weddings where slug = p_slug;
  if not found or w.status = 'draft' then
    return jsonb_build_object('state', 'not_found', 'wedding', null);
  end if;
  if w.status = 'expired' or (w.expires_at is not null and w.expires_at <= now()) then
    return jsonb_build_object('state', 'expired', 'wedding', null);
  end if;
  if w.status <> 'active' then
    return jsonb_build_object('state', 'unavailable', 'wedding', null);
  end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into public_settings
  from jsonb_each(w.settings)
  where key = any(array['title', 'groom_full_name', 'bride_full_name', 'groom_father', 'groom_mother',
    'bride_father', 'bride_mother', 'contact_groom', 'contact_bride', 'invitation', 'facilities',
    'timezone', 'utc_offset', 'default_volume', 'max_guests']);
  return jsonb_build_object('state', 'active', 'wedding', jsonb_build_object(
    'id', w.id, 'slug', w.slug, 'groom_name', w.groom_name, 'bride_name', w.bride_name,
    'wedding_date', w.wedding_date, 'start_time', w.start_time, 'end_time', w.end_time,
    'venue_name', w.venue_name, 'venue_address', w.venue_address,
    'google_maps_url', w.google_maps_url, 'waze_url', w.waze_url,
    'theme', w.theme, 'template', w.template, 'music_url', w.music_url,
    'story', w.story, 'schedule', w.schedule, 'settings', public_settings));
end;
$$;

-- Lock the wedding during a submission so archiving/expiry updates cannot race it.
create function private.require_active_wedding(p_wedding_id uuid) returns integer
language plpgsql security definer set search_path = ''
as $$
declare allowed_guests integer;
begin
  select coalesce((settings->>'max_guests')::integer, 5) into allowed_guests
  from public.weddings where id = p_wedding_id and status = 'active'
    and (expires_at is null or expires_at > now()) for share;
  if not found then
    raise exception 'This wedding is not accepting submissions' using errcode = 'P0001';
  end if;
  return allowed_guests;
end;
$$;
revoke all on function private.require_active_wedding(uuid) from public, anon, authenticated;

create function public.submit_rsvp(
  p_wedding_id uuid, p_submission_token uuid, p_guest_name text, p_attendance text,
  p_guest_count integer, p_phone text default '', p_message text default ''
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare result_id uuid; allowed_guests integer;
begin
  allowed_guests := private.require_active_wedding(p_wedding_id);
  if p_submission_token is null or p_guest_name is null or char_length(btrim(p_guest_name)) not between 1 and 120
    or p_attendance is null or p_attendance not in ('attending', 'not_attending')
    or p_guest_count is null or p_guest_count not between 0 and allowed_guests
    or (p_attendance = 'attending' and p_guest_count < 1)
    or (p_attendance = 'not_attending' and p_guest_count <> 0)
    or char_length(coalesce(p_phone, '')) > 40 or char_length(coalesce(p_message, '')) > 2000 then
    raise exception 'Invalid RSVP details' using errcode = '22023';
  end if;
  insert into public.rsvps(wedding_id, submission_token, guest_name, attendance, guest_count, phone, message)
  values (p_wedding_id, p_submission_token, btrim(p_guest_name), p_attendance, p_guest_count,
    btrim(coalesce(p_phone, '')), btrim(coalesce(p_message, '')))
  on conflict (wedding_id, submission_token) do update set
    guest_name = excluded.guest_name, attendance = excluded.attendance, guest_count = excluded.guest_count,
    phone = excluded.phone, message = excluded.message, updated_at = now()
  returning id into result_id;
  return result_id;
end;
$$;

-- Possession of the random per-wedding token permits reading/updating only that RSVP.
-- There is no lookup by guest name, phone, response ID, or wedding ID alone.
create function public.get_guest_rsvp(p_wedding_id uuid, p_submission_token uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('id', r.id, 'guest_name', r.guest_name, 'attendance', r.attendance,
    'guest_count', r.guest_count, 'phone', r.phone, 'message', r.message, 'created_at', r.created_at)
  from public.rsvps r join public.weddings w on w.id = r.wedding_id
  where r.wedding_id = p_wedding_id and r.submission_token = p_submission_token
    and w.status = 'active' and (w.expires_at is null or w.expires_at > now());
$$;

create function public.submit_wish(p_wedding_id uuid, p_submission_token uuid, p_guest_name text, p_message text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare result_id uuid;
begin
  perform private.require_active_wedding(p_wedding_id);
  if p_submission_token is null or p_guest_name is null or char_length(btrim(p_guest_name)) not between 1 and 120
    or p_message is null or char_length(btrim(p_message)) not between 1 and 2000 then
    raise exception 'Invalid wish details' using errcode = '22023';
  end if;
  insert into public.wishes(wedding_id, submission_token, guest_name, message)
  values (p_wedding_id, p_submission_token, btrim(p_guest_name), btrim(p_message))
  on conflict (wedding_id, submission_token) do nothing returning id into result_id;
  if result_id is null then
    select id into result_id from public.wishes where wedding_id = p_wedding_id and submission_token = p_submission_token;
  end if;
  return result_id;
end;
$$;

create function public.get_public_wishes(p_wedding_id uuid)
returns table (id uuid, guest_name text, message text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.guest_name, g.message, g.created_at from public.wishes g
  join public.weddings w on w.id = g.wedding_id
  where g.wedding_id = p_wedding_id and g.approved and w.status = 'active'
    and (w.expires_at is null or w.expires_at > now())
  order by g.created_at desc, g.id desc limit 100;
$$;

-- These audited functions are the only anonymous database entrypoints.
revoke all on function public.get_public_wedding(text), public.submit_rsvp(uuid, uuid, text, text, integer, text, text),
  public.get_guest_rsvp(uuid, uuid), public.submit_wish(uuid, uuid, text, text), public.get_public_wishes(uuid)
  from public, anon, authenticated;
grant execute on function public.get_public_wedding(text), public.submit_rsvp(uuid, uuid, text, text, integer, text, text),
  public.get_guest_rsvp(uuid, uuid), public.submit_wish(uuid, uuid, text, text), public.get_public_wishes(uuid)
  to anon, authenticated;

commit;
