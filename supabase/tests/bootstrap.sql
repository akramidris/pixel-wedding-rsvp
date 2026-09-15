-- ONLY for the isolated PGlite test database. Never run this in Supabase.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Verify that existing users get a customer profile during the migration.
insert into auth.users(id, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000099', '{"role":"admin","display_name":"Existing user"}');
