// Database tests for the Supabase migrations: schema, triggers and Row Level Security.
// Runs the real migration SQL in PGlite (Postgres compiled to WebAssembly) on top of a
// small Supabase stand-in, then acts as different users to check who can see and do what.
//
// Run with: npm run test:db

import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';

const here = new URL('.', import.meta.url);
const migrationsDir = new URL('../migrations/', import.meta.url);

/** @type {PGlite} */
let db;
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

/** Run SQL as a role: 'anon', 'service_role', or a signed-in user id. */
async function as(who, sql, params = []) {
  await db.exec('reset role');
  if (who === 'anon' || who === 'service_role') {
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
    await db.exec(`set role ${who}`);
  } else {
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who]);
    await db.exec('set role authenticated');
  }
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}

/** Expect a statement to be rejected by Postgres with a message matching `pattern`. */
async function rejects(promise, pattern) {
  await assert.rejects(promise, (e) => {
    assert.match(e.message, pattern);
    return true;
  });
}

const RLS = /row-level security/;
const DENIED = /permission denied/;

async function insertReport(who, overrides = {}) {
  const r = {
    scheme_type: 'investment_ponzi',
    platform: 'facebook',
    description: 'Promised to double my kina in a week if I bought their coin.',
    latitude: -9.4438,
    longitude: 147.1803,
    ...overrides,
  };
  const res = await as(
    who,
    `insert into public.reports (scheme_type, platform, description, latitude, longitude${'status' in r ? ', status' : ''})
     values ($1, $2, $3, $4, $5${'status' in r ? ', $6' : ''}) returning id, status`,
    [r.scheme_type, r.platform, r.description, r.latitude, r.longitude, ...('status' in r ? [r.status] : [])]
  );
  return res.rows[0];
}

before(async () => {
  db = new PGlite();
  await db.exec(readFileSync(new URL('supabase-stub.sql', here), 'utf8'));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'));
  }
});

after(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec('reset role');
  await db.exec('delete from storage.objects; delete from auth.users;');
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'a@example.com', '{"display_name":"Kila"}'),
       ($2, 'b@example.com', '{"display_name":"Mary"}')`,
    [A, B]
  );
});

describe('sign-up trigger', () => {
  it('creates a profile with the display name from sign-up', async () => {
    const { rows } = await db.query('select id, display_name from public.profiles order by display_name');
    assert.deepEqual(rows, [
      { id: A, display_name: 'Kila' },
      { id: B, display_name: 'Mary' },
    ]);
  });

  it('falls back to "New user" for a missing or too-short name', async () => {
    const id = '00000000-0000-4000-8000-0000000000c1';
    await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, '{"display_name":" x "}')`, [id]);
    const { rows } = await db.query('select display_name from public.profiles where id = $1', [id]);
    assert.equal(rows[0].display_name, 'New user');
  });

  it('truncates a name longer than 40 characters instead of failing sign-up', async () => {
    const id = '00000000-0000-4000-8000-0000000000c2';
    await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [
      id,
      JSON.stringify({ display_name: 'K'.repeat(60) }),
    ]);
    const { rows } = await db.query('select display_name from public.profiles where id = $1', [id]);
    assert.equal(rows[0].display_name, 'K'.repeat(40));
  });

  it('deletes everything a user owns when the account is deleted', async () => {
    await insertReport(A);
    await as(A, `insert into public.checks (input, type, score, risk_level) values ('x.com', 'url', 10, 'low')`);
    await db.query('delete from auth.users where id = $1', [A]);
    for (const table of ['profiles', 'checks', 'reports']) {
      const col = table === 'profiles' ? 'id' : 'user_id';
      const { rows } = await db.query(`select count(*)::int as n from public.${table} where ${col} = $1`, [A]);
      assert.equal(rows[0].n, 0, table);
    }
  });
});

describe('profiles', () => {
  it('signed-in users can read every display name', async () => {
    const { rows } = await as(A, 'select display_name from public.profiles order by display_name');
    assert.deepEqual(rows.map((r) => r.display_name), ['Kila', 'Mary']);
  });

  it('users can change their own display name only', async () => {
    const own = await as(A, `update public.profiles set display_name = 'Kila T' where id = $1`, [A]);
    assert.equal(own.affectedRows, 1);
    const other = await as(A, `update public.profiles set display_name = 'Hacked' where id = $1`, [B]);
    assert.equal(other.affectedRows, 0);
    const { rows } = await db.query('select display_name from public.profiles where id = $1', [B]);
    assert.equal(rows[0].display_name, 'Mary');
  });

  it('users cannot change their id or timestamps', async () => {
    await rejects(as(A, `update public.profiles set created_at = now() - interval '1 year' where id = $1`, [A]), DENIED);
  });

  it('rejects display names outside 2–40 characters', async () => {
    await rejects(as(A, `update public.profiles set display_name = 'K' where id = $1`, [A]), /check constraint/);
  });

  it('updates updated_at automatically', async () => {
    const before = (await db.query('select updated_at from public.profiles where id = $1', [A])).rows[0].updated_at;
    await new Promise((r) => setTimeout(r, 5));
    await as(A, `update public.profiles set display_name = 'Kila T' where id = $1`, [A]);
    const after = (await db.query('select updated_at from public.profiles where id = $1', [A])).rows[0].updated_at;
    assert.ok(after > before);
  });
});

