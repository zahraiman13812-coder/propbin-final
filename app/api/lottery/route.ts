import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function findWinner(period: string) {
  const db = getSupabaseAdmin();
  const { data: winner, error: wError } = await db.from("article_lottery_winners")
    .select("period,entry_id,selected_at").eq("period", period).maybeSingle();
  if (wError) throw new Error(wError.message);
  if (!winner) return null;
  const { data: entry, error: eError } = await db.from("article_lottery_entries")
    .select("name,period").eq("id", winner.entry_id).maybeSingle();
  if (eError) throw new Error(eError.message);
  if (!entry || entry.period !== period) return null;
  return { name: entry.name, period, selectedAt: winner.selected_at };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const { data: rounds, error: roundsError } = await getSupabaseAdmin()
      .from("article_lottery_rounds")
      .select("period,enabled,title,description,article_slug")
      .eq("enabled", true)
      .order("created_at", { ascending: false });
    if (roundsError) throw new Error(roundsError.message);
    const activeRounds = (rounds ?? []).map((round: { period: string; title: string; description: string; article_slug: string }) => ({
      period: round.period, title: round.title, description: round.description, articleSlug: round.article_slug,
    }));
    return json({ enabled: activeRounds.length > 0, rounds: activeRounds, signedIn: !!user,
      title: activeRounds[0]?.title || "قرعه‌کشی مقاله‌ای",
      description: activeRounds[0]?.description || "",
      articleSlug: activeRounds[0]?.articleSlug || "",
      period: activeRounds[0]?.period || "" });
  } catch (error) {
    console.error("Lottery GET failed:", error);
    return json({ error: "دریافت اطلاعات قرعه‌کشی ناموفق بود." }, 503);
  }
}

// New entries require submission of evidence and explicit admin approval.
// Keep GET unchanged in behavior so previously issued participation codes remain visible.
export async function POST(_request: NextRequest) {
  return json({ error: "صدور خودکار کد غیرفعال است. ابتدا تصاویر را ارسال کنید تا مدیر بررسی کند." }, 410);
}
