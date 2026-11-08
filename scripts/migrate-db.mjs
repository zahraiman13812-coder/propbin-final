import "./load-env.mjs";
/**
 * Fresh-install and upgrade-safe PostgreSQL migration runner for Propbin.
 * Runs only schema + structural migrations. It deliberately does NOT seed demo firms.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const steps = [
  "database/schema.sql",
  "database/migrations/2026-password-auth.sql",
  "database/migrations/2026-email-otp-auth.sql",
  "database/migrations/2026-fix-otp-ambiguous-email.sql",
  "database/migrations/2026-firm-review-details.sql",
  "database/migrations/2026-firm-questions-and-comparison.sql",
  "database/migrations/2026-multiple-discounts.sql",
  "database/migrations/2026-allow-repeated-discount-codes.sql",
  "database/migrations/2026-firm-purchase-method.sql",
  "database/migrations/2026-lottery-complete.sql",
  "database/migrations/2026-article-lottery-issued-entry-sync.sql",
  "database/migrations/2026-security-and-query-indexes.sql",
  "database/migrations/2026-multiple-article-lottery-rounds.sql",
  "database/migrations/2026-persistent-media.sql",
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required. No changes made.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  application_name: "propbin-db-migrator",
  connectionTimeoutMillis: 10000,
});

try {
  await client.connect();
  // Serialize concurrent deploys before checking migration history. Released on disconnect.
  await client.query("SELECT pg_advisory_lock(732846102)");
  await client.query(`CREATE TABLE IF NOT EXISTS public.app_schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  for (const filename of steps) {
    const existing = await client.query(
      "SELECT 1 FROM public.app_schema_migrations WHERE filename = $1",
      [filename],
    );
    if (existing.rowCount) {
      console.log("SKIP", filename);
      continue;
    }

    let sql = await readFile(resolve(process.cwd(), filename), "utf8");
    // The legacy lottery file has transaction markers and a trailing diagnostic SELECT.
    // Strip only its outer transaction markers; the runner owns the transaction.
    if (filename.endsWith("2026-lottery-complete.sql")) {
      sql = sql.replace(/^[ \t]*BEGIN[ \t]*;[ \t]*$/gmi, "").replace(/^[ \t]*COMMIT[ \t]*;[ \t]*$/gmi, "");
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO public.app_schema_migrations(filename) VALUES ($1)",
        [filename],
      );
      await client.query("COMMIT");
      console.log("OK", filename);
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration failed: ${filename}: ${error.message}`, { cause: error });
    }
  }

  console.log("Database migrations complete.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
