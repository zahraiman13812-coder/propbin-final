// Embedded PostgreSQL integration tests; never connects to DATABASE_URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import loader from './load-module.js';
const root = path.resolve(import.meta.dirname, '..');
test('database migrations, OTP, quotas and query adapter', async t => {
  const db = new PGlite({ extensions: { pgcrypto } });
  async function query(sql, params) {
    const result = params?.length ? await db.query(sql, params) : (await db.exec(sql)).at(-1);
    return { rows: result?.rows || [], rowCount: result?.rows?.length || result?.affectedRows || 0 };
  }
  class Pool { on() {} query = query; async connect() { return { query, release() {} }; } }
  class Client { async connect() {} query = query; async end() {} }
  const env = { DATABASE_URL: 'test-only', USER_AUTH_SECRET: 't'.repeat(32), RESEND_API_KEY: 'test-only', MAIL_FROM: 'test@example.com' };
  const load = loader.makeLoader({ pg: { Pool } }, env);
  const { getSupabaseAdmin, withDatabaseTransaction } = load('lib/supabase-admin.ts');
  const api = getSupabaseAdmin();
  async function migrate() {
    const source = (await readFile(path.join(root, 'scripts/migrate-db.mjs'), 'utf8')).replace(/^import .*;\s*$/gm, '');
    const processMock = { env, cwd: () => root, exitCode: 0 };
    await vm.runInNewContext(`(async () => { ${source} })()`, { pg: { Client }, readFile, resolve: path.resolve, process: processMock, console });
    assert.equal(processMock.exitCode, 0);
  }
  try {
    await t.test('all migrations install and a second run preserves data', async () => {
      await migrate();
      await query("INSERT INTO site_users(email,name) VALUES ('keep@example.com','Keep')");
      await migrate();
      assert.equal((await query("SELECT count(*)::int AS n FROM site_users WHERE email='keep@example.com'")).rows[0].n, 1);
    });
    await t.test('database verification accepts the installed schema and indexes', async () => {
      const source = (await readFile(path.join(root, 'scripts/db-verify.mjs'), 'utf8')).replace(/^import .*;\s*$/gm, '');
      const processMock = { env, exitCode: 0 };
      await vm.runInNewContext(`(async () => { ${source} })()`, { pg: { Client }, process: processMock, console });
      assert.equal(processMock.exitCode, 0);
    });
    await t.test('public images persist, enforce size/type, list folders and delete atomically', async () => {
      const bucket = api.storage.from('article-images');
      const bytes = Buffer.from([137,80,78,71,13,10,26,10]);
      assert.equal((await bucket.upload('covers/test.png', bytes, {contentType:'image/png'})).error, null);
      assert.ok((await bucket.upload('covers/test.png', bytes, {contentType:'image/png'})).error);
      const { readMediaObject } = load('lib/supabase-admin.ts');
      const stored = await readMediaObject('article-images','covers/test.png');
      assert.deepEqual(Buffer.from(stored.body), bytes);
      assert.equal(stored.content_type, 'image/png');
      assert.equal(bucket.getPublicUrl('covers/test.png').data.publicUrl, '/uploads/article-images/covers/test.png');
      assert.equal((await bucket.list('covers')).data[0].name, 'test.png');
      assert.equal((await bucket.list('other')).data.length, 0);
      assert.ok((await bucket.upload('../escape.png', bytes, {contentType:'image/png'})).error);
      assert.ok((await bucket.upload('covers/large.png', Buffer.alloc(2097153), {contentType:'image/png'})).error);
      assert.ok((await bucket.upload('covers/x.svg', bytes, {contentType:'image/svg+xml'})).error);
      assert.equal((await bucket.remove(['covers/test.png'])).error, null);
      assert.equal(await readMediaObject('article-images','covers/test.png'), undefined);
    });
    await t.test('lottery rounds are independent and duplicate submissions are rejected', async () => {
      await query("INSERT INTO article_lottery_rounds(period,enabled) VALUES ('round-a',true),('round-b',true)");
      const id = (await query("SELECT id FROM site_users WHERE email='keep@example.com'")).rows[0].id;
      for (const period of ['round-a','round-b']) await query("INSERT INTO article_lottery_submissions(user_id,name,email,period,images) VALUES ($1,'Keep','keep@example.com',$2,'[]')", [id,period]);
      await assert.rejects(query("INSERT INTO article_lottery_submissions(user_id,name,email,period,images) VALUES ($1,'Keep','keep@example.com','round-a','[]')", [id]), e => e.code === '23505');
      assert.equal((await query('SELECT count(*)::int AS n FROM article_lottery_submissions WHERE user_id=$1',[id])).rows[0].n, 2);
    });
    await t.test('query object executes a mutation once even when awaited twice', async () => {
      const q = api.from('site_users').insert({ email: 'once@example.com', name: 'Once' }).select('id').single();
      const a = await q, b = await q;
      assert.equal(a.error, null); assert.equal(b.error, null); assert.equal(a.data.id, b.data.id);
    });
    await t.test('UPDATE exact count does not send excess bind arguments', async () => {
      const result = await api.from('site_users').update({ name: 'Updated' }).eq('email', 'once@example.com').select('id', { count: 'exact' });
      assert.equal(result.error, null); assert.equal(result.count, 1);
    });
    await t.test('boolean IS FALSE differs from IS NOT NULL', async () => {
      await query("INSERT INTO prop_firms(name,is_active) VALUES ('Active',true), ('Hidden',false)");
      const result = await api.from('prop_firms').select('name').is('is_active', false);
      assert.equal(result.error, null); assert.deepEqual(result.data.map(x => x.name), ['Hidden']);
    });
    await t.test('transaction rollback leaves no partial writes', async () => {
      await assert.rejects(withDatabaseTransaction(async client => {
        await client.query("INSERT INTO site_users(email,name) VALUES ('rollback@example.com','Rollback')"); throw Error('forced');
      }));
      assert.equal((await query("SELECT count(*)::int AS n FROM site_users WHERE email='rollback@example.com'")).rows[0].n, 0);
    });
    await t.test('settings patches preserve unrelated edits across admin screens', async () => {
      const { patchSiteSettings } = load('lib/supabase-site-settings.ts');
      await patchSiteSettings({ name: 'Updated title', primaryDark: '#123456' });
      await patchSiteSettings({ logoUrl: '/pb-logo.png' });
      const row = (await query('SELECT settings,site_name FROM site_settings WHERE id=1')).rows[0];
      assert.equal(row.settings.primaryDark, '#123456');
      assert.equal(row.settings.logoUrl, '/pb-logo.png');
      assert.equal(row.site_name, 'Updated title');
    });
    await t.test('public content reads database firms and never reintroduces bundled demo firms', async () => {
      const { getContent } = load('lib/content.ts');
      const content = await getContent();
      assert.deepEqual(content.firms.map(f => f.name), ['Active']);
      assert.equal(content.articles.length, 0);
    });
    await t.test('discount reorder rolls back the first write when the second fails', async () => {
      const firmId = (await query("SELECT id FROM prop_firms WHERE name='Active'")).rows[0].id;
      const rows = (await query("INSERT INTO firm_discounts(firm_id,code,amount,sort_order) VALUES ($1,'a','10',1),($1,'b','20',2) RETURNING id,sort_order", [firmId])).rows;
      let updates = 0;
      const route = loader.makeLoader({
        'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status || 200 }) } },
        '@/lib/auth': { isAdmin: async () => true }, '@/lib/guard': { validOrigin: () => true },
        '@/lib/supabase-admin': { withDatabaseTransaction: callback => withDatabaseTransaction(client => callback({
          query: async (sql, params) => { if (sql.startsWith('UPDATE') && ++updates === 2) throw Error('forced failure'); return client.query(sql, params); },
        })) },
      }, env)('app/api/admin/discount-items/route.ts');
      const response = await route.PATCH(new Request('https://example.com', { method: 'PATCH', body: JSON.stringify({ firmId, orderedIds: rows.map(row => row.id).reverse() }) }));
      assert.equal(response.status, 500);
      const after = (await query('SELECT id,sort_order FROM firm_discounts WHERE firm_id=$1 ORDER BY sort_order', [firmId])).rows;
      assert.deepEqual(after, rows.sort((a,b) => a.sort_order-b.sort_order));
    });
    await t.test('OTP is single use and preserves its resend window', async () => {
      assert.equal((await api.rpc('reserve_site_login_code', { p_email: 'otp@example.com', p_hash: 'hash', p_mode: 'register', p_name: 'OTP' })).data, true);
      const args = { p_email: 'otp@example.com', p_hash: 'hash' };
      const first = await api.rpc('verify_site_login_code', args);
      assert.equal(first.error, null); assert.equal(first.data.length, 1);
      assert.equal((await api.rpc('verify_site_login_code', args)).data.length, 0);
      assert.equal((await api.rpc('reserve_site_login_code', { p_email: 'otp@example.com', p_hash: 'hash2', p_mode: 'login', p_name: null })).data, false);
    });
    await t.test('failed OTP delivery invalidates code without deleting throttle history', async () => {
      let deliveries = 0;
      const auth = loader.makeLoader({ pg: { Pool }, 'next/headers': { cookies: async () => ({ get() {} }) },
        fetch: async () => { deliveries++; return { ok: false, status: 503 }; },
      }, env)('lib/user-auth.ts');
      await assert.rejects(auth.issueLoginCode('failed@example.com', 'register', 'Test User'));
      const row = (await query("SELECT attempts, requests_in_window, expires_at < now() AS expired FROM site_login_codes WHERE email='failed@example.com'")).rows[0];
      assert.equal(row.attempts, 5); assert.equal(row.requests_in_window, 1); assert.equal(row.expired, true);
      await assert.rejects(auth.issueLoginCode('failed@example.com', 'register', 'Test User'), e => e.name === 'LoginCodeThrottled');
      assert.equal(deliveries, 1);
    });
    await t.test('shared admin quota allows 30 attempts then blocks until window expires', async () => {
      const { reserveAdminLoginAttempt } = load('lib/admin-login-limit.ts');
      for (let i = 0; i < 30; i++) assert.equal(await reserveAdminLoginAttempt(), true);
      assert.equal(await reserveAdminLoginAttempt(), false);
      await query("UPDATE admin_login_limits SET window_start=now()-interval '2 minutes'");
      assert.equal(await reserveAdminLoginAttempt(), true);
    });
    await t.test('question quota rejects request 101 and accepts request 100', async () => {
      const firmId = (await query("SELECT id FROM prop_firms WHERE name='Active'")).rows[0].id;
      await query("INSERT INTO firm_questions(firm_id,user_id,question) SELECT $1,'quota-user','valid question' FROM generate_series(1,99)", [firmId]);
      const route = loader.makeLoader({ pg: { Pool }, 'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status || 200 }) } },
        '@/lib/guard': { validOrigin: () => true }, '@/lib/user-auth': { getCurrentUser: async () => ({ id: 'quota-user', name: 'User' }), isDemoUser: () => false },
      }, env)('app/api/firm-questions/route.ts');
      const request = () => new Request('https://example.com', { method: 'POST', body: JSON.stringify({ firmId, question: 'valid question' }) });
      assert.equal((await route.POST(request())).status, 201);
      assert.equal((await route.POST(request())).status, 429);
    });
  } finally { await db.close(); }
});
