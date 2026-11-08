
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  FileText,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  ExternalLink,
} from "lucide-react";

import { requireAdmin } from "@/lib/admin";
import { listAdminArticles } from "@/lib/article-service";
import DeleteArticleButton from "@/components/admin/DeleteArticleButton";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tehran",
  });
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border-theme bg-surface p-5">
      <p className="text-sm text-muted">
        {label}
      </p>

      <p className="mt-4 text-3xl font-extrabold">
        {value.toLocaleString("fa-IR")}
      </p>
    </div>
  );
}

export default async function AdminArticlesPage({
  searchParams,
}: Props) {
  // بررسی دسترسی مدیر
  await requireAdmin();

  const params = await searchParams;

  const rawPage = params.page;

  const pageText =
    typeof rawPage === "string"
      ? rawPage
      : "1";

  const page =
    /^[1-9]\d*$/.test(pageText) &&
    Number.isSafeInteger(Number(pageText))
      ? Math.min(Number(pageText), 100000)
      : 1;

  // دریافت مستقیم اطلاعات مقالات 
  const {
    articles,
    total,
    totalPages,
  } = await listAdminArticles(page, 10);

  if (
    page > 1 &&
    (totalPages === 0 || page > totalPages)
  ) {
    notFound();
  }

  // آمار صفحه فعلی
  const publishedCount = articles.filter(
    (article) => article.status === "published"
  ).length;

  const draftCount = articles.filter(
    (article) => article.status === "draft"
  ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">

        {/* عنوان و دکمه‌های اصلی */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-primary">
              <BookOpen size={18} />
              <span>پنل مدیریت پراپ‌بین</span>
            </div>

            <h1 className="text-2xl font-extrabold sm:text-3xl">
              مدیریت مقالات
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted">
              ایجاد، مشاهده و مدیریت مقالات
              ذخیره‌شده
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/articles/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              <Plus size={18} />
              مقاله جدید
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-border-theme bg-surface px-5 py-3 text-sm font-bold transition hover:border-primary"
            >
              بازگشت به پنل مدیریت
            </Link>
          </div>
        </div>

        {/* کارت‌های آماری */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="مجموع مقالات"
            value={total}
          />

          <StatCard
            label="منتشرشده در این صفحه"
            value={publishedCount}
          />

          <StatCard
            label="پیش‌نویس در این صفحه"
            value={draftCount}
          />
        </div>

        {/* جدول مدیریت مقالات */}
        <section className="overflow-hidden rounded-2xl border border-border-theme bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-theme p-5">
            <div>
              <h2 className="text-lg font-extrabold">
                فهرست مقالات
              </h2>

              <p className="mt-2 text-xs text-muted">
                نمایش مقالات منتشرشده و پیش‌نویس‌ها
                
              </p>
            </div>

            <span className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
              {total.toLocaleString("fa-IR")} مقاله
            </span>
          </div>

          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
              <FileText
                size={42}
                className="text-muted"
              />

              <h3 className="font-bold">
                هنوز مقاله‌ای وجود ندارد.
              </h3>

              <p className="text-sm text-muted">
                برای شروع روی دکمه مقاله جدید کلیک کن.
              </p>

              <Link
                href="/admin/articles/new"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                <Plus size={17} />
                ایجاد اولین مقاله
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-right text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-5 py-4 font-bold">
                      مقاله
                    </th>
                    <th className="px-5 py-4 font-bold">
                      دسته‌بندی
                    </th>
                    <th className="px-5 py-4 font-bold">
                      وضعیت
                    </th>
                    <th className="px-5 py-4 font-bold">
                      تاریخ ایجاد
                    </th>
                    <th className="px-5 py-4 font-bold">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {articles.map((article) => (
                    <tr
                      key={article.id}
                      className="border-t border-border-theme transition-colors hover:bg-background/50"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-start gap-3">
                          <span className="rounded-xl bg-primary/10 p-2 text-primary">
                            <FileText size={20} />
                          </span>

                          <div className="min-w-0">
                            <p className="font-bold text-foreground">
                              {article.title}
                            </p>

                            <p
                              dir="ltr"
                              className="mt-2 max-w-[230px] truncate text-left text-xs text-muted"
                            >
                              {article.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-muted">
                        {article.category}
                      </td>

                      <td className="px-5 py-5">
                        {article.status === "published" ? (
                          <span className="inline-flex rounded-lg bg-green-500/10 px-3 py-2 text-xs font-bold text-green-500">
                            منتشرشده
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-500">
                            پیش‌نویس
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-5 text-muted">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={15} />
                          {formatDate(article.created_at)}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex flex-wrap items-center gap-3">

                          {/* دکمه ویرایش و مدیریت */}
                          <Link
                            href={`/admin/articles/${article.id}/edit`}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                          >
                            <Pencil size={15} />
                            ویرایش / مدیریت
                          </Link>
                           <DeleteArticleButton
            articleId={article.id}
            title={article.title}
          />
                          {/* نمایش فقط برای مقالات منتشرشده */}
                          {article.status === "published" && (
                            <Link
                              href={`/articles/${encodeURIComponent(
                                article.slug
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                              <ExternalLink size={14} />
                              مشاهده
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* صفحه‌بندی */}
        {totalPages > 1 && (
          <nav
            aria-label="صفحه‌بندی مقالات"
            className="mt-6 flex flex-wrap items-center justify-between gap-4"
          >
            <p className="text-sm text-muted">
              صفحه {page.toLocaleString("fa-IR")} از{" "}
              {totalPages.toLocaleString("fa-IR")}
            </p>

            <div className="flex items-center gap-3">
              {page > 1 && (
                <Link
                  href={`/admin/articles?page=${page - 1}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-theme bg-surface px-4 py-3 text-sm font-bold hover:border-primary"
                >
                  <ChevronRight size={17} />
                  قبلی
                </Link>
              )}

              {page < totalPages && (
                <Link
                  href={`/admin/articles?page=${page + 1}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border-theme bg-surface px-4 py-3 text-sm font-bold hover:border-primary"
                >
                  بعدی
                  <ChevronLeft size={17} />
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </main>
  );
}
