
import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { getArticleImageReport } from "@/lib/article-image-service";
import DeleteArticleImageButton from "@/components/admin/DeleteArticleImageButton";

export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "نامشخص";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

export default async function ArticleImagesPage() {
  await requireAdmin();

  const report = await getArticleImageReport();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-primary">
              پنل مدیریت پراپ‌بین
            </p>

            <h1 className="text-2xl font-extrabold sm:text-3xl">
              مدیریت تصاویر مقالات
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted">
              مشاهده تصاویر و بررسی
              ارجاع آن‌ها در مقالات
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/articles"
              className="rounded-xl border border-border-theme bg-surface px-5 py-3 text-sm font-bold transition hover:border-primary"
            >
              مدیریت مقالات
            </Link>

            <Link
              href="/admin"
              className="rounded-xl border border-border-theme bg-surface px-5 py-3 text-sm font-bold transition hover:border-primary"
            >
              پنل مدیریت
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "کل تصاویر",
              value: report.total,
            },
            {
              label: "تصاویر استفاده‌شده",
              value: report.used,
            },
            {
              label: "بدون ارجاع شناسایی‌شده",
              value: report.unused,
            },
            {
              label: "کاندید بررسی برای حذف",
              value: report.deletionCandidates,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border-theme bg-surface p-5"
            >
              <p className="text-sm text-muted">
                {stat.label}
              </p>

              <p className="mt-4 text-3xl font-extrabold">
                {stat.value.toLocaleString("fa-IR")}
              </p>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h2 className="font-bold text-amber-600">
            قبل از حذف تصویر
          </h2>

          <p className="mt-2 text-sm leading-7 text-muted">
            گزارش، ارجاع تصاویر در مقالات و جدول ارجاع‌های
            ثبت‌شده را بررسی می‌کند؛ اما ممکن است استفاده از
            تصویر در بنرها یا بخش‌های دیگر سایت را تشخیص ندهد.
            قبل از حذف، مطمئن شو تصویر در بخش دیگری استفاده
            نشده است. حذف فایل از Storage دائمی است.
          </p>
        </div>

        {/* Images */}
        {report.images.length === 0 ? (
          <div className="rounded-2xl border border-border-theme bg-surface p-10 text-center">
            <h2 className="font-bold">
              تصویری پیدا نشد
            </h2>

            <p className="mt-3 text-sm text-muted">
              در پوشه covers تصویر قابل نمایش وجود ندارد.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {report.images.map((image) => {
              const validStoragePath =
  /^covers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i.test(
    image.path
  );

const canDelete =
  !image.used && validStoragePath;

              return (
                <article
                  key={image.path}
                  className="overflow-hidden rounded-2xl border border-border-theme bg-surface"
                >
                  {/* Image preview */}
                  <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-background p-3">
                    <img
                      src={image.url}
                      alt={`تصویر مقاله ${image.path}`}
                      loading="lazy"
                      className="block h-full w-full max-w-full object-contain"
                    />
                  </div>

                  <div className="min-w-0 space-y-4 p-4 sm:p-5">
                    {/* Usage status */}
                    <div>
                      <span
                        className={
                          image.used
                            ? "inline-flex rounded-lg bg-green-500/10 px-3 py-2 text-xs font-bold text-green-600"
                            : "inline-flex rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600"
                        }
                      >
                        {image.usedAsCover
  ? "استفاده‌شده به‌عنوان تصویر شاخص"
  : image.usedInBody
    ? "استفاده‌شده در متن مقاله"
    : image.usedInSettings
      ? "استفاده‌شده در تنظیمات یا محتوای سایت"
      : "بدون ارجاع شناسایی‌شده"}
                      </span>
                    </div>

                    {/* Referencing articles */}
                    {image.articleTitles.length > 0 && (
                      <div className="rounded-xl bg-background p-3">
                        <p className="mb-2 text-xs font-bold">
                          مقالات استفاده‌کننده:
                        </p>

                        <ul className="space-y-1">
                          {image.articleTitles.map(
                            (title, index) => (
                              <li
                                key={`${title}-${index}`}
                                className="text-xs leading-6 text-muted"
                              >
                                • {title}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {/* File details */}
                    <div className="space-y-2 text-xs text-muted">
                      <p>
                        <span className="font-bold">
                          حجم:
                        </span>{" "}
                        {formatSize(image.size)}
                      </p>

                      <p>
                        <span className="font-bold">
                          تاریخ آپلود:
                        </span>{" "}
                        {formatDate(image.createdAt)}
                      </p>

                      <p className="font-bold">
                        مسیر فایل:
                      </p>

                      <p
                        dir="ltr"
                        className="break-all text-left"
                      >
                        {image.path}
                      </p>
                    </div>

                    {/* Open image */}
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-sm font-bold text-primary hover:underline"
                    >
                      مشاهده تصویر ↗
                    </a>

                    {/* Safe deletion */}
                    {canDelete ? (
                      <div className="border-t border-border-theme pt-4">
                        <p className="mb-3 text-xs leading-6 text-muted">
                          این تصویر بیش از ۷ روز قدمت دارد و
                          ارجاعی برای آن در گزارش شناسایی نشده.
                          پیش از حذف، استفاده‌های دیگر سایت
                          را نیز بررسی کن.
                        </p>

                        <DeleteArticleImageButton
                          path={image.path}
                        />
                      </div>
                    ) : image.used ? (
                      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                        <p className="text-xs font-bold text-green-600">
                          این تصویر در مقالات استفاده می‌شود؛
                          حذف از این صفحه مجاز نیست.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border-theme p-3">
                        <p className="text-xs leading-6 text-muted">
                          این تصویر هنوز شرایط حذف را ندارد.
                          تصاویر جدیدتر از ۷ روز در این گروه
                          قرار می‌گیرند.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
