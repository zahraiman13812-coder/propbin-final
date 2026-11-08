import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/user-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

function databaseProblem(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/DATABASE_URL|connectionstring|client password|password authentication|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout|certificate|SELF_SIGNED_CERT|no pg_hba/i.test(message)) {
    return "اتصال به پایگاه داده برقرار نشد. DATABASE_URL و تنظیمات اتصال PostgreSQL در سرور را بررسی کنید.";
  }
  if (/admin_credentials/i.test(message)) {
    return "جدول admin_credentials یا رکورد مدیر در پایگاه داده موجود نیست. فایل database/schema.sql را بررسی کنید.";
  }
  if (/site_users|relation .*does not exist|column .*does not exist/i.test(message)) {
    return "ساختار جدول کاربران در پایگاه داده کامل نیست. جدول site_users و ستون‌های آن را بررسی کنید.";
  }
  return "دریافت کاربران از پایگاه داده ناموفق بود. گزارش سرور را بررسی کنید.";
}

export async function GET() {
  // Authentication accesses PostgreSQL too; it must be handled inside try.
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "نشست مدیریت معتبر نیست. از پنل خارج شوید و دوباره وارد شوید." }, { status: 401, headers });
    }

    // User records must never depend on optional statistics queries.
    const users = await listUsers();
    const stats = new Map<string, {
      reviews: number;
      spins: number;
      lastReviewAt: string | null;
      lastSpinAt: string | null;
    }>();
    const ensure = (id: string) => {
      let row = stats.get(id);
      if (!row) {
        row = { reviews: 0, spins: 0, lastReviewAt: null, lastSpinAt: null };
        stats.set(id, row);
      }
      return row;
    };

    // Failure of either optional table must not hide registered users.
    try {
      const db = getSupabaseAdmin();
      const [polls, spins] = await Promise.all([
        db.from("site_polls").select("user_id,created_at"),
        db.from("article_lottery_entries").select("user_id,created_at"),
      ]);
      if (polls.error) console.error("Users statistics: site_polls:", polls.error);
      if (spins.error) console.error("Users statistics: article_lottery_entries:", spins.error);
      for (const poll of (polls.data ?? []) as { user_id: string; created_at: string | null }[]) {
        if (!poll.user_id) continue;
        const stat = ensure(poll.user_id);
        stat.reviews++;
        if (poll.created_at && (!stat.lastReviewAt || poll.created_at > stat.lastReviewAt)) stat.lastReviewAt = poll.created_at;
      }
      for (const spin of (spins.data ?? []) as { user_id: string; created_at: string | null }[]) {
        if (!spin.user_id) continue;
        const stat = ensure(spin.user_id);
        stat.spins++;
        if (spin.created_at && (!stat.lastSpinAt || spin.created_at > stat.lastSpinAt)) stat.lastSpinAt = spin.created_at;
      }
    } catch (error) {
      console.error("Users optional statistics failed:", error);
    }

    return NextResponse.json({
      users: users.map(user => ({
        ...user,
        ...(stats.get(user.id) ?? { reviews: 0, spins: 0, lastReviewAt: null, lastSpinAt: null }),
      })),
      total: users.length,
    }, { headers });
  } catch (error) {
    console.error("Admin users GET failed:", error);
    return NextResponse.json({ error: databaseProblem(error) }, { status: 500, headers });
  }
}
