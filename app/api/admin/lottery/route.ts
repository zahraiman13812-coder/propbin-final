
import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getContent } from "@/lib/content";
import { validOrigin } from "@/lib/guard";
import { getPublishedArticles } from "@/lib/supabase-articles";
import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const MAX_BATCHES = 100;

type LotteryUpdate = {
  enabled?: unknown;
  title?: unknown;
  description?: unknown;
  articleSlug?: unknown;
  period?: unknown;
};

type LotteryEntry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  code: string;
  period: string;
  createdAt: string;
  selectable?: boolean;
};

type LotteryEntryRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  code: string;
  period: string;
  created_at: string;
};

type LotteryWinnerRow = {
  period: string;
  entry_id: string;
  selected_at: string;
};

type LotteryWinner = LotteryEntry & {
  selectedAt: string;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

async function getSavedEntries(): Promise<LotteryEntry[]> {
  const supabase = getSupabaseAdmin();
  const entries: LotteryEntry[] = [];

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const from = batch * PAGE_SIZE;

    const { data, error } = await supabase
      .from("article_lottery_entries")
      .select(
        "id,user_id,name,email,code,period,created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(
        "Article lottery entries query failed:",
        error
      );

      throw new Error(
        "دریافت شرکت‌کنندگان از PostgreSQL ناموفق بود."
      );
    }

    const rows = (data ?? []) as LotteryEntryRow[];

    entries.push(
      ...rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name?.trim() || row.email?.split("@")[0] || "کاربر پراپ‌بین",
        email: row.email,
        code: row.code,
        period: row.period,
        createdAt: row.created_at,
        selectable: true,
      }))
    );

    if (rows.length < PAGE_SIZE) {
      return entries;
    }
  }

  throw new Error(
    "تعداد سوابق زیاد است و نیاز به صفحه‌بندی پنل دارد."
  );
}

// Legacy JSON entries must not recreate deleted periods. Only the database
// is authoritative; issued submissions missing their entry are shown as
// non-selectable until explicitly reconciled by the admin.
async function getUnlinkedIssuedSubmissions(saved: LotteryEntry[]): Promise<LotteryEntry[]> {
  const known = new Set(saved.map((entry) => JSON.stringify([entry.userId, entry.period])));
  const rows = await withDatabaseTransaction(async (client) => client.query(
    `SELECT id, user_id, name, email, period, issued_code, created_at
     FROM public.article_lottery_submissions
     WHERE status = 'issued' AND issued_code IS NOT NULL
     ORDER BY created_at DESC LIMIT 10000`
  ));
  return rows.rows.flatMap((row: {
    id: string; user_id: string; name: string; email: string;
    period: string; issued_code: string; created_at: string;
  }) => known.has(JSON.stringify([row.user_id, row.period])) ? [] : [{
    id: row.id, userId: row.user_id,
    name: row.name?.trim() || row.email?.split('@')[0] || 'کاربر پراپ‌بین',
    email: row.email, code: row.issued_code, period: row.period,
    createdAt: row.created_at, selectable: false,
  }]);
}

async function getSavedWinners(
  entries: LotteryEntry[]
): Promise<LotteryWinner[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("article_lottery_winners")
    .select("period,entry_id,selected_at")
    .order("selected_at", { ascending: false });

  if (error) {
    console.error("Article lottery winners query failed:", error);
    throw new Error("دریافت برندگان قرعه‌کشی ناموفق بود.");
  }

  const entryById = new Map<string, LotteryEntry>(
    entries
      .filter((entry) => entry.selectable)
      .map((entry): [string, LotteryEntry] => [entry.id, entry])
  );

  return ((data ?? []) as LotteryWinnerRow[]).flatMap((row) => {
    const entry = entryById.get(row.entry_id);
    if (!entry || entry.period !== row.period) return [];
    return [{ ...entry, selectedAt: row.selected_at }];
  });
}

