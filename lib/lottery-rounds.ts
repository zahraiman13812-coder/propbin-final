import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export type PublicLotteryRound = {
  period: string;
  enabled: boolean;
  title: string;
  description: string;
  articleSlug: string;
};

export async function getActiveLotteryRounds(): Promise<PublicLotteryRound[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("article_lottery_rounds")
    .select("period,enabled,title,description,article_slug")
    .eq("enabled", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load lottery rounds: ${error.message}`);
  return (data ?? []).map((row: {period: string; enabled: boolean; title: string; description: string; article_slug: string}) => ({
    period: row.period, enabled: row.enabled, title: row.title,
    description: row.description, articleSlug: row.article_slug,
  }));
}
