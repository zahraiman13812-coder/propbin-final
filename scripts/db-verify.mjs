import "./load-env.mjs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const requiredTables = [
  "media_objects", "article_lottery_rounds", "admin_login_limits", "admin_credentials", "site_settings", "site_users", "site_login_codes",
  "user_auth_attempts", "prop_firms", "firm_details", "firm_discounts",
  "articles", "article_image_references", "site_polls", "firm_questions",
  "firm_compare_rows", "support_threads", "support_messages",
  "article_lottery_settings", "article_lottery_entries", "article_lottery_winners",
  "article_lottery_submissions",
];

const requiredColumns = {
  admin_login_limits: ["key", "window_start", "attempts"],
  site_users: ["id", "email", "name", "phone", "password_hash", "recovery_hash", "session_version"],
  site_login_codes: ["email", "hash", "mode", "expires_at", "attempts", "window_start", "requests_in_window"],
  prop_firms: ["id", "name", "discount_intro", "purchase_method", "is_active", "sort_order"],
  firm_discounts: ["id", "firm_id", "code", "amount", "description", "sort_order"],
  articles: ["id", "title", "slug", "body", "image", "status", "published_at"],
  article_lottery_settings: ["id", "enabled", "title", "description", "article_slug", "period", "updated_at"],
  article_lottery_entries: ["id", "user_id", "name", "email", "code", "period", "created_at"],
  article_lottery_winners: ["period", "entry_id", "selected_at"],
  article_lottery_submissions: ["id", "user_id", "name", "email", "period", "images", "status", "issued_code", "admin_note", "created_at", "reviewed_at"],
};

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  application_name: "propbin-db-verifier",
  connectionTimeoutMillis: 10000,
});

let failed = false;
try {
  await client.connect();
  const db = await client.query("SELECT current_database() AS database, current_user AS db_user, current_schema() AS schema");
  console.log(`Connected: database=${db.rows[0].database}; user=${db.rows[0].db_user}; schema=${db.rows[0].schema}`);

  for (const table of requiredTables) {
    const result = await client.query("SELECT to_regclass($1) AS found", [`public.${table}`]);
    if (result.rows[0].found) console.log("OK table", table);
    else { console.error("MISSING table", table); failed = true; }
  }

  for (const [table, columns] of Object.entries(requiredColumns)) {
    const result = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1`,
      [table],
    );
    const found = new Set(result.rows.map((r) => r.column_name));
    for (const column of columns) {
      if (found.has(column)) console.log("OK column", `${table}.${column}`);
      else { console.error("MISSING column", `${table}.${column}`); failed = true; }
    }
  }

  const lotteryUniqueIndexes = [
    ["article_lottery_entries", ["code"]],
    ["article_lottery_entries", ["user_id", "period"]],
    ["article_lottery_submissions", ["user_id", "period"]],
  ];
  for (const [table, columns] of lotteryUniqueIndexes) {
    const result = await client.query(
      `SELECT 1 FROM pg_index i
       JOIN pg_class t ON t.oid=i.indrelid
       JOIN pg_namespace n ON n.oid=t.relnamespace
       WHERE n.nspname='public' AND t.relname=$1
         AND i.indisunique AND i.indisvalid AND i.indpred IS NULL AND i.indexprs IS NULL
         AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
              FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum,ord)
              JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
              WHERE k.ord <= i.indnkeyatts) = $2::text[]`,
      [table, columns],
    );
    const found = result.rowCount > 0;
    if (found) console.log("OK unique index", `${table}(${columns.join(",")})`);
    else { console.error("MISSING unique index", `${table}(${columns.join(",")})`); failed = true; }
  }

  for (const fn of ["reserve_site_login_code", "verify_site_login_code"]) {
    const result = await client.query(
      "SELECT to_regprocedure($1) AS found",
      [fn === "reserve_site_login_code"
        ? "public.reserve_site_login_code(text,text,text,text)"
        : "public.verify_site_login_code(text,text)"],
    );
    if (result.rows[0].found) console.log("OK function", fn);
    else { console.error("MISSING function", fn); failed = true; }
  }

  const singletonChecks = [
    ["site_settings", "id", 1],
    ["admin_credentials", "id", 1],
    ["article_lottery_settings", "id", 1],
  ];
  for (const [table, column, value] of singletonChecks) {
    const result = await client.query(
      `SELECT 1 FROM public.${table} WHERE ${column} = $1 LIMIT 1`,
      [value],
    );
    if (result.rowCount) console.log("OK default row", `${table}.${column}=${value}`);
    else { console.error("MISSING default row", `${table}.${column}=${value}`); failed = true; }
  }

  for (const table of ["wheel_settings", "wheel_prizes", "wheel_spins", "wheel_draws"]) {
    const result = await client.query("SELECT to_regclass($1) AS found", [`public.${table}`]);
    if (!result.rows[0].found) console.log("OK excluded wheel table", table);
    else { console.error("UNWANTED wheel table exists", table); failed = true; }
  }

  const lotteryConsistency = await client.query(
    `SELECT COUNT(*)::int AS broken
     FROM public.article_lottery_submissions s
     LEFT JOIN public.article_lottery_entries e
       ON e.user_id = s.user_id AND e.period = s.period
     WHERE s.status = 'issued'
       AND (e.id IS NULL OR e.code IS DISTINCT FROM s.issued_code)`
  );
  if (lotteryConsistency.rows[0].broken === 0) {
    console.log("OK issued article-lottery submissions match participant entries");
  } else {
    console.error("INCONSISTENT article-lottery issued submissions:", lotteryConsistency.rows[0].broken);
    failed = true;
  }

  const history = await client.query(
    "SELECT filename, applied_at FROM public.app_schema_migrations ORDER BY applied_at, filename",
  );
  console.log(`Migration history: ${history.rowCount} recorded step(s).`);
  for (const row of history.rows) console.log("  -", row.filename);

  if (failed) {
    console.error("DATABASE VERIFICATION FAILED. Do not hand over this database yet.");
    process.exitCode = 1;
  } else {
    console.log("DATABASE VERIFICATION PASSED.");
  }
} catch (error) {
  console.error("Database verification error:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