/**
 * Admin-only lottery settings, participants, and manually selected winners.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return json(
      { error: "دسترسی غیرمجاز است." },
      401
    );
  }

  try {
    const [content, publishedArticles, savedEntries] =
      await Promise.all([
        getContent(),
        getPublishedArticles(),
        getSavedEntries(),
      ]);

    const unlinked = await getUnlinkedIssuedSubmissions(savedEntries);
    const entries = [...savedEntries, ...unlinked];
    const winners = await getSavedWinners(entries);
    const roundCounts = await withDatabaseTransaction(async (client) => {
      const [submissionCounts, entryCounts] = await Promise.all([
        client.query(
          "SELECT period, COUNT(*)::int AS total FROM public.article_lottery_submissions GROUP BY period"
        ),
        client.query(
          "SELECT period, COUNT(*)::int AS total FROM public.article_lottery_entries GROUP BY period"
        ),
      ]);
      return { submissionCounts: submissionCounts.rows, entryCounts: entryCounts.rows };
    });

    const configured = await withDatabaseTransaction(async (client) => {
      const result = await client.query(
        `SELECT period, enabled, title, description, article_slug FROM public.article_lottery_rounds ORDER BY created_at DESC, period DESC`
      );
      return result.rows as { period: string; enabled: boolean; title: string; description: string; article_slug: string }[];
    });
    const periods = new Set<string>();
    configured.forEach((round) => periods.add(round.period));
    savedEntries.forEach((entry) => periods.add(entry.period));
    winners.forEach((winner) => periods.add(winner.period));
    roundCounts.submissionCounts.forEach((row: { period: string }) => periods.add(row.period));

    const rounds = [...periods].map((period) => ({
      period,
      entries: Number(roundCounts.entryCounts.find((row: { period: string }) => row.period === period)?.total ?? 0),
      submissions: Number(roundCounts.submissionCounts.find((row: { period: string }) => row.period === period)?.total ?? 0),
      winner: winners.find((winner) => winner.period === period)?.name ?? null,
      active: configured.find((round) => round.period === period)?.enabled ?? false,
      title: configured.find((round) => round.period === period)?.title ?? period,
      description: configured.find((round) => round.period === period)?.description ?? "",
      articleSlug: configured.find((round) => round.period === period)?.article_slug ?? "",
    })).sort((a, b) => a.period.localeCompare(b.period, "fa"));

    return json({
      unlinkedIssuedCount: unlinked.length,
      rounds,
      lottery: {
        ...content.articleLottery,
        entries,
        winners,
      },

      articles: publishedArticles.map((article) => ({
        slug: article.slug,
        title: article.title,
      })),
    });
  } catch (error) {
    console.error("Admin lottery GET failed:", error);

    return json(
      {
        error:
          "دریافت تنظیمات یا شرکت‌کنندگان قرعه‌کشی ناموفق بود.",
      },
      503
    );
  }
}

/**
 * Select or replace the manually chosen winner for a period.
 * Only entries persisted in Supabase can be selected.
 */
export async function POST(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 403);
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "اطلاعات نامعتبر است." }, 400);
  }

  const payload = body as { entryId?: unknown; period?: unknown };
  const entryId = cleanText(payload.entryId, 80);
  const period = cleanText(payload.period, 100);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)) {
    return json({ error: "شناسه شرکت‌کننده معتبر نیست." }, 400);
  }
  if (!period) {
    return json({ error: "دوره قرعه‌کشی مشخص نشده است." }, 400);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: entry, error: entryError } = await supabase
      .from("article_lottery_entries")
      .select("id,period")
      .eq("id", entryId)
      .maybeSingle();

    if (entryError) {
      console.error("Lottery winner participant lookup failed:", entryError);
      throw new Error("بررسی شرکت‌کننده ناموفق بود.");
    }
    if (!entry || entry.period !== period) {
      return json({ error: "شرکت‌کننده‌ای با این کد و دوره پیدا نشد." }, 404);
    }

    const { error: winnerError } = await supabase
      .from("article_lottery_winners")
      .upsert(
        { period, entry_id: entryId, selected_at: new Date().toISOString() },
        { onConflict: "period" }
      );

    if (winnerError) {
      console.error("Lottery winner save failed:", winnerError);
      throw new Error("ثبت برنده ناموفق بود.");
    }

    return json({ ok: true, period, entryId });
  } catch (error) {
    console.error("Admin lottery winner POST failed:", error);
    return json({ error: "ثبت برنده قرعه‌کشی ناموفق بود." }, 503);
  }
}

/**
 * Permanently delete one lottery period and its related records.
 * The active period is disabled before its records are removed.
 */
