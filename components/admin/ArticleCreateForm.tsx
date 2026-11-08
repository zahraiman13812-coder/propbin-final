
"use client";

import {
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ArticleImageUploader from "@/components/admin/ArticleImageUploader";
type ArticleResponse = {
  success: boolean;
  error?: string;
  article?: {
    id: string;
    title: string;
    slug: string;
    status: string;
  };
};

const inputClass =
  "w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary";

const labelClass =
  "mb-2 block text-sm font-bold text-foreground";

export default function ArticleCreateForm() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");
    setSaving(true);

    const form = event.currentTarget;
    const data = new FormData(form);

    const get = (name: string) =>
      String(data.get(name) ?? "").trim();

    const article = {
      title: get("title"),
      slug: get("slug").toLowerCase(),
      excerpt: get("excerpt"),
      body: get("body"),
      image: imageUrl,
      category: get("category"),
      author: get("author"),
      seoTitle: get("seoTitle"),
      seoDescription: get("seoDescription"),
      keywords: get("keywords"),
      canonicalUrl: get("canonicalUrl"),
    };

    if (!article.title || !article.slug) {
      setError("عنوان و اسلاگ مقاله الزامی هستند.");
      setSaving(false);
      return;
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)
    ) {
      setError(
        "اسلاگ باید انگلیسی و شامل حروف کوچک، عدد و خط تیره باشد."
      );
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/articles",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(article),
        }
      );

      const result =
        (await response.json()) as ArticleResponse;

      if (!response.ok || !result.success) {
        setError(
          result.error ||
            "خطا در ذخیره مقاله. دوباره تلاش کنید."
        );
        return;
      }

      setSuccess("مقاله با موفقیت به‌صورت پیش‌نویس ذخیره شد.");

      router.push("/admin/articles");
      router.refresh();
    } catch {
      setError(
        "ارتباط با سرور برقرار نشد. اتصال را بررسی کنید."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-primary">
              پنل مدیریت پراپ‌بین
            </p>

            <h1 className="text-2xl font-extrabold sm:text-3xl">
              ایجاد مقاله جدید
            </h1>

            <p className="mt-3 text-sm text-muted">
              مقاله ابتدا به‌صورت پیش‌نویس ذخیره می‌شود.
            </p>
          </div>

          <Link
            href="/admin/articles"
            className="rounded-xl border border-border-theme px-5 py-3 text-sm font-bold hover:border-primary"
          >
            بازگشت به مقالات
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
            <h2 className="mb-6 text-lg font-extrabold">
              اطلاعات اصلی مقاله
            </h2>

            <div className="space-y-5">
              <div>
                <label htmlFor="title" className={labelClass}>
                  عنوان مقاله *
                </label>

                <input
                  id="title"
                  name="title"
                  required
                  maxLength={200}
                  className={inputClass}
                  placeholder="مثلاً آموزش مدیریت ریسک در پراپ"
                />
              </div>

              <div>
                <label htmlFor="slug" className={labelClass}>
                  آدرس مقاله (Slug) *
                </label>

                <input
                  id="slug"
                  name="slug"
                  required
                  maxLength={160}
                  dir="ltr"
                  className={inputClass}
                  placeholder="prop-risk-management"
                />

                <p className="mt-2 text-xs text-muted">
                  فقط حروف انگلیسی کوچک، اعداد و خط تیره.
                </p>
              </div>

              <div>
                <label htmlFor="excerpt" className={labelClass}>
                  خلاصه مقاله
                </label>

                <textarea
                  id="excerpt"
                  name="excerpt"
                  rows={3}
                  maxLength={500}
                  className={inputClass}
                  placeholder="خلاصه کوتاهی از محتوای مقاله..."
                />
              </div>

              <div>
                <label htmlFor="body" className={labelClass}>
                  متن مقاله
                </label>

                <textarea
                  id="body"
                  name="body"
                  rows={14}
                  className={inputClass}
                  placeholder="محتوای کامل مقاله را بنویسید..."
                />
              </div>

              <div>
                <label htmlFor="image" className={labelClass}>
                  آدرس تصویر شاخص
                </label>

                <ArticleImageUploader
  value={imageUrl}
  onChange={setImageUrl}
/>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category"
                    className={labelClass}
                  >
                    دسته‌بندی
                  </label>

                  <input
                    id="category"
                    name="category"
                    defaultValue="آموزش"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="author"
                    className={labelClass}
                  >
                    نویسنده
                  </label>

                  <input
                    id="author"
                    name="author"
                    defaultValue="تیم پراپ‌بین"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
            <h2 className="mb-6 text-lg font-extrabold">
              تنظیمات سئو (SEO)
            </h2>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="seoTitle"
                  className={labelClass}
                >
                  عنوان سئو
                </label>

                <input
                  id="seoTitle"
                  name="seoTitle"
                  maxLength={200}
                  className={inputClass}
                  placeholder="عنوان مقاله برای گوگل"
                />
              </div>

              <div>
                <label
                  htmlFor="seoDescription"
                  className={labelClass}
                >
                  توضیحات متا
                </label>

                <textarea
                  id="seoDescription"
                  name="seoDescription"
                  rows={3}
                  maxLength={500}
                  className={inputClass}
                  placeholder="توضیح کوتاه برای نتایج جست‌وجو"
                />
              </div>

              <div>
                <label
                  htmlFor="keywords"
                  className={labelClass}
                >
                  کلمات کلیدی
                </label>

                <input
                  id="keywords"
                  name="keywords"
                  className={inputClass}
                  placeholder="پراپ، مدیریت ریسک، آموزش"
                />
              </div>

              <div>
                <label
                  htmlFor="canonicalUrl"
                  className={labelClass}
                >
                  آدرس Canonical
                </label>

                <input
                  id="canonicalUrl"
                  name="canonicalUrl"
                  dir="ltr"
                  className={inputClass}
                  placeholder="اختیاری — در صورت خالی بودن خودکار ساخته می‌شود"
                />
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-500"
            >
              {success}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/admin/articles"
              className="rounded-xl border border-border-theme px-6 py-3 text-sm font-bold"
            >
              انصراف
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-7 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "در حال ذخیره..."
                : "ذخیره پیش‌نویس"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
