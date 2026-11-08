import { siteOrigin } from "@/lib/site-origin";

import { getContent } from "@/lib/content";
import { getPublishedArticles } from "@/lib/supabase-articles";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pubDate(value?: string) {
  const date = value ? new Date(value) : new Date();

  return Number.isNaN(date.getTime())
    ? new Date().toUTCString()
    : date.toUTCString();
}

export async function GET() {
  const [{ settings }, articles] = await Promise.all([
    getContent(),
    getPublishedArticles(),
  ]);

  const origin = siteOrigin();

  const sorted = [...articles].sort((a, b) => {
    const aDate = a.publishedAt
      ? new Date(a.publishedAt).getTime()
      : 0;
    const bDate = b.publishedAt
      ? new Date(b.publishedAt).getTime()
      : 0;

    return bDate - aDate;
  });

  const items = sorted
    .map((article) => {
      const url = `${origin}/articles/${encodeURIComponent(
        article.slug
      )}`;

      return `
    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate(article.publishedAt)}</pubDate>
      <description>${escapeXml(
        article.seoDescription || article.excerpt
      )}</description>
      <category>${escapeXml(
        article.category
      )}</category>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(
      `مقالات ${settings.name}`
    )}</title>
    <link>${escapeXml(`${origin}/articles`)}</link>
    <description>${escapeXml(
      settings.articlesDescription ||
        "مقالات آموزشی و تحلیلی دنیای پراپ"
    )}</description>
    <language>fa-IR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(
      `${origin}/articles/feed.xml`
    )}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type":
        "application/rss+xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, must-revalidate",
    },
  });
}
