-- Run on a disposable local database after migrations. All fixtures roll back.
-- The PGlite harness supplies auth.uid(), roles and auth.users; Supabase has them.
begin;
create schema test_support;
grant usage on schema test_support to anon, authenticated;
create function test_support.assert_true(condition boolean, label text) returns void
language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'FAIL - %', label; end if;
  raise notice 'ok - %', label;
end;
$$;
create function test_support.expect_error(command text, expected_state text, label text) returns void
language plpgsql as $$
declare actual_state text;
begin
  begin execute command;
  exception when others then get stacked diagnostics actual_state = returned_sqlstate;
  end;
  if actual_state is distinct from expected_state then
    raise exception 'FAIL - % (expected %, got %)', label, expected_state, coalesce(actual_state, 'no error');
  end if;
  raise notice 'ok - %', label;
end;
$$;
grant execute on all functions in schema test_support to anon, authenticated;

select test_support.assert_true((select role = 'customer' from public.profiles
  where id = '10000000-0000-4000-8000-000000000099'), 'Existing Auth users backfill as customers despite role metadata');
insert into auth.users(id, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', '{"display_name":"Customer A","role":"admin"}'),
  ('10000000-0000-4000-8000-000000000002', '{"display_name":"Customer B"}'),
  ('10000000-0000-4000-8000-000000000003', '{"display_name":"Administrator"}');
select test_support.assert_true((select role = 'customer' from public.profiles
  where id = '10000000-0000-4000-8000-000000000001'), 'Signup metadata cannot create an admin profile');
update public.profiles set role = 'admin' where id = '10000000-0000-4000-8000-000000000003';

insert into public.weddings(id, owner_id, slug, groom_name, bride_name, wedding_date, status, settings, expires_at) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'akram-aisyah', 'Akram', 'Aisyah', '2027-02-20', 'active', '{"title":"A wedding","max_guests":4,"private_billing_note":"NEVER PUBLIC"}', null),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'amir-nurul', 'Amir', 'Nurul', '2027-06-12', 'active', '{}', null),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'expired-wedding', 'Expired', 'Wedding', '2027-01-01', 'expired', '{}', null),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'draft-wedding', 'Draft', 'Wedding', '2027-01-01', 'draft', '{}', null),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'archived-wedding', 'Archived', 'Wedding', '2027-01-01', 'archived', '{}', null),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'elapsed-wedding', 'Elapsed', 'Wedding', '2027-01-01', 'active', '{}', now() - interval '1 day');
insert into public.wishes(id, wedding_id, submission_token, guest_name, message, approved) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000011', 'Visible A', 'Best wishes A', true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000012', 'Hidden A', 'Awaiting moderation', false),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000013', 'Visible B', 'Best wishes B', true);

