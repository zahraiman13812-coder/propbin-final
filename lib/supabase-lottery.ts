import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { type ArticleLottery } from "./content";

type SettingsRow = {
  enabled: boolean;
  title: string;
  description: string;
  article_slug: string;
  period: string;
};

export async function getArticleLotterySettings(): Promise<ArticleLottery> {
  const { data, error } = await getSupabaseAdmin()
    .from("article_lottery_settings")
    .select("enabled,title,description,article_slug,period")
    .eq("id", 1)
    .single();

  if (error) throw new Error(`Lottery settings read failed: ${error.message}`);
  const row = data as SettingsRow;
  return {
    enabled: row.enabled,
    title: row.title,
    description: row.description,
    articleSlug: row.article_slug,
    period: row.period,
    entries: [],
  };
}

export async function saveArticleLotterySettings(
  settings: Omit<ArticleLottery, "entries">
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("article_lottery_settings")
    .update({
      enabled: settings.enabled,
      title: settings.title,
      description: settings.description,
      article_slug: settings.articleSlug,
      period: settings.period,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) throw new Error(`Lottery settings save failed: ${error.message}`);
}
