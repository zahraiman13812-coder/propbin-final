
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string; name: string | null; email: string | null; period: string;
  images: unknown; status: "pending" | "approved" | "rejected" | "issued";
  issued_code: string | null; admin_note: string | null; created_at: string;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  if (!(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 401);
  }

  try {
    // Return small authenticated image URLs instead of megabytes of base64 per row.
    const data = await withDatabaseTransaction(async client => {
      const result = await client.query(`SELECT id,user_id,name,email,period,status,issued_code,admin_note,created_at,reviewed_at,
        CASE WHEN jsonb_typeof(images)='array' THEN jsonb_array_length(images) ELSE 0 END AS image_count
        FROM public.article_lottery_submissions ORDER BY created_at DESC LIMIT 200`);
      return result.rows.map(row => ({ ...row, images: Array.from({ length: row.image_count }, (_, index) =>
        `/api/admin/lottery/submissions/${row.id}/images/${index}`) }));
    });

    const submissions = (data || []).map((row: SubmissionRow) => ({
      ...row,
      name: row.name?.trim() || row.email?.split("@")[0] || "کاربر پراپ‌بین",
      images: Array.isArray(row.images)
        ? row.images
        : typeof row.images === "string"
          ? (() => { try { const parsed = JSON.parse(row.images); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })()
          : [],
    }));
    return json({ submissions });
  } catch (error) {
    console.error("Admin lottery submissions GET:", error);
    return json({ error: error && typeof error === "object" && "code" in error && error.code === "42P01"
      ? "جدول ثبت تصاویر در دیتابیس Production یافت نشد. صفحه عیب‌یابی مدیر را بررسی کنید."
      : "دریافت درخواست‌ها ناموفق بود." }, 503);
  }
}


// Explicit, idempotent repair for older issued requests whose participant row
// was never created. Do not modify pre-existing entries or generate new codes.
export async function POST(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 403);
  }
  try {
    const result = await withDatabaseTransaction(async (client) => {
      const issued = await client.query(`
        SELECT s.id, s.user_id, s.name, s.email, s.period, s.issued_code
        FROM public.article_lottery_submissions s
        LEFT JOIN public.article_lottery_entries e
          ON e.user_id = s.user_id AND e.period = s.period
        WHERE s.status = 'issued' AND s.issued_code IS NOT NULL AND e.id IS NULL
        ORDER BY s.created_at FOR UPDATE OF s
      `);
      let inserted = 0;
      for (const row of issued.rows) {
        const found = await client.query(
          `INSERT INTO public.article_lottery_entries
            (user_id, name, email, code, period, created_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (user_id, period) DO NOTHING RETURNING id`,
          [row.user_id, row.name || row.email?.split('@')[0] || 'کاربر پراپ‌بین',
           row.email, row.issued_code, row.period]
        );
        inserted += found.rowCount ?? 0;
      }
      return { missing: issued.rowCount ?? 0, inserted };
    });
    return json({ ok: true, ...result, message: `${result.inserted} شرکت‌کننده به فهرست اصلی برگردانده شد.` });
  } catch (error) {
    console.error('Lottery participant reconciliation failed:', error);
    return json({ error: 'همگام‌سازی انجام نشد؛ ممکن است کد تکراری باشد. هیچ تغییر ناقصی ذخیره نشد.' }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 403);
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "اطلاعات نامعتبر است." }, 400);
    }

    const id = typeof body.id === "string" ? body.id : "";
    const action = body.action;
    const note = typeof body.note === "string"
      ? body.note.trim().slice(0, 500)
      : "";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return json({ error: "شناسه درخواست معتبر نیست." }, 400);
    }

    const db = getSupabaseAdmin();

    const { data: submission, error: lookupError } = await db
      .from("article_lottery_submissions")
      .select("id,status,issued_code")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!submission) return json({ error: "درخواست پیدا نشد." }, 404);

    if (action === "approve" || action === "reject") {
      // Check the current status in the UPDATE, not only in the earlier lookup.
      const { data: changed, error } = await db
        .from("article_lottery_submissions")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_note: note || (action === "reject" ? "درخواست توسط مدیر رد شد." : null),
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .neq("status", "issued")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!changed) {
        return json({ error: "درخواست حذف شده یا کد آن قبلاً صادر شده است. صفحه را تازه کنید." }, 409);
      }
      return json({ ok: true, message: action === "approve" ? "درخواست تأیید شد." : "درخواست رد شد." });
    }

    if (action === "issue") {
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (code.length < 4 || code.length > 60) {
        return json({ error: "کد باید بین ۴ تا ۶۰ کاراکتر باشد." }, 400);
      }

      const result = await withDatabaseTransaction(async (client) => {
        const locked = await client.query(
          `SELECT id, user_id, name, email, period, status, issued_code
           FROM public.article_lottery_submissions
           WHERE id = $1
           FOR UPDATE`,
          [id]
        );
        const row = locked.rows[0] as {
          id: string; user_id: string; name: string; email: string;
          period: string; status: string; issued_code: string | null;
        } | undefined;

        if (!row) return { kind: "missing" as const };
        if (row.status !== "approved") {
          if (row.status === "issued" && row.issued_code === code) {
            const existing = await client.query(
              `SELECT id FROM public.article_lottery_entries
               WHERE user_id = $1 AND period = $2`,
              [row.user_id, row.period]
            );
            return existing.rowCount
              ? { kind: "already-issued" as const, entryId: existing.rows[0].id }
              : { kind: "conflict" as const };
          }
          return { kind: "conflict" as const };
        }

        // The canonical participant table powers the admin list and winner selection.
        const participant = await client.query(
          `INSERT INTO public.article_lottery_entries
             (user_id, name, email, code, period, created_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (user_id, period)
           DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             code = EXCLUDED.code
           RETURNING id`,
          [row.user_id, row.name?.trim() || row.email?.split("@")[0] || "کاربر پراپ‌بین", row.email, code, row.period]
        );

        await client.query(
          `UPDATE public.article_lottery_submissions
           SET status = 'issued', issued_code = $2, admin_note = $3, reviewed_at = now()
           WHERE id = $1 AND status = 'approved'`,
          [id, code, note || null]
        );

        return { kind: "issued" as const, entryId: participant.rows[0].id };
      });

      if (result.kind === "missing") return json({ error: "درخواست پیدا نشد." }, 404);
      if (result.kind === "conflict") {
        return json({ error: "وضعیت درخواست تغییر کرده یا این کد قبلاً صادر شده است. صفحه را تازه کنید." }, 409);
      }

      return json({
        ok: true,
        code,
        entryId: result.entryId,
        message: result.kind === "already-issued"
          ? "این کد قبلاً صادر شده و شرکت‌کننده در فهرست اصلی موجود است."
          : "کد صادر شد و شرکت‌کننده به فهرست اصلی قرعه‌کشی اضافه شد.",
      });
    }

    return json({ error: "عملیات نامعتبر است." }, 400);
  } catch (error) {
    console.error("Admin lottery submissions PATCH:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return json({ error: "این کد قبلاً برای شرکت‌کننده دیگری ثبت شده است. کد دیگری انتخاب کنید." }, 409);
    }
    return json({ error: "انجام عملیات ناموفق بود." }, 503);
  }
}
