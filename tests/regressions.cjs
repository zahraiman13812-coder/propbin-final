// Run: node --test tests/regressions.cjs (no live database or email required).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = process.env.REGRESSION_SOURCE_ROOT || path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(js, { exports, Buffer, TextDecoder, Uint8Array, console: { error() {} }, process,
    require(name) { if (name in mocks) return mocks[name]; if (name === "@/lib/request-body") return load("lib/request-body.ts", mocks); throw Error(`Unexpected import ${name}`); },
  }, { filename: file });
  return exports;
}
const next = { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status || 200 }) } };
const guard = { validOrigin: () => true };
const user = { id: 'user-1', name: 'Test', email: 'test@example.com' };
const req = body => new Request("https://example.com/api", { method: "POST", body: JSON.stringify(body) });

test('user statistics use the active lottery table and preserve review counts', async () => {
  const api = load('app/api/admin/users/route.ts', {
    'next/server': next, '@/lib/auth': { isAdmin: async () => true },
    '@/lib/user-auth': { listUsers: async () => [user] },
    '@/lib/supabase-admin': { getSupabaseAdmin: () => ({ from(table) {
      assert.ok(['site_polls', 'article_lottery_entries'].includes(table));
      return { select: async () => ({ data: [{ user_id: user.id, created_at: '2026-01-01' }] }) };
    } }) },
  });
  const result = await api.GET();
  assert.equal(result.status, 200);
  assert.equal(result.body.users[0].reviews, 1);
  assert.equal(result.body.users[0].spins, 1);
});
for (const action of ['approve', 'reject']) {
  test(`${action} cannot overwrite a concurrently issued code`, async () => {
    let status = 'approved';
    const api = load('app/api/admin/lottery/submissions/route.ts', {
      'next/server': next, '@/lib/guard': guard, '@/lib/auth': { isAdmin: async () => true },
      '@/lib/supabase-admin': { getSupabaseAdmin: () => ({ from() {
        let patch, protectedStatus;
        const q = { select() { return q; }, eq() { return q; }, neq(_, value) { protectedStatus = value; return q; },
          update(value) { patch = value; return q; },
          async maybeSingle() {
            if (!patch) { status = 'issued'; return { data: { status: 'approved' } }; }
            if (status === protectedStatus) return { data: null };
            status = patch.status; return { data: { id: 'test' } };
          },
          then(resolve) { if (patch) status = patch.status; resolve({ error: null }); },
        }; return q;
      } }) },
    });
    const result = await api.PATCH(req({ id: '12345678-1234-1234-1234-123456789abc', action }));
    assert.equal(result.status, 409);
    assert.equal(status, 'issued');
  });
}
test('demo users cannot create real polls', async () => {
  let writes = 0;
  const api = load('app/api/polls/route.ts', {
    'next/server': next, 'next/cache': { revalidatePath() {} }, '@/lib/guard': guard,
    '@/lib/auth': { isAdmin: async () => false },
    '@/lib/user-auth': { getCurrentUser: async () => user, isDemoUser: () => true },
    '@/lib/supabase-firms': { getActivePropFirms: async () => [{ id: 'firm-1' }] },
    '@/lib/supabase-polls': { addPoll: async () => { writes++; } },
  });
  const result = await api.POST(req({ firmId: 'firm-1', trust: 5, support: 5, payout: 5, rules: 5, comment: '' }));
  assert.equal(result.status, 403); assert.equal(writes, 0);
});
function submissionApi() {
  let writes = 0;
  return { get writes() { return writes; }, api: load('app/api/lottery/submission/route.ts', {
    'next/server': next, '@/lib/guard': guard,
    '@/lib/user-auth': { getCurrentUser: async () => user, isDemoUser: () => false },
    '@/lib/supabase-admin': { withDatabaseTransaction: async callback => callback({ query: async sql => {
      if (sql.startsWith('SELECT')) return { rows: [{ enabled: true, period: 'test' }] };
      writes++; return { rows: [{ id: 'new' }] };
    } }) },
  }) };
}
test('text disguised as an image never reaches the database', async () => {
  const state = submissionApi();
  const result = await state.api.POST(req({ images: ['data:image/png;base64,' + Buffer.from('not an image').toString('base64')] }));
  assert.equal(result.status, 400); assert.equal(state.writes, 0);
});
test('valid PNG passes the signature check', async () => {
  const state = submissionApi();
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aet8AAAAASUVORK5CYII=';
  const result = await state.api.POST(req({ period: 'test', images: ['data:image/png;base64,' + png] }));
  assert.equal(result.status, 200); assert.equal(state.writes, 1);
});
test('null JSON returns a clean validation response', async () => {
  const state = submissionApi();
  const result = await state.api.POST(req(null));
  assert.equal(result.status, 400); assert.equal(state.writes, 0);
  assert.ok(!result.body.error.includes('null'));
});
test('migration runner never sends nested transaction markers, including after SQL comments', async () => {
  let sql = fs.readFileSync(path.join(root, 'scripts/migrate-db.mjs'), 'utf8');
  sql = sql.replace(/^import .*;\s*$/gm, '');
  let migrations = 0;
  class Client {
    async connect() {} async end() {}
    async query(text) {
      if (text.includes('CREATE EXTENSION')) {
        assert.ok(!/^\s*(?:BEGIN|COMMIT)\s*;/mi.test(text), 'Nested transaction marker');
        migrations++;
      }
      return { rowCount: 0, rows: [] };
    }
  }
  const proc = { env: { DATABASE_URL: 'test-only' }, cwd: () => root, exitCode: 0 };
  await vm.runInNewContext(`(async () => { ${sql} })()`, {
    process: proc, pg: { Client }, resolve: path.resolve,
    readFile: fs.promises.readFile, console: { log() {}, error() {} },
  });
  assert.equal(proc.exitCode, 0); assert.ok(migrations >= 2);
});
for (const provider of ['gmail', 'resend', 'missing']) {
  test(`preflight handles ${provider} email configuration`, () => {
    const vars = { DATABASE_URL: 'postgres://localhost/test', NEXT_PUBLIC_SITE_URL: 'https://example.com',
      ADMIN_PASSWORD: 'long-test-only-password', ADMIN_SESSION_SECRET: 'a'.repeat(32), USER_AUTH_SECRET: 'b'.repeat(32) };
    if (provider === 'gmail') Object.assign(vars, { GMAIL_USER: 'test@gmail.com', GMAIL_APP_PASSWORD: 'test-only-app-password' });
    if (provider === 'resend') Object.assign(vars, { RESEND_API_KEY: 're_test', MAIL_FROM: 'test@example.com' });
    let script = fs.readFileSync(path.join(root, 'scripts/preflight-handover.mjs'), 'utf8').replace(/^import .*;\s*$/gm, '');
    const proc = { argv: [], cwd: () => root };
    vm.runInNewContext(script, { process: proc, URL, resolve: path.resolve,
      readFileSync: () => Object.entries(vars).map(([k,v]) => `${k}=${v}`).join('\n'),
      console: { error() {}, log() {} },
    });
    assert.equal(proc.exitCode, provider === 'missing' ? 1 : 0);
  });
}
