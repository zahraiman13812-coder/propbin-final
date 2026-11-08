import { siteOrigin } from "@/lib/site-origin";
import type { MetadataRoute } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const PUBLIC_ROUTES = [
  "/",
  "/firms",
  "/compare",
  "/discounts",
  "/polls",
  "/articles",
  "/cooperation",
  "/lottery",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();

  const pages: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${origin}${route}`,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/articles" || route === "/firms" ? 0.8 : 0.6,
  }));

  // Isolate failures: a broken article query must not hide the firm URLs.
  try {
    const { data: firms, error } = await getSupabaseAdmin().from("prop_firms")
      .select("id,updated_at").eq("is_active", true).order("id").limit(5000);
    if (error) throw error;
    for (const firm of firms ?? []) {
      pages.push({ url: `${origin}/firms/${encodeURIComponent(firm.id)}`,
        lastModified: firm.updated_at || undefined, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch (error) { console.error("Sitemap firm lookup failed:", error); }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("articles")
      .select("slug,published_at,updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const articlePages: MetadataRoute.Sitemap = (data ?? [])
      .filter((article: { slug?: string }) =>
        typeof article.slug === "string" && /^[a-zA-Z0-9_-]+$/.test(article.slug)
      )
      .map((article: {
        slug: string;
        updated_at?: string | null;
        published_at?: string | null;
      }) => ({
        url: `${origin}/articles/${encodeURIComponent(article.slug)}`,
        lastModified: article.updated_at || article.published_at || undefined,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));

    return [...pages, ...articlePages];
  } catch (error) {
    // A temporary database outage must not make the entire sitemap return 500.
    console.error("Sitemap article lookup failed; returning public routes only:", error);
    return pages;
  }
}