set local role anon;
select test_support.assert_true(public.get_public_wedding('akram-aisyah') #>> '{wedding,groom_name}' = 'Akram', 'Wedding A loads only its configured couple');
select test_support.assert_true(public.get_public_wedding('amir-nurul') #>> '{wedding,groom_name}' = 'Amir', 'Wedding B loads its different couple');
select test_support.assert_true(public.get_public_wedding('missing-wedding')->>'state' = 'not_found', 'Unknown slug returns not_found');
select test_support.assert_true(public.get_public_wedding('../invalid')->>'state' = 'not_found', 'Invalid slug returns not_found');
select test_support.assert_true(public.get_public_wedding('draft-wedding')->>'state' = 'not_found', 'Draft config is not publicly discoverable');
select test_support.assert_true(public.get_public_wedding('expired-wedding') = '{"state":"expired","wedding":null}'::jsonb, 'Expired response exposes no wedding details');
select test_support.assert_true(public.get_public_wedding('elapsed-wedding')->>'state' = 'expired', 'Expiry timestamp overrides active status');
select test_support.assert_true(public.get_public_wedding('archived-wedding')->>'state' = 'unavailable', 'Archived wedding is unavailable');
select test_support.assert_true(not ((public.get_public_wedding('akram-aisyah')->'wedding') ? 'owner_id'), 'Public config does not expose owner UUID');
select test_support.assert_true(not ((public.get_public_wedding('akram-aisyah') #> '{wedding,settings}') ? 'private_billing_note'), 'Private settings never leave the public RPC');
select test_support.assert_true(public.get_public_wedding('akram-aisyah') #>> '{wedding,settings,title}' = 'A wedding', 'Allowlisted public settings remain available');
select test_support.expect_error('select * from public.weddings', '42501', 'Anonymous users cannot list raw weddings');
select test_support.expect_error('select * from public.rsvps', '42501', 'Anonymous users cannot list RSVPs');
select test_support.expect_error('select * from public.wishes', '42501', 'Anonymous users cannot list unmoderated wishes');
select test_support.expect_error('select * from public.profiles', '42501', 'Anonymous users cannot list customer profiles');
select test_support.expect_error('select private.is_admin()', '42501', 'Anonymous users cannot invoke private role helpers');
select test_support.expect_error($q$update public.weddings set status = 'active'$q$, '42501', 'Anonymous users cannot edit wedding settings');
select test_support.expect_error('delete from public.rsvps', '42501', 'Anonymous users cannot delete RSVPs');

select test_support.assert_true(public.submit_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Guest A', 'attending', 2, '0101234567', 'A message') is not null, 'Anonymous guest can RSVP for Wedding A');
select test_support.assert_true(public.submit_rsvp('20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Guest B', 'not_attending', 0, '', '') is not null, 'Anonymous guest can RSVP separately for Wedding B');
select test_support.assert_true(
  public.submit_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Guest A', 'attending', 3, '0101234567', 'Updated message')::text =
  public.get_guest_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001')->>'id',
  'RSVP replay updates the same record under its private token');
select test_support.assert_true(public.get_guest_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001')->>'guest_count' = '3', 'Guest can retrieve their updated response with the correct token');
select test_support.assert_true(public.get_guest_rsvp('20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001') is null, 'Wedding A token cannot retrieve Wedding B RSVP');
select test_support.assert_true(public.get_guest_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000099') is null, 'Unknown guest token returns no RSVP');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000003', gen_random_uuid(), 'No', 'attending', 1)$q$, 'P0001', 'Expired wedding rejects RSVP');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000006', gen_random_uuid(), 'No', 'attending', 1)$q$, 'P0001', 'Elapsed active wedding rejects RSVP');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000004', gen_random_uuid(), 'No', 'attending', 1)$q$, 'P0001', 'Draft wedding rejects RSVP');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000005', gen_random_uuid(), 'No', 'attending', 1)$q$, 'P0001', 'Archived wedding rejects RSVP');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'No', 'maybe', 1)$q$, '22023', 'RSVP attendance enum is enforced on the server');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'No', 'attending', -1)$q$, '22023', 'Negative guest count is rejected');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'No', 'attending', 5)$q$, '22023', 'Wedding-specific guest limit is enforced on the server');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'No', 'not_attending', 1)$q$, '22023', 'Declined RSVP must have zero guests');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', null, 'No', 'attending', 1)$q$, '22023', 'Submission token is mandatory');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', gen_random_uuid(), ' ', 'attending', 1)$q$, '22023', 'Blank guest name is rejected');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'No', 'attending', 1, repeat('1', 41))$q$, '22023', 'Oversized phone is rejected');

select test_support.assert_true((select count(*) from public.get_public_wishes('20000000-0000-4000-8000-000000000001')) = 1, 'Public guestbook includes approved wishes only');
select test_support.assert_true((select guest_name from public.get_public_wishes('20000000-0000-4000-8000-000000000002')) = 'Visible B', 'Wedding B public guestbook has only B wishes');
select test_support.assert_true(public.submit_wish('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000021', 'New A', 'A new wish') = public.submit_wish('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000021', 'New A', 'Attempted replacement'), 'Wish retries are idempotent and immutable');
select test_support.assert_true(public.submit_wish('20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000022', 'New B', 'B new wish') is not null, 'Wedding B accepts its own wish');
select test_support.assert_true((select count(*) from public.get_public_wishes('20000000-0000-4000-8000-000000000001')) = 1, 'New wish remains private until approved');
select test_support.expect_error($q$select public.submit_wish('20000000-0000-4000-8000-000000000003', gen_random_uuid(), 'No', 'No')$q$, 'P0001', 'Expired wedding rejects wishes');
select test_support.expect_error($q$select public.submit_wish('20000000-0000-4000-8000-000000000001', gen_random_uuid(), 'No', ' ')$q$, '22023', 'Blank wishes are rejected');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select test_support.assert_true((select count(*) from public.profiles) = 1, 'Customer sees only their own profile');
select test_support.assert_true(not private.is_admin(), 'Customer is not an admin despite signup metadata');
select test_support.assert_true((select count(*) from public.weddings where slug = 'amir-nurul') = 0, 'Customer A cannot query Wedding B private configuration');
select test_support.assert_true((select count(*) from public.rsvps) = 1 and (select guest_name from public.rsvps) = 'Guest A', 'Customer A RSVP list contains exactly A response after retries');
select test_support.assert_true((select count(*) from public.wishes) = 3, 'Customer A sees only A wishes including unapproved ones');
select test_support.expect_error('select submission_token from public.rsvps', '42501', 'Customer cannot read guest RSVP bearer tokens');
select test_support.expect_error('select submission_token from public.wishes', '42501', 'Customer cannot read guest wish tokens');
select test_support.expect_error('select * from public.rsvps', '42501', 'Wildcard dashboard reads cannot expose protected RSVP columns');
select test_support.expect_error($q$update public.profiles set role = 'admin'$q$, '42501', 'Customer cannot self-promote through profiles');
select test_support.expect_error($q$insert into public.profiles(id,role) values (gen_random_uuid(),'admin')$q$, '42501', 'Customer cannot insert an admin profile');
select test_support.expect_error($q$insert into public.weddings(slug,groom_name,bride_name,wedding_date) values ('unauthorized-new','X','Y','2027-01-01')$q$, '42501', 'Customer cannot create platform weddings');
update public.weddings set groom_name = 'Akram Edited' where slug = 'akram-aisyah';
select test_support.assert_true((select groom_name from public.weddings where slug = 'akram-aisyah') = 'Akram Edited', 'Owner can edit their wedding content');
select test_support.expect_error($q$update public.weddings set story = '[null]' where slug = 'akram-aisyah'$q$, '23514', 'Story rows cannot contain null');
select test_support.expect_error($q$update public.weddings set story = '[{"year":2027,"title":"Our story","description":"Welcome"}]' where slug = 'akram-aisyah'$q$, '23514', 'Story fields must have their expected string types');
select test_support.expect_error($q$update public.weddings set story = '[{"year":"2027","title":"Our story"}]' where slug = 'akram-aisyah'$q$, '23514', 'Story rows require description');
select test_support.expect_error($q$update public.weddings set schedule = '["invalid"]' where slug = 'akram-aisyah'$q$, '23514', 'Schedule rows must be objects');
select test_support.expect_error($q$update public.weddings set schedule = '[{"time":"11:00","title":"Arrival","detail":{}}]' where slug = 'akram-aisyah'$q$, '23514', 'Schedule detail must be a string');
update public.weddings set story = '[{"year":"2027","title":"Our story","description":"Welcome to our celebration"}]',
  schedule = '[{"time":"11:00 AM","title":"Arrival","detail":""}]' where slug = 'akram-aisyah';
select test_support.assert_true((select story->0->>'year' = '2027' and schedule->0->>'detail' = '' from public.weddings where slug = 'akram-aisyah'), 'Valid owner story and schedule edits pass including optional schedule detail');
select test_support.expect_error($q$update public.weddings set status = 'archived' where slug = 'akram-aisyah'$q$, '42501', 'Owner cannot change platform status');
select test_support.expect_error($q$update public.weddings set owner_id = '10000000-0000-4000-8000-000000000002' where slug = 'akram-aisyah'$q$, '42501', 'Owner cannot transfer ownership');
select test_support.expect_error($q$update public.weddings set slug = 'stolen-slug' where slug = 'akram-aisyah'$q$, '42501', 'Owner cannot change public slug');
select test_support.expect_error($q$update public.weddings set expires_at = now() + interval '100 years' where slug = 'akram-aisyah'$q$, '42501', 'Owner cannot extend expiration');
select test_support.expect_error($q$update public.weddings set settings = '{}' where slug = 'akram-aisyah'$q$, '42501', 'Owner cannot change private platform settings');
select test_support.expect_error($q$update public.weddings set template = 'other' where slug = 'akram-aisyah'$q$, '42501', 'Owner cannot change platform template');
select test_support.expect_error($q$update public.weddings set id = gen_random_uuid() where slug = 'akram-aisyah'$q$, '42501', 'Wedding identity is immutable');
update public.weddings set groom_name = 'Unauthorized B Edit' where slug = 'amir-nurul';
delete from public.weddings where slug = 'akram-aisyah';
select test_support.assert_true((select count(*) from public.weddings where slug = 'akram-aisyah') = 1, 'Owner cannot delete their wedding');
select test_support.expect_error($q$update public.rsvps set wedding_id = '20000000-0000-4000-8000-000000000002'$q$, '42501', 'Dashboard cannot move RSVPs between weddings');
delete from public.rsvps;
select test_support.assert_true((select count(*) from public.rsvps) = 1, 'Customer cannot delete guest responses');
update public.wishes set approved = true where id = '30000000-0000-4000-8000-000000000002';
select test_support.assert_true((select approved from public.wishes where id = '30000000-0000-4000-8000-000000000002'), 'Owner can approve their wish');
update public.wishes set approved = false where id = '30000000-0000-4000-8000-000000000003';
select test_support.expect_error($q$update public.wishes set wedding_id = '20000000-0000-4000-8000-000000000002'$q$, '42501', 'Owner cannot move wishes to another wedding');
select test_support.expect_error($q$update public.wishes set message = 'forged'$q$, '42501', 'Owner cannot rewrite guest messages');
select test_support.expect_error('delete from public.wishes', '42501', 'Wish deletion is not exposed');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select test_support.assert_true((select count(*) from public.weddings) = 1 and (select groom_name from public.weddings) = 'Amir', 'Customer B sees only B wedding and A could not change it');
select test_support.assert_true((select count(*) from public.rsvps) = 1 and (select guest_name from public.rsvps) = 'Guest B', 'Customer B RSVP list contains only B response');
select test_support.assert_true((select count(*) from public.wishes) = 2, 'Customer B sees only B wishes');
select test_support.assert_true((select approved from public.wishes where id = '30000000-0000-4000-8000-000000000003'), 'Customer A could not hide Wedding B wish');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select test_support.assert_true(private.is_admin(), 'Trusted admin profile grants admin authorization');
select test_support.assert_true((select count(*) from public.weddings) = 6, 'Admin sees all weddings');
select test_support.assert_true((select count(*) from public.profiles) = 4, 'Admin sees profiles for assigning wedding owners');
select test_support.assert_true((select count(*) from public.rsvps) = 2, 'Admin sees both tenant RSVP lists without duplicate submissions');
select test_support.expect_error('select submission_token from public.rsvps', '42501', 'Admin browser cannot read guest RSVP bearer tokens');
select test_support.expect_error('select submission_token from public.wishes', '42501', 'Admin browser cannot read guest wish tokens');
select test_support.assert_true((select count(*) from public.rsvps where wedding_id = '20000000-0000-4000-8000-000000000001' and guest_name = 'Guest A') = 1
  and (select count(*) from public.rsvps where wedding_id = '20000000-0000-4000-8000-000000000002' and guest_name = 'Guest B') = 1, 'RSVP wedding foreign keys prove tenant isolation');
select test_support.assert_true((select message = 'A new wish' and not approved from public.wishes where guest_name = 'New A' and wedding_id = '20000000-0000-4000-8000-000000000001'), 'Wish retry preserves original content and pending approval');
insert into public.weddings(slug, groom_name, bride_name, wedding_date, owner_id, status)
values ('new-admin-wedding', 'New', 'Couple', '2027-12-01', '10000000-0000-4000-8000-000000000002', 'active');
select test_support.assert_true((select count(*) from public.weddings where slug = 'new-admin-wedding') = 1, 'Admin can create and activate a wedding for a customer');
update public.weddings set status = 'archived' where slug = 'akram-aisyah';
select test_support.assert_true(public.get_public_wedding('akram-aisyah')->>'state' = 'unavailable', 'Admin status update immediately changes public availability');
select test_support.assert_true(public.get_guest_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001') is null, 'Guest token cannot retrieve RSVP after wedding is archived');
select test_support.assert_true((select count(*) from public.get_public_wishes('20000000-0000-4000-8000-000000000001')) = 0, 'Archived guestbook is not publicly exposed');
select test_support.expect_error($q$select public.submit_rsvp('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Guest A', 'attending', 1)$q$, 'P0001', 'Even existing token cannot update RSVP after archive');
select test_support.expect_error($q$update public.profiles set role = 'admin' where id = '10000000-0000-4000-8000-000000000002'$q$, '42501', 'Even admin browser cannot mutate authorization roles');

reset role;
rollback;
