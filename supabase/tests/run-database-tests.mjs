import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
let assertions = 0;
const db = new PGlite();
const onNotice = (notice) => {
  if (notice.message.startsWith('ok - ')) {
    assertions += 1;
    console.log(notice.message);
  }
};

try {
  await db.exec(await readFile(path.join(directory, 'bootstrap.sql'), 'utf8'));
  const migrationDirectory = path.join(directory, '..', 'migrations');
  const migrations = (await readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
  for (const migration of migrations) {
    await db.exec(await readFile(path.join(migrationDirectory, migration), 'utf8'));
    console.log(`Applied ${migration}`);
  }
  await db.exec(await readFile(path.join(directory, 'tenant-security.sql'), 'utf8'), { onNotice });
  if (assertions < 40) throw new Error(`Expected at least 40 security assertions, received ${assertions}`);
  console.log(`\nPASS: ${assertions} PostgreSQL security assertions. All fixtures rolled back.`);

  // Seed twice in the disposable engine to verify repeatability and distinct data.
  await db.exec(`
    insert into auth.users(id, raw_user_meta_data)
    values ('10000000-0000-4000-8000-000000000003', '{"display_name":"Seed test admin"}');
    update public.profiles set role = 'admin' where id = '10000000-0000-4000-8000-000000000003';
  `);
  const seed = await readFile(path.join(directory, '..', 'seed.sql'), 'utf8');
  await db.exec(seed);
  await db.exec(seed);
  const { rows } = await db.query('select slug, groom_name, venue_name, story, schedule from public.weddings order by slug');
  if (rows.length !== 2 || rows[0].slug !== 'akram-aisyah' || rows[1].slug !== 'amir-nurul'
    || rows[0].groom_name === rows[1].groom_name || rows[0].venue_name === rows[1].venue_name
    || JSON.stringify(rows[0].story) === JSON.stringify(rows[1].story)
    || JSON.stringify(rows[0].schedule) === JSON.stringify(rows[1].schedule)) {
    throw new Error('Demo seeds must be repeatable and contain two different wedding configurations');
  }
  console.log('PASS: demo seeds can run twice and retain two distinct wedding configurations.');
  console.log('Uses actual PostgreSQL RLS through PGlite; hosted Supabase Auth/HTTP are not simulated integration coverage.');
} finally {
  await db.close();
}