describe('checks', () => {
  const insertCheck = (who, userId) =>
    as(
      who,
      `insert into public.checks (${userId ? 'user_id, ' : ''}input, type, score, risk_level, signals)
       values (${userId ? '$1, ' : ''}'http://free-airdrop.example', 'url', 70, 'high', '[{"id":"no_https"}]')`,
      userId ? [userId] : []
    );

  it('saves a check for the signed-in user (user_id filled in automatically)', async () => {
    await insertCheck(A);
    const { rows } = await as(A, 'select user_id, score, signals from public.checks');
    assert.deepEqual(rows, [{ user_id: A, score: 70, signals: [{ id: 'no_https' }] }]);
  });

  it('cannot save a check as someone else', async () => {
    await rejects(insertCheck(A, B), RLS);
  });

  it('is private: other users cannot see or delete it', async () => {
    await insertCheck(A);
    assert.equal((await as(B, 'select * from public.checks')).rows.length, 0);
    assert.equal((await as(B, 'delete from public.checks')).affectedRows, 0);
    assert.equal((await as(A, 'delete from public.checks')).affectedRows, 1);
  });

  it('cannot be edited after saving', async () => {
    await insertCheck(A);
    await rejects(as(A, 'update public.checks set score = 0'), DENIED);
  });

  it('validates type, score, risk level and signals', async () => {
    const bad = [
      `('x', 'email', 10, 'low', '[]')`,
      `('x', 'url', 101, 'low', '[]')`,
      `('x', 'url', 10, 'safe', '[]')`,
      `('x', 'url', 10, 'low', '{}')`,
      `('', 'url', 10, 'low', '[]')`,
    ];
    for (const values of bad) {
      await rejects(
        as(A, `insert into public.checks (input, type, score, risk_level, signals) values ${values}`),
        /check constraint/
      );
    }
  });
});

describe('reports', () => {
  it('new reports are pending and owned by the reporter', async () => {
    const r = await insertReport(A);
    assert.equal(r.status, 'pending');
    const { rows } = await db.query('select user_id from public.reports where id = $1', [r.id]);
    assert.equal(rows[0].user_id, A);
  });

  it('a user cannot submit a pre-approved report', async () => {
    await rejects(insertReport(A, { status: 'approved' }), RLS);
  });

  it('pending reports are visible only to their owner', async () => {
    await insertReport(A);
    assert.equal((await as(A, 'select * from public.reports')).rows.length, 1);
    assert.equal((await as(B, 'select * from public.reports')).rows.length, 0);
  });

  it('approved reports are visible to every signed-in user, but not anonymously', async () => {
    const r = await insertReport(A);
    await as('service_role', `update public.reports set status = 'approved' where id = $1`, [r.id]);
    assert.equal((await as(B, 'select * from public.reports')).rows.length, 1);
    await rejects(as('anon', 'select * from public.reports'), DENIED);
  });

  it('users cannot approve their own report', async () => {
    const r = await insertReport(A);
    await rejects(as(A, `update public.reports set status = 'approved' where id = $1`, [r.id]), DENIED);
  });

  it('editing an approved report sends it back to moderation', async () => {
    const r = await insertReport(A);
    await as('service_role', `update public.reports set status = 'approved' where id = $1`, [r.id]);
    await as(A, `update public.reports set description = $2 where id = $1`, [
      r.id,
      'Updated: they now ask for payment in USDT to a Telegram account.',
    ]);
    const { rows } = await db.query('select status from public.reports where id = $1', [r.id]);
    assert.equal(rows[0].status, 'pending');
  });

  it('a moderator changing only the status keeps that status', async () => {
    const r = await insertReport(A);
    await as('service_role', `update public.reports set status = 'rejected' where id = $1`, [r.id]);
    const { rows } = await db.query('select status from public.reports where id = $1', [r.id]);
    assert.equal(rows[0].status, 'rejected');
  });

  it('other users cannot edit or delete a report, even an approved one', async () => {
    const r = await insertReport(A);
    await as('service_role', `update public.reports set status = 'approved' where id = $1`, [r.id]);
    assert.equal((await as(B, `update public.reports set description = repeat('x', 30) where id = $1`, [r.id])).affectedRows, 0);
    assert.equal((await as(B, 'delete from public.reports where id = $1', [r.id])).affectedRows, 0);
    assert.equal((await as(A, 'delete from public.reports where id = $1', [r.id])).affectedRows, 1);
  });

  it('cannot move a report to another user', async () => {
    const r = await insertReport(A);
    await rejects(as(A, `update public.reports set user_id = $2 where id = $1`, [r.id, B]), DENIED);
  });

  it('validates scheme type, platform, description and location', async () => {
    await rejects(insertReport(A, { scheme_type: 'named_person' }), /check constraint/);
    await rejects(insertReport(A, { platform: 'carrier_pigeon' }), /check constraint/);
    await rejects(insertReport(A, { description: 'too short' }), /check constraint/);
    await rejects(insertReport(A, { latitude: 100 }), /check constraint/);
    await rejects(insertReport(A, { longitude: null }), /reports_location_both_or_neither/);
  });

  it('allows a report without any location', async () => {
    const r = await insertReport(A, { latitude: null, longitude: null });
    assert.equal(r.status, 'pending');
  });
});

