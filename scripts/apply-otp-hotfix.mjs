import "./load-env.mjs";
/** Apply ONLY the safe OTP function hotfix. No full schema migrations required. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const filename = 'database/migrations/2026-fix-otp-ambiguous-email.sql';
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Use node --env-file=.env.local scripts/apply-otp-hotfix.mjs locally or a protected server secret.');
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  const db = await client.query('SELECT current_database() AS name, current_user AS username');
  console.log(`Connected to PostgreSQL database: ${db.rows[0].name} (user ${db.rows[0].username})`);
  const sql = await readFile(resolve(process.cwd(), filename), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query(`CREATE TABLE IF NOT EXISTS public.app_schema_migrations
      (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    await client.query(`INSERT INTO public.app_schema_migrations (filename)
      VALUES ($1) ON CONFLICT (filename) DO NOTHING`, [filename]);
    await client.query('COMMIT');
    console.log('OTP hotfix installed successfully; no account or OTP rows deleted.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
} catch (error) {
  console.error('OTP hotfix failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
