
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArticleImageUploader from "@/components/admin/ArticleImageUploader";
type Article = {
  id: string;
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
  status: "draft" | "published";
};

type ApiResult = {
  success: boolean;
  error?: string;
  article?: Article;
};

type FormValues = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  image: string;
  category: string;
  author: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  canonicalUrl: string;
};

const fields: {
  name: keyof FormValues;
  label: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  dir?: "ltr" | "rtl";
}[] = [
  {
    name: "title",
    label: "عنوان مقاله",
    required: true,
    maxLength: 200,
  },
  {
    name: "slug",
    label: "اسلاگ مقاله",
    required: true,
    maxLength: 160,
    dir: "ltr",
  },
  {
    name: "excerpt",
    label: "خلاصه مقاله",
    multiline: true,
    rows: 3,
    maxLength: 500,
  },
  {
    name: "body",
    label: "متن مقاله",
    multiline: true,
    rows: 14,
  },

  {
    name: "category",
    label: "دسته‌بندی",
  },
  {
    name: "author",
    label: "نویسنده",
  },
  {
    name: "seoTitle",
    label: "عنوان سئو",
    maxLength: 200,
  },
  {
    name: "seoDescription",
    label: "توضیحات متا",
    multiline: true,
    rows: 3,
    maxLength: 500,
  },
  {
    name: "keywords",
    label: "کلمات کلیدی",
  },
  {
    name: "canonicalUrl",
    label: "آدرس Canonical",
    dir: "ltr",
  },
];

function toFormValues(article: Article): FormValues {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    body: article.body ?? "",
    image: article.image ?? "",
    category: article.category ?? "",
    author: article.author ?? "",
    seoTitle: article.seo_title ?? "",
    seoDescription: article.seo_description ?? "",
    keywords: article.keywords ?? "",
    canonicalUrl: article.canonical_url ?? "",
  };
}

const inputClass =
  "w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary";

export default function ArticleEditForm({
  articleId,
}: {
  articleId: string;
}) {
  const router = useRouter();

  const [article, setArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<FormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const endpoint = `/api/admin/articles/${encodeURIComponent(
    articleId
  )}`;

  const loadArticle = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success || !result.article) {
        throw new Error(
          result.error || "مقاله پیدا نشد."
        );
      }

      setArticle(result.article);
      setForm(toFormValues(result.article));
      setDirty(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت مقاله"
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void loadArticle();
  }, [loadArticle]);

  function changeField(
    name: keyof FormValues,
    value: string
  ) {
    setForm((current) =>
      current ? { ...current, [name]: value } : current
    );
    setDirty(true);
    setMessage("");
  }

  async function sendAction(
    action: "update" | "publish" | "unpublish",
    data?: FormValues
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ...(data ? { data } : {}),
        }),
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "عملیات انجام نشد."
        );
      }

      if (action === "update") {
        setMessage("تغییرات مقاله ذخیره شد.");
      } else if (action === "publish") {
        setMessage("مقاله با موفقیت منتشر شد.");
      } else {
        setMessage("مقاله به پیش‌نویس برگشت.");
      }

      await loadArticle();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطای ارتباط با سرور"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!form || saving) return;

    await sendAction("update", form);
  }

  async function handleStatus(
    action: "publish" | "unpublish"
  ) {
    if (saving || !article) return;

    if (dirty) {
      setError(
        "ابتدا تغییرات مقاله را ذخیره کن؛ سپس وضعیت انتشار را تغییر بده."
      );
      return;
    }

    if (
      action === "unpublish" &&
      !window.confirm(
        "مقاله از صفحات عمومی سایت حذف می‌شود. ادامه می‌دهی؟"
      )
    ) {
      return;
    }

    await sendAction(action);
  }

  if (loading) {
    return (
      <main className="p-10 text-center text-muted">
        در حال دریافت اطلاعات مقاله...
      </main>
    );
  }

  if (!article || !form) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <p role="alert" className="text-red-500">
          {error || "مقاله پیدا نشد."}
        </p>
        <Link href="/admin/articles" className="text-primary">
          بازگشت به مقالات
        </Link>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-primary">
              پنل مدیریت پراپ‌بین
            </p>

            <h1 className="text-2xl font-extrabold sm:text-3xl">
              ویرایش مقاله
            </h1>

            <p className="mt-3 text-sm text-muted">
              اطلاعات مقاله و تنظیمات سئو را مدیریت کن.
            </p>
          </div>

          <Link
            href="/admin/articles"
            className="rounded-xl border border-border-theme px-5 py-3 text-sm font-bold"
          >
            بازگشت به مقالات
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border-theme bg-surface p-5">
          <span className="text-sm font-bold">
            وضعیت:
          </span>

          <span
            className={
              article.status === "published"
                ? "rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-500"
                : "rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-500"
            }
          >
            {article.status === "published"
              ? "منتشرشده"
              : "پیش‌نویس"}
          </span>

          {article.status === "published" && (
            <Link
              href={`/articles/${encodeURIComponent(article.slug)}`}
              target="_blank"
              className="text-sm font-bold text-primary"
            >
              مشاهده مقاله ↗
            </Link>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
            <h2 className="mb-6 text-lg font-extrabold">
              اطلاعات مقاله و سئو
            </h2>

            <div className="space-y-5">
              <ArticleImageUploader
  value={form.image}
  onChange={(url) => changeField("image", url)}
/>
              {fields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className="mb-2 block text-sm font-bold"
                  >
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>

                  {field.multiline ? (
                    <textarea
                      id={field.name}
                      value={form[field.name]}
                      onChange={(event) =>
                        changeField(
                          field.name,
                          event.target.value
                        )
                      }
                      rows={field.rows ?? 4}
                      maxLength={field.maxLength}
                      required={field.required}
                      className={inputClass}
                      dir={field.dir}
                    />
                  ) : (
                    <input
                      id={field.name}
                      type="text"
                      value={form[field.name]}
                      onChange={(event) =>
                        changeField(
                          field.name,
                          event.target.value
                        )
                      }
                      maxLength={field.maxLength}
                      required={field.required}
                      className={inputClass}
                      dir={field.dir}
                    />
                  )}
                </div>
              ))}
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

          {message && (
            <div
              role="status"
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-500"
            >
              {message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || !dirty}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving
                ? "در حال انجام..."
                : "ذخیره تغییرات"}
            </button>

            {article.status === "draft" ? (
              <button
                type="button"
                onClick={() => void handleStatus("publish")}
                disabled={saving}
                className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                انتشار مقاله
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleStatus("unpublish")}
                disabled={saving}
                className="rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                لغو انتشار
              </button>
            )}
          </div>

          {dirty && (
            <p className="text-xs text-amber-500">
              تغییرات ذخیره‌نشده داری. قبل از انتشار،
              ذخیره تغییرات را بزن.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
