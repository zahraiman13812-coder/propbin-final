import { NextResponse } from "next/server";
import { Pool } from "pg";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 401 });
  }
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "DATABASE_URL تنظیم نشده است." }, { status: 503 });
  let host = "unknown";
  try { host = new URL(url).hostname; } catch { /* never expose connection string */ }
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 8000 });
  try {
    const result = await pool.query(`SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      current_user AS database_user,
      current_setting('search_path') AS search_path,
      to_regclass('public.article_lottery_submissions')::text AS submissions_table,
      to_regclass('public.article_lottery_entries')::text AS old_entries_table,
      to_regclass('public.article_lottery_settings')::text AS settings_table`);
    return NextResponse.json({ host, ...result.rows[0], note: "این اطلاعات از اتصال واقعی Production سایت خوانده شده‌اند. رمز اتصال نمایش داده نمی‌شود." },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Lottery database diagnostic:", error);
    return NextResponse.json({ error: "اتصال یا خواندن دیتابیس ناموفق بود.", host }, { status: 503 });
  } finally { await pool.end(); }
}
