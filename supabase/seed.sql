-- Optional demo data. Run AFTER creating an Auth user and promoting that profile
-- to admin using the trusted SQL instructions in docs/database.md.
-- Existing weddings are never overwritten. Both initially belong to the admin;
-- assign separate customer owners from the admin editor or trusted SQL.
begin;
do $$
declare demo_owner uuid;
begin
  select id into demo_owner from public.profiles where role = 'admin' order by created_at, id limit 1;
  if demo_owner is null then
    raise exception 'Create an Auth user and promote its profile to admin before running demo seeds';
  end if;

  insert into public.weddings(id, owner_id, slug, groom_name, bride_name, wedding_date,
    start_time, end_time, venue_name, venue_address, google_maps_url, waze_url,
    theme, template, status, story, schedule, settings, expires_at)
  values (
    'a0000000-0000-4000-8000-000000000001', demo_owner, 'akram-aisyah', 'Akram', 'Aisyah', '2027-02-20',
    '11:00', '16:00', 'The Glasshouse', 'Seputeh, Kuala Lumpur, Malaysia',
    'https://www.google.com/maps/search/?api=1&query=Glasshouse+Seputeh+Kuala+Lumpur',
    'https://waze.com/ul?q=Glasshouse%20Seputeh%20Kuala%20Lumpur&navigate=yes',
    'sage', 'garden', 'active',
    '[{"year":"2022","title":"An unexpected hello","description":"Our story began in Kuala Lumpur, over coffee and a conversation that never seemed to end."},{"year":"2025","title":"A promise together","description":"With our families beside us, we chose a lifetime of little adventures."},{"year":"2027","title":"Our wedding day","description":"Join us in the garden as we begin our next chapter."}]',
    '[{"time":"11:00 AM","title":"Guest arrival","detail":"Welcome to our garden celebration."},{"time":"12:00 PM","title":"Bride and groom arrival","detail":"Celebrate our entrance with our families."},{"time":"12:30 PM","title":"Lunch reception","detail":"Jemput makan! Enjoy a meal together."},{"time":"4:00 PM","title":"Until we meet again","detail":"Thank you for your love and prayers."}]',
    '{"title":"Akram & Aisyah","timezone":"Asia/Kuala_Lumpur","utc_offset":"+08:00","default_volume":0.3,"max_guests":5}',
    '2028-02-20T23:59:59+08:00'
  ), (
    'b0000000-0000-4000-8000-000000000002', demo_owner, 'amir-nurul', 'Amir', 'Nurul', '2027-06-12',
    '12:00', '17:00', 'Taman Botani Reception Hall', 'Putrajaya, Malaysia',
    'https://www.google.com/maps/search/?api=1&query=Taman+Botani+Putrajaya',
    'https://waze.com/ul?q=Taman%20Botani%20Putrajaya&navigate=yes',
    'rose', 'garden', 'active',
    '[{"year":"2021","title":"A shared beginning","description":"We first met through friends, with a shared love of books and weekend walks."},{"year":"2026","title":"Our families, together","description":"A joyful engagement brought our families together."},{"year":"2027","title":"A new chapter","description":"We cannot wait to celebrate our wedding with you in Putrajaya."}]',
    '[{"time":"12:00 PM","title":"Welcome and refreshments","detail":"Our families welcome you to Putrajaya."},{"time":"1:00 PM","title":"The happy couple arrives","detail":"A special entrance to begin our celebration."},{"time":"1:30 PM","title":"Wedding lunch","detail":"Share a meal and your favourite memories."},{"time":"3:00 PM","title":"Family photographs","detail":"Capture a moment with the people we love."},{"time":"5:00 PM","title":"Farewell","detail":"Thank you for celebrating with us."}]',
    '{"title":"Amir & Nurul","timezone":"Asia/Kuala_Lumpur","utc_offset":"+08:00","default_volume":0.25,"max_guests":5}',
    '2028-06-12T23:59:59+08:00'
  ) on conflict (slug) do nothing;
end;
$$;
commit;
