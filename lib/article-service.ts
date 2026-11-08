
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

import {
  validateArticleInput,
  validateArticleUpdate,
} from "@/lib/article-validation";

export type CreateArticleInput = {
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  image?: string;
  category?: string;
  author?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
};

export type ArticleRecord = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  created_at: string;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function optionalText(value?: string): string {
  return value?.trim() ?? "";
}

export async function createArticleDraft(
  input: CreateArticleInput
): Promise<ArticleRecord> {
    input = validateArticleInput(input);

  const title = input.title?.trim();
  const slug = input.slug?.trim().toLowerCase();

  if (!title || title.length > 200) {
    throw new Error(
      "عنوان مقاله باید بین ۱ تا ۲۰۰ کاراکتر باشد."
    );
  }

  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new Error(
      "اسلاگ باید انگلیسی، با حروف کوچک و خط تیره باشد."
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .insert({
      title,
      slug,
      excerpt: optionalText(input.excerpt),
      body: optionalText(input.body),
      image: optionalText(input.image) || null,
      category: optionalText(input.category) || "عمومی",
      author: optionalText(input.author) || "تیم پراپ‌بین",
      seo_title: optionalText(input.seoTitle) || null,
      seo_description:
        optionalText(input.seoDescription) || null,
      keywords: optionalText(input.keywords) || null,
      canonical_url:
        optionalText(input.canonicalUrl) || null,
      status: "draft",
      published_at: null,
    })
    .select("id, title, slug, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "مقاله‌ای با این اسلاگ قبلاً ثبت شده است."
      );
    }

    console.error("Create article failed:", error);
    throw new Error("خطا در ذخیره مقاله در دیتابیس");
  }

  if (!data) {
    throw new Error("مقاله ایجاد شد اما پاسخ معتبر دریافت نشد.");
  }

  return data as ArticleRecord;
}


export type UpdateArticleInput = Partial<CreateArticleInput>;

function validateArticleId(id: string): string {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    throw new Error("شناسه مقاله معتبر نیست.");
  }

  return id;
}

function validateSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();

  if (
    !normalized ||
    !SLUG_PATTERN.test(normalized) ||
    normalized.length > 160
  ) {
    throw new Error("اسلاگ مقاله معتبر نیست.");
  }

  return normalized;
}

export async function updateArticle(
  id: string,
  input: UpdateArticleInput
): Promise<ArticleRecord> {
  const articleId = validateArticleId(id);
    input = validateArticleUpdate(input);
  const changes: Record<string, string | null> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();

    if (!title || title.length > 200) {
      throw new Error("عنوان مقاله نامعتبر است.");
    }

    changes.title = title;
  }

  if (input.slug !== undefined) {
    changes.slug = validateSlug(input.slug);
  }

  const optionalFields: Record<
    string,
    keyof CreateArticleInput
  > = {
    excerpt: "excerpt",
    body: "body",
    image: "image",
    category: "category",
    author: "author",
    seo_title: "seoTitle",
    seo_description: "seoDescription",
    keywords: "keywords",
    canonical_url: "canonicalUrl",
  };

  for (const [databaseField, inputField] of Object.entries(
    optionalFields
  )) {
    const value = input[inputField];

    if (value === undefined) continue;

    if (typeof value !== "string") {
      throw new Error(`مقدار ${inputField} نامعتبر است.`);
    }

    const trimmed = value.trim();

    if (databaseField === "category") {
      changes.category = trimmed || "عمومی";
    } else if (databaseField === "author") {
      changes.author = trimmed || "تیم پراپ‌بین";
    } else if (
      databaseField === "excerpt" ||
      databaseField === "body"
    ) {
      changes[databaseField] = trimmed;
    } else {
      changes[databaseField] = trimmed || null;
    }
  }

  if (Object.keys(changes).length === 0) {
    throw new Error("هیچ تغییری برای ذخیره وجود ندارد.");
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .update(changes)
    .eq("id", articleId)
    .select("id, title, slug, status, created_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("این اسلاگ قبلاً استفاده شده است.");
    }

    console.error("Article update failed:", error);
    throw new Error("ویرایش مقاله ناموفق بود.");
  }

  if (!data) {
    throw new Error("مقاله موردنظر پیدا نشد.");
  }

  return data as ArticleRecord;
}