describe('evidence', () => {
  const addEvidence = (who, reportId, path) =>
    as(who, 'insert into public.evidence (report_id, storage_path) values ($1, $2)', [reportId, path]);

  it('the report owner can attach a screenshot from their own folder', async () => {
    const r = await insertReport(A);
    await addEvidence(A, r.id, `${A}/shot.jpg`);
    assert.equal((await as(A, 'select * from public.evidence')).rows.length, 1);
  });

  it('cannot attach evidence to someone else’s report', async () => {
    const r = await insertReport(A);
    await rejects(addEvidence(B, r.id, `${B}/shot.jpg`), RLS);
  });

  it('cannot point evidence at another user’s file', async () => {
    const r = await insertReport(A);
    await rejects(addEvidence(A, r.id, `${B}/shot.jpg`), RLS);
  });

  it('stays private even when the report is approved', async () => {
    const r = await insertReport(A);
    await addEvidence(A, r.id, `${A}/shot.jpg`);
    await as('service_role', `update public.reports set status = 'approved' where id = $1`, [r.id]);
    assert.equal((await as(B, 'select * from public.evidence')).rows.length, 0);
  });

  it('is deleted with its report', async () => {
    const r = await insertReport(A);
    await addEvidence(A, r.id, `${A}/shot.jpg`);
    await as(A, 'delete from public.reports where id = $1', [r.id]);
    assert.equal((await db.query('select count(*)::int as n from public.evidence')).rows[0].n, 0);
  });

  it('rejects paths that are not "<user id>/<file>"', async () => {
    const r = await insertReport(A);
    // As a user, RLS rejects these first...
    await rejects(addEvidence(A, r.id, 'shot.jpg'), RLS);
    // ...and the format check rejects them even for the service role, which skips RLS.
    await rejects(addEvidence('service_role', r.id, 'shot.jpg'), /check constraint/);
    await rejects(addEvidence('service_role', r.id, `${A}/nested/shot.jpg`), /check constraint/);
  });
});

describe('storage bucket', () => {
  const upload = (who, name) =>
    as(who, `insert into storage.objects (bucket_id, name) values ('evidence', $1)`, [name]);

  it('is private and limited to 5 MB images', async () => {
    const { rows } = await db.query(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'evidence'`);
    assert.deepEqual(rows[0], {
      public: false,
      file_size_limit: 5242880,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    });
  });

  it('users can upload only into their own folder', async () => {
    await upload(A, `${A}/shot.jpg`);
    await rejects(upload(A, `${B}/shot.jpg`), RLS);
    await rejects(upload(A, 'shot.jpg'), RLS);
  });

  it('users can read and delete only their own files', async () => {
    await upload(A, `${A}/shot.jpg`);
    assert.equal((await as(B, 'select * from storage.objects')).rows.length, 0);
    assert.equal((await as(B, 'delete from storage.objects')).affectedRows, 0);
    assert.equal((await as(A, 'select * from storage.objects')).rows.length, 1);
    assert.equal((await as(A, 'delete from storage.objects')).affectedRows, 1);
  });
});

describe('anonymous (signed-out) access', () => {
  it('can read nothing', async () => {
    for (const table of ['profiles', 'checks', 'reports', 'evidence']) {
      await rejects(as('anon', `select * from public.${table}`), DENIED);
    }
  });
});
