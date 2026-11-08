import { siteOrigin } from "@/lib/site-origin";
import type { Metadata } from "next";
import Link from "next/link";

import { getContent } from "@/lib/content";
import { jsonLdString } from "@/lib/article-seo";
import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticles } from "@/lib/supabase-articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "مقالات و آموزش پراپ",
  description:
    "مقالات آموزشی پراپ‌بین درباره مقایسه شرکت‌های پراپ، قوانین چالش، مدیریت ریسک، دراودان، برداشت سود و انتخاب آگاهانه حساب معاملاتی.",
  keywords: [
    "مقالات پراپ",
    "آموزش پراپ",
    "مدیریت ریسک",
    "دراودان",
    "چالش پراپ",
  ],
  alternates: {
    canonical: "/articles",
    types: {
      "application/rss+xml": "/articles/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    title: "مقالات و آموزش پراپ",
    description:
      "راهنماهای کاربردی پراپ‌بین برای شناخت چالش‌های پراپ، قوانین معاملاتی و مقایسه گزینه‌ها.",
    url: "/articles",
    locale: "fa_IR",
    images: ["/pb-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "مقالات و آموزش پراپ",
    description:
      "راهنماهای کوتاه و کاربردی برای شناخت شرکت‌های پراپ.",
    images: ["/pb-logo.png"],
  },
};

export default async function ArticlesPage() {
  const [{ settings }, articles] = await Promise.all([
  getContent(),
  getPublishedArticles(),
]);

  const origin = siteOrigin();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `مقالات ${settings.name}`,
    itemListElement: articles.map(
      (article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/articles/${article.slug}`,
        name: article.title,
      })
    ),
  };

  return (
    <div className="page-shell min-w-0 overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(itemList),
        }}
      />

      <div className="container min-w-0">
        <div className="page-heading">
          <span className="eyebrow">
            مجله پراپ‌بین
          </span>
          <h1>
            مقالات و <em>آموزش</em>
          </h1>
          <p>
            راهنماهای آموزشی درباره انتخاب شرکت پراپ، مقایسه چالش‌ها، مدیریت ریسک و قوانین برداشت سود؛ برای تصمیم‌گیری آگاهانه‌تر.
          </p>
        </div>

        <div className="article-grid article-grid-page min-w-0">
          {articles.length === 0 && (
            <div className="col-span-full rounded-2xl border border-border-theme bg-surface p-6 text-center sm:p-10">
              <p className="text-base font-bold text-foreground">هنوز مقاله‌ای منتشر نشده است.</p>
              <p className="mt-2 text-sm leading-7 text-muted">پس از انتشار نخستین مقاله، محتوای آموزشی در این بخش نمایش داده می‌شود.</p>
            </div>
          )}
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
            />
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-theme bg-surface p-4 text-xs text-muted">
          <span>
            {articles.length.toLocaleString("fa-IR")}{" "}
            مقاله منتشرشده
          </span>

          <Link
            href="/articles/feed.xml"
            className="text-primary hover:underline"
          >
            اشتراک در خوراک RSS
          </Link>
        </div>
      </div>
    </div>
  );
}