export async function DELETE(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return json({ error: "دسترسی غیرمجاز است." }, 403);
  }

  const body: unknown = await request.json().catch(() => null);
  const period = cleanText(
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { period?: unknown }).period
      : "",
    100
  );

  if (!period) {
    return json({ error: "نام دوره برای حذف مشخص نشده است." }, 400);
  }

  try {
    const deleted = await withDatabaseTransaction(async (client) => {
      const settingsResult = await client.query(
        "SELECT enabled, period FROM public.article_lottery_settings WHERE id = 1 FOR UPDATE"
      );
      const settings = settingsResult.rows[0] as
        | { enabled: boolean; period: string }
        | undefined;

      await client.query("SELECT period FROM public.article_lottery_rounds WHERE period = $1 FOR UPDATE", [period]);
      const winners = await client.query(
        "DELETE FROM public.article_lottery_winners WHERE period = $1",
        [period]
      );
      const submissions = await client.query(
        "DELETE FROM public.article_lottery_submissions WHERE period = $1",
        [period]
      );
      const entries = await client.query(
        "DELETE FROM public.article_lottery_entries WHERE period = $1",
        [period]
      );

      await client.query("DELETE FROM public.article_lottery_rounds WHERE period = $1", [period]);
      if (settings?.period === period) {
        await client.query(
          `UPDATE public.article_lottery_settings
           SET enabled = false, period = '', article_slug = '', updated_at = now()
           WHERE id = 1`
        );
      }

      return {
        winners: winners.rowCount ?? 0,
        submissions: submissions.rowCount ?? 0,
        entries: entries.rowCount ?? 0,
      };
    });

    return json({
      ok: true,
      period,
      deleted,
      message: `دوره «${period}» و تمام اطلاعات وابسته آن به‌صورت کامل حذف شد.`,
    });
  } catch (error) {
    console.error("Admin lottery DELETE failed:", error);
    return json({ error: "حذف دوره انجام نشد و تراکنش بازگردانده شد. لاگ سرور را بررسی کنید." }, 503);
  }
}

/**
 * Update lottery settings without deleting entries.
 */
export async function PUT(request: NextRequest) {
  if (
    !validOrigin(request) ||
    !(await isAdmin())
  ) {
    return json(
      { error: "دسترسی غیرمجاز است." },
      403
    );
  }

  const body: unknown = await request
    .json()
    .catch(() => null);

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return json(
      { error: "اطلاعات نامعتبر است." },
      400
    );
  }

  const payload = body as LotteryUpdate;

  if (typeof payload.enabled !== "boolean") {
    return json(
      { error: "وضعیت قرعه‌کشی معتبر نیست." },
      400
    );
  }

  for (const field of [
    "title",
    "description",
    "articleSlug",
    "period",
  ] as const) {
    if (typeof payload[field] !== "string") {
      return json(
        { error: `مقدار ${field} معتبر نیست.` },
        400
      );
    }
  }

  const title = cleanText(payload.title, 120);
  const description = cleanText(
    payload.description,
    800
  );
  const articleSlug = cleanText(
    payload.articleSlug,
    150
  );
  const period = cleanText(payload.period, 100);

  if (!title) {
    return json(
      { error: "عنوان قرعه‌کشی الزامی است." },
      400
    );
  }

  if (!period) {
    return json(
      { error: "نام دوره الزامی است." },
      400
    );
  }

  if (
    articleSlug &&
    !/^[a-z0-9-]+$/.test(articleSlug)
  ) {
    return json(
      { error: "شناسه مقاله معتبر نیست." },
      400
    );
  }

  if (payload.enabled && !articleSlug) {
    return json(
      {
        error:
          "برای فعال‌کردن قرعه‌کشی باید مقاله انتخاب شود.",
      },
      400
    );
  }

  try {
    const publishedArticles =
      await getPublishedArticles();

    if (
      articleSlug &&
      !publishedArticles.some(
        (article) => article.slug === articleSlug
      )
    ) {
      return json(
        {
          error:
            "مقاله انتخاب‌شده منتشر نشده یا وجود ندارد.",
        },
        400
      );
    }

    await withDatabaseTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.article_lottery_rounds (period, enabled, title, description, article_slug)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (period) DO UPDATE SET
           enabled = EXCLUDED.enabled, title = EXCLUDED.title,
           description = EXCLUDED.description, article_slug = EXCLUDED.article_slug,
           updated_at = now()`,
        [period, payload.enabled, title, description, articleSlug]
      );
      // Maintain the original settings row for older integrations.
      await client.query(
        `UPDATE public.article_lottery_settings SET enabled=$1, title=$2,
          description=$3, article_slug=$4, period=$5, updated_at=now() WHERE id=1`,
        [payload.enabled, title, description, articleSlug, period]
      );
    });

    return json({ ok: true });
  } catch (error) {
    console.error("Admin lottery PUT failed:", error);

    return json(
      {
        error:
          "ذخیره تنظیمات قرعه‌کشی ناموفق بود.",
      },
      503
    );
  }
}
