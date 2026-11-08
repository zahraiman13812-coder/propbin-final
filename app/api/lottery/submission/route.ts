import { readBoundedJson, RequestBodyError } from "@/lib/request-body";

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isDemoUser } from "@/lib/user-auth";
import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 1024 * 1024;
const MAX_TOTAL_SIZE = 2800000;

function databaseMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
    return "جدول ارسال تصاویر در دیتابیس متصل به سایت وجود ندارد. مدیر باید اتصال DATABASE_URL محیط Production را بررسی و SQL نصب را روی همان دیتابیس اجرا کند.";
  }
  return fallback;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);

    if (isDemoUser(user)) return json({ submissions: [], submission: null, period: "", result: null });

    const db = getSupabaseAdmin();
    const { data: submissions, error: submissionsError } = await db
      .from("article_lottery_submissions")
      .select("id,status,issued_code,admin_note,created_at,reviewed_at,period")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (submissionsError) throw submissionsError;

    const rows = submissions ?? [];
    if (rows.length === 0) {
      return json({ submissions: [], submission: null, period: "", result: null });
    }

    // Fetch all of this user's issued entries and all announced winners in one pass.
    // Results are computed per period so starting a new round does not hide old results.
    const eligiblePeriods = [...new Set(
      rows.filter((row: { status: string }) => row.status === "issued")
        .map((row: { period: string }) => row.period)
    )];

    const entryByPeriod = new Map<string, string>();
    const winnerByPeriod = new Map<string, { entry_id: string; selected_at: string | null }>();

    if (eligiblePeriods.length > 0) {
      const [{ data: entries, error: entriesError }, { data: winners, error: winnersError }] =
        await Promise.all([
          db.from("article_lottery_entries")
            .select("id,period")
            .eq("user_id", user.id)
            .in("period", eligiblePeriods),
          db.from("article_lottery_winners")
            .select("period,entry_id,selected_at")
            .in("period", eligiblePeriods),
        ]);

      if (entriesError) throw entriesError;
      if (winnersError) throw winnersError;

      for (const entry of entries ?? []) entryByPeriod.set(entry.period, entry.id);
      for (const winner of winners ?? []) winnerByPeriod.set(winner.period, winner);
    }

    const enriched = rows.map((submission: {
      id: string; status: string; period: string; issued_code: string | null;
      admin_note: string | null; created_at: string; reviewed_at: string | null;
    }) => {
      const entryId = submission.status === "issued"
        ? entryByPeriod.get(submission.period)
        : undefined;
      const winner = winnerByPeriod.get(submission.period);
      const result = entryId && winner
        ? {
            status: winner.entry_id === entryId ? "won" as const : "lost" as const,
            period: submission.period,
            announcedAt: winner.selected_at,
          }
        : null;

      return { ...submission, result };
    });

    const latest = enriched[0];
    return json({
      submissions: enriched,
      submission: latest,
      period: latest?.period ?? "",
      result: latest?.result ?? null,
    });
  } catch (error) {
    console.error("Lottery submission GET:", error);
    return json({ error: databaseMessage(error, "دریافت وضعیت درخواست ناموفق بود.") }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) {
    return json({ error: "درخواست نامعتبر است." }, 403);
  }

  try {
    const user = await getCurrentUser();

    if (!user) return json({ error: "ابتدا وارد حساب شوید." }, 401);

    if (isDemoUser(user)) {
      return json({ error: "حساب نمایشی اجازه ارسال درخواست ندارد." }, 403);
    }

    const body = await readBoundedJson(request, 3900000);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "اطلاعات نامعتبر است." }, 400);
    }

    if (!Array.isArray(body.images) ||
        body.images.length < 1 ||
        body.images.length > MAX_IMAGES) {
      return json({ error: "باید بین ۱ تا ۵ تصویر ارسال کنید." }, 400);
    }

    let totalSize = 0;
    const images = body.images.map((image: unknown) => {
      if (typeof image !== "string") throw new Error("فرمت تصویر نامعتبر است.");
      const match = image.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
      );
      if (!match) throw new Error("فقط JPG، PNG و WEBP مجاز هستند.");
      const buffer = Buffer.from(match[2], "base64");
      if (!buffer.length || buffer.length > MAX_IMAGE_SIZE) {
        throw new Error("حجم هر تصویر باید حداکثر ۱ مگابایت باشد.");
      }
      const validSignature = match[1] === "image/png"
        ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : match[1] === "image/jpeg"
          ? buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
          : buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
      if (!validSignature) throw new Error("محتوای فایل با نوع تصویر مطابقت ندارد.");
      totalSize += buffer.length;
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error("حجم مجموع تصاویر بیش از حد مجاز است.");
      }
      return image;
    });

    const result = await withDatabaseTransaction(async (client) => {
      // Lock the selected round to serialize submissions with full-period deletion.
      const requestedPeriod = typeof body.period === "string" ? body.period.trim() : "";
      if (!requestedPeriod || requestedPeriod.length > 100) return { kind: "disabled" as const };
      const selected = await client.query(
        "SELECT enabled, period FROM public.article_lottery_rounds WHERE period = $1 FOR UPDATE",
        [requestedPeriod]
      );
      const lottery = selected.rows[0] as { enabled: boolean; period: string } | undefined;
      if (!lottery?.enabled) return { kind: "disabled" as const };

      const inserted = await client.query(
        `INSERT INTO public.article_lottery_submissions
           (user_id, name, email, period, images, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'pending')
         RETURNING id, status, created_at`,
        [
          user.id,
          user.name?.trim() || user.email.split("@")[0] || "کاربر پراپ‌بین",
          user.email,
          lottery.period,
          JSON.stringify(images),
        ]
      );

      return { kind: "created" as const, submission: inserted.rows[0], period: lottery.period };
    });

    if (result.kind === "disabled") {
      return json({ error: "قرعه‌کشی فعال نیست یا دوره‌ای برای آن تعریف نشده است." }, 403);
    }

    return json({ ok: true, submission: result.submission, period: result.period });

  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    console.error("Lottery submission POST:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return json({ error: "برای این دوره قبلاً درخواست ثبت کرده‌اید." }, 409);
    }
    return json({
      error: databaseMessage(error, error instanceof Error
        ? error.message
        : "ثبت درخواست ناموفق بود."),
    }, error && typeof error === "object" && "code" in error && error.code === "42P01" ? 503 : 400);
  }
}
