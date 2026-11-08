
import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowLeft,
  BookOpen,
  Building2,
  Search,
  TicketPercent,
} from "lucide-react";

import { getActivePropFirms } from "@/lib/supabase-firms";
import { getPublishedArticles } from "@/lib/supabase-articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جست‌وجو",
  robots: { index: false, follow: true },
  description:
    "جست‌وجو در شرکت‌های پراپ، مقالات آموزشی و کدهای تخفیف پراپ‌بین.",
};

type Props = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .toLocaleLowerCase("fa")
    .trim();
}

export default async function SearchPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  // Search only current public records from Supabase. This avoids stale
  // JSON data and prevents draft articles from appearing in public search.
  const [firms, articles] = await Promise.all([
    getActivePropFirms(),
    getPublishedArticles(),
  ]);

  const input =
    typeof params.q === "string"
      ? params.q
      : "";

  const query = normalize(input.slice(0, 100));

  const matchingFirms = query
    ? firms.filter((firm) =>
        normalize(
          [
            firm.name,
            firm.description,
            firm.challenge,
            firm.capital,
          ].join(" ")
        ).includes(query)
      )
    : [];

  const matchingArticles = query
    ? articles.filter((article) =>
        normalize(
          [
            article.title,
            article.excerpt,
            article.category,
          ].join(" ")
        ).includes(query)
      )
    : [];

  const matchingDiscounts = query
    ? firms.filter((firm) =>
        normalize(
          [
            firm.name,
            firm.code,
            firm.discount,
          ].join(" ")
        ).includes(query)
      )
    : [];

  const total =
    matchingFirms.length +
    matchingArticles.length +
    matchingDiscounts.length;

  return (
    <div
      dir="rtl"
      className="min-h-[75vh] bg-background px-4 py-10 text-foreground sm:px-6"
    >
      <div className="mx-auto max-w-[1000px]">
        <div className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <Search
              size={26}
              className="text-primary"
            />

            <div>
              <h1 className="text-2xl font-extrabold">
                جست‌وجو در پراپ‌بین
              </h1>

              <p className="mt-2 text-xs text-muted">
                شرکت‌ها، مقالات و کدهای تخفیف
              </p>
            </div>
          </div>

          <form
            action="/search"
            method="GET"
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="search"
              name="q"
              defaultValue={input}
              maxLength={100}
              autoFocus
              placeholder="نام شرکت، موضوع مقاله یا کد تخفیف..."
              className="h-12 min-w-0 flex-1 rounded-xl border border-border-theme bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
            />

            <button
              type="submit"
              className="h-12 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground"
            >
              جست‌وجو
            </button>
          </form>
        </div>

        {!query ? (
          <p className="py-14 text-center text-sm text-muted">
            عبارت موردنظرت رو وارد کن.
          </p>
        ) : (
          <div className="mt-8 space-y-8">
            <p className="text-sm text-muted">
              {total.toLocaleString("fa-IR")} نتیجه
              برای «{input.slice(0, 100)}»
            </p>

            {total === 0 && (
              <div className="rounded-2xl border border-border-theme bg-surface p-10 text-center text-sm text-muted">
                نتیجه‌ای پیدا نشد. عبارت کوتاه‌تری
                امتحان کن.
              </div>
            )}

            {matchingFirms.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Building2
                    size={20}
                    className="text-primary"
                  />
                  شرکت‌های پراپ
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {matchingFirms.map((firm) => (
                    <Link
                      key={firm.id}
                      href={`/firms#${firm.id}`}
                      className="group rounded-xl border border-border-theme bg-surface p-4 transition-colors hover:border-primary"
                    >
                      <span className="font-bold">
                        {firm.name}
                      </span>

                      <p className="mt-2 line-clamp-2 text-xs leading-7 text-muted">
                        {firm.description}
                      </p>

                      <span className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                        مشاهده در لیست شرکت‌ها
                        <ArrowLeft size={15} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchingArticles.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <BookOpen
                    size={20}
                    className="text-primary"
                  />
                  مقالات
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {matchingArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/articles/${article.slug}`}
                      className="rounded-xl border border-border-theme bg-surface p-4 hover:border-primary"
                    >
                      <span className="font-bold">
                        {article.title}
                      </span>

                      <p className="mt-2 line-clamp-2 text-xs leading-7 text-muted">
                        {article.excerpt}
                      </p>

                      <span className="mt-3 inline-block text-xs text-primary">
                        خواندن مقاله ←
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {matchingDiscounts.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <TicketPercent
                    size={20}
                    className="text-primary"
                  />
                  کدهای تخفیف
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  {matchingDiscounts.map((firm) => (
                    <div
                      key={firm.id}
                      className="rounded-xl border border-border-theme bg-surface p-4"
                    >
                      <p className="font-bold">
                        {firm.name}
                      </p>

                      <p className="mt-2 text-sm text-primary">
                        {firm.discount} تخفیف
                      </p>

                      <code className="mt-2 block select-all text-xs text-muted">
                        {firm.code}
                      </code>

                      <Link
                        href="/discounts"
                        className="mt-3 inline-block text-xs text-primary"
                      >
                        مشاهده تخفیف‌ها ←
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