export async function publishArticle(
  id: string
): Promise<ArticleRecord> {
  const articleId = validateArticleId(id);
  const supabase = getSupabaseAdmin();

  const { data: existing, error: readError } = await supabase
    .from("articles")
    .select("title, body, status, published_at")
    .eq("id", articleId)
    .maybeSingle();

  if (readError) {
    console.error("Article read failed:", readError);
    throw new Error("بررسی مقاله ناموفق بود.");
  }

  if (!existing) {
    throw new Error("مقاله موردنظر وجود ندارد.");
  }

  if (!existing.title?.trim() || !existing.body?.trim()) {
    throw new Error(
      "برای انتشار، عنوان و متن مقاله باید تکمیل شوند."
    );
  }

  if (existing.status === "published") {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, slug, status, created_at")
      .eq("id", articleId)
      .single();

    if (error) throw new Error("دریافت مقاله ناموفق بود.");
    return data as ArticleRecord;
  }

  const { data, error } = await supabase
    .from("articles")
    .update({
      status: "published",
      published_at: existing.published_at || new Date().toISOString(),
    })
    .eq("id", articleId)
    .select("id, title, slug, status, created_at")
    .maybeSingle();

  if (error) {
    console.error("Publish article failed:", error);
    throw new Error("انتشار مقاله ناموفق بود.");
  }

  if (!data) {
    throw new Error("مقاله برای انتشار پیدا نشد.");
  }

  return data as ArticleRecord;
}

export async function unpublishArticle(
  id: string
): Promise<ArticleRecord> {
  const articleId = validateArticleId(id);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .update({ status: "draft" })
    .eq("id", articleId)
    .select("id, title, slug, status, created_at")
    .maybeSingle();

  if (error) {
    console.error("Unpublish article failed:", error);
    throw new Error("لغو انتشار مقاله ناموفق بود.");
  }

  if (!data) {
    throw new Error("مقاله پیدا نشد.");
  }

  return data as ArticleRecord;
}

export async function deleteArticle(
  id: string
): Promise<void> {
  const articleId = validateArticleId(id);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .delete()
    .eq("id", articleId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Delete article failed:", error);
    throw new Error("حذف مقاله ناموفق بود.");
  }

  if (!data) {
    throw new Error("مقاله برای حذف پیدا نشد.");
  }
}


export type AdminArticleListItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export async function listAdminArticles(
  page = 1,
  pageSize = 20
): Promise<{
  articles: AdminArticleListItem[];
  total: number;
  totalPages: number;
}> {
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new Error("تنظیمات صفحه‌بندی معتبر نیست.");
  }

  const supabase = getSupabaseAdmin();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("articles")
    .select(
      `id, title, slug, category, status,
       created_at, updated_at, published_at`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Admin articles query failed:", error);
    throw new Error("دریافت مقالات مدیریت ناموفق بود.");
  }

  const total = count ?? 0;

  return {
    articles: (data ?? []) as AdminArticleListItem[],
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}


export type AdminArticleDetail = {
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
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAdminArticleById(
  id: string
): Promise<AdminArticleDetail | null> {
  const articleId = validateArticleId(id);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("articles")
    .select(`
      id,
      title,
      slug,
      excerpt,
      body,
      image,
      category,
      author,
      seo_title,
      seo_description,
      keywords,
      canonical_url,
      status,
      published_at,
      created_at,
      updated_at
    `)
    .eq("id", articleId)
    .maybeSingle();

  if (error) {
    console.error("Admin article detail failed:", error);
    throw new Error("دریافت اطلاعات مقاله ناموفق بود.");
  }

  return data as AdminArticleDetail | null;
}
