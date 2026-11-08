const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeLoader } = require('./load-module');
const next = { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status || 200, headers: opts.headers, cookies: { set() {} } }) } };
test('request byte limit applies without Content-Length', async () => {
  const { readBoundedJson } = makeLoader()('lib/request-body.ts');
  const req = new Request('https://example.com', { method: 'POST', body: JSON.stringify({ value: 'x'.repeat(100) }) });
  await assert.rejects(readBoundedJson(req, 50), e => e.status === 413);
});
test('request limit counts UTF-8 bytes and rejects invalid JSON', async () => {
  const { readBoundedJson } = makeLoader()('lib/request-body.ts');
  await assert.rejects(readBoundedJson(new Request('https://example.com', { method: 'POST', body: '"سلام"' }), 6), e => e.status === 413);
  await assert.rejects(readBoundedJson(new Request('https://example.com', { method: 'POST', body: '{bad' }), 100), e => e.status === 400);
});
test('CSRF checks scheme, credentials and forged forwarded host', () => {
  const { validOrigin } = makeLoader({}, { NEXT_PUBLIC_SITE_URL: 'https://example.com' })('lib/guard.ts');
  function check(origin, extra = {}) { return validOrigin(new Request('http://internal/api', { headers: { host: 'example.com', origin, ...extra } })); }
  assert.equal(check('https://example.com'), true);
  for (const origin of ['http://example.com', 'null', 'https://evil.example', 'https://u:p@example.com', 'https://example.com/path']) assert.equal(check(origin), false);
  assert.equal(check('https://evil.example', { 'x-forwarded-host': 'evil.example' }), false);
});
test('uploaded branding URL is accepted only on this site and known path', () => {
  const { isSafeSiteImage } = makeLoader({}, { NEXT_PUBLIC_SITE_URL: 'https://example.com' })('lib/site-ui.ts');
  const path = '/uploads/branding-images/branding/12345678-1234-1234-1234-123456789abc.png';
  assert.equal(isSafeSiteImage(path), true);
  assert.equal(isSafeSiteImage('https://example.com' + path), true);
  assert.equal(isSafeSiteImage('https://evil.example' + path), false);
  assert.equal(isSafeSiteImage('https://example.com' + path + '?x=1'), false);
  assert.equal(isSafeSiteImage('/uploads/branding-images/branding/x.svg'), false);
});
test('canonical origin drops path, query and trailing slash', () => {
  const { siteOrigin } = makeLoader({}, { NEXT_PUBLIC_SITE_URL: 'https://example.com/path?q=1' })('lib/site-origin.ts');
  assert.equal(siteOrigin(), 'https://example.com');
});
test('security headers and private route noindex are configured', async () => {
  const config = makeLoader({}, { NEXT_PUBLIC_SITE_URL: 'https://example.com:8443' })('next.config.ts').default;
  const rows = await config.headers();
  assert.ok(rows[0].headers.some(h => h.key === 'Content-Security-Policy' && h.value.includes("frame-ancestors 'none'")));
  assert.ok(rows.some(r => r.source === '/account/:path*' && r.headers[0].value.includes('noindex')));
  assert.equal(config.images.remotePatterns[0].port, '8443');
});
for (const body of [null, {}, { password: 'x'.repeat(129) }]) {
  test('admin login rejects malformed input before hashing', async () => {
    let called = false;
    const api = makeLoader({ 'next/server': next, '@/lib/guard': { validOrigin: () => true },
      '@/lib/auth': { authenticateAdmin() { called = true; } },
      '@/lib/admin-login-limit': { reserveAdminLoginAttempt: async () => true },
    })('app/api/auth/route.ts');
    const res = await api.POST(new Request('https://example.com/api/auth', { method: 'POST', body: JSON.stringify(body) }));
    assert.equal(res.status, 400); assert.equal(called, false);
  });
}
test('admin limit returns 429 and Retry-After without checking password', async () => {
  const api = makeLoader({ 'next/server': next, '@/lib/guard': { validOrigin: () => true },
    '@/lib/auth': { authenticateAdmin() { throw Error('must not run'); } },
    '@/lib/admin-login-limit': { reserveAdminLoginAttempt: async () => false },
  })('app/api/auth/route.ts');
  const res = await api.POST(new Request('https://example.com/api/auth', { method: 'POST', body: JSON.stringify({ password: 'test' }) }));
  assert.equal(res.status, 429); assert.equal(res.headers['Retry-After'], '60');
});
test('sitemap includes active firms and published articles', async () => {
  const db = { from(table) { const q = { select() { return q; }, eq(column, value) {
    assert.equal(column, table === 'articles' ? 'status' : 'is_active'); assert.equal(value, table === 'articles' ? 'published' : true); return q;
  }, order() { return q; }, async limit() { return { data: table === 'articles' ? [{ slug: 'article' }] : [{ id: 'firm' }] }; } }; return q; } };
  const sitemap = makeLoader({ '@/lib/supabase-admin': { getSupabaseAdmin: () => db } }, { NEXT_PUBLIC_SITE_URL: 'https://example.com' })('app/sitemap.ts').default;
  const rows = await sitemap();
  assert.ok(rows.some(r => r.url === 'https://example.com/firms/firm'));
  assert.ok(rows.some(r => r.url === 'https://example.com/articles/article'));
});
test('admin session binds to the password version that was actually verified', async () => {
  let reads = 0;
  const row = { password_hash: null, session_version: 7 };
  const db = { from() { const q = { select() { return q; }, eq() { return q; }, single: async () => { reads++; return { data: { ...row } }; } }; return q; } };
  const auth = makeLoader({ '@/lib/supabase-admin': { getSupabaseAdmin: () => db }, 'next/headers': { cookies: async () => ({ get() {} }) } }, {
    ADMIN_PASSWORD: 'test-only-password', ADMIN_SESSION_SECRET: 'a'.repeat(32),
  })('lib/auth.ts');
  const token = await auth.authenticateAdmin('test-only-password');
  assert.equal(token.split('.')[1], '7'); assert.equal(reads, 1);
});
test('support markRead rejects a cross-site GET before touching data', async () => {
  const route = makeLoader({ 'next/server': next, '@/lib/guard': { validOrigin: () => false },
    '@/lib/auth': { isAdmin() { throw Error('must not run'); } }, '@/lib/support': {}, '@/lib/user-auth': {},
  })('app/api/support/route.ts');
  const response = await route.GET({ nextUrl: new URL('https://example.com/api/support?markRead=1'), headers: new Headers({ 'sec-fetch-site': 'cross-site' }) });
  assert.equal(response.status, 403);
});

