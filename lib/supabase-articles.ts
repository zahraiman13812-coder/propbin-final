import "server-only";

import type { Article } from "@/lib/content";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ArticleRow = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  image: string | null;
  category: string;
  author: string;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string | null;
  canonical_url: string | null;
  published_at: string | null;
  updated_at: string;
};

function mapArticle(row: ArticleRow): Article {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || "",
    body: row.body || "",
    image: row.image || "",
    category: row.category || "عمومی",
    author: row.author || "تیم پراپ‌بین",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    keywords: row.keywords || "",
    publishedAt: row.published_at || undefined,
    updatedAt: row.updated_at,
    date: row.published_at
      ? new Date(row.published_at).toLocaleDateString(
          "fa-IR",
          { timeZone: "Asia/Tehran" }
        )
      : "",
    read: `${Math.max(
      1,
      Math.ceil((row.body || "").split(/\s+/).length / 200)
    )} دقیقه`,
    icon: "◈",
  };
}

const fields = `
  title, slug, excerpt, body, image,
  category, author, seo_title,
  seo_description, keywords, canonical_url,
  published_at, updated_at
`;

export async function getPublishedArticles(): Promise<Article[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(fields)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Articles query failed:", error);
    throw new Error("دریافت مقالات ناموفق بود");
  }

  return (data as ArticleRow[]).map(mapArticle);
}

export async function getPublishedArticleCanonical(
  slug: string
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select("canonical_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Canonical query failed:", error);
    throw new Error("دریافت Canonical مقاله ناموفق بود");
  }

  return data?.canonical_url?.trim() || null;
}

export async function getPublishedArticle(
  slug: string
): Promise<Article | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(fields)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  
if (error) {
  console.error("Articles query failed:", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  throw new Error("دریافت مقالات ناموفق بود");
}


  return data ? mapArticle(data as ArticleRow) : null;
}