test('lottery evidence requires admin authentication and cannot be cached', async () => {
  let reads = 0;
  const route = makeLoader({ 'next/server': { NextResponse: Response },
    '@/lib/auth': { isAdmin: async () => false },
    '@/lib/supabase-admin': { withDatabaseTransaction: async () => { reads++; } },
  })('app/api/admin/lottery/submissions/[id]/images/[index]/route.ts');
  const response = await route.GET(new Request('https://example.com'), { params: Promise.resolve({ id: '12345678-1234-1234-1234-123456789abc', index: '0' }) });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(reads, 0);
});
test('lottery evidence is served individually after admin authentication', async () => {
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aet8AAAAASUVORK5CYII=';
  const route = makeLoader({ 'next/server': { NextResponse: Response },
    '@/lib/auth': { isAdmin: async () => true },
    '@/lib/supabase-admin': { withDatabaseTransaction: callback => callback({ query: async (sql,args) => {
      assert.equal(args[1],0); return { rows: [{ image: 'data:image/png;base64,'+png }] };
    } }) },
  })('app/api/admin/lottery/submissions/[id]/images/[index]/route.ts');
  const response = await route.GET(new Request('https://example.com'), { params: Promise.resolve({ id: '12345678-1234-1234-1234-123456789abc', index: '0' }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(png,'base64'));
});
