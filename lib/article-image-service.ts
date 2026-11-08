
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getContent } from "@/lib/content";

const BUCKET = "article-images";
const FOLDER = "covers";

const PAGE_SIZE = 100;
const MAX_FILES = 10000;
const MAX_ARTICLES = 10000;
const PAGE_SIZE_DB = 500;

export type ArticleImageItem = {
  path: string;
  url: string;
  used: boolean;
  usedAsCover: boolean;
  usedInBody: boolean;
  usedInSettings: boolean;
  size: number;
  createdAt: string | null;
  articleTitles: string[];
  deletionCandidate: boolean;
};

export type ArticleImageReport = {
  images: ArticleImageItem[];
  total: number;
  used: number;
  unused: number;
  deletionCandidates: number;
};

type ArticleReference = {
  id: string;
  title: string;
  image: string | null;
  body: string | null;
};

export async function getArticleImageReport():
  Promise<ArticleImageReport> {
  const supabase = getSupabaseAdmin();

  // دریافت محتوای ذخیره‌شده سایت
  const content = await getContent();
  const serializedContent = JSON.stringify(content);

  // دریافت فایل‌های پوشه covers از Storage
  const files: {
    name: string;
    size: number;
    createdAt: string | null;
  }[] = [];

  for (
    let offset = 0;
    offset < MAX_FILES;
    offset += PAGE_SIZE
  ) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER, {
        limit: PAGE_SIZE,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      throw new Error("خطا در دریافت تصاویر Storage");
    }

    const entries = data ?? [];

    for (const file of entries) {
      // پوشه‌ها را به‌عنوان تصویر در نظر نمی‌گیریم
      if (!file.id) continue;

      files.push({
        name: file.name,
        size: Number(
  (file.metadata as { size?: number | string } | null)?.size ?? 0
),
createdAt:
  (file as typeof file & { created_at?: string | null }).created_at ?? null,      });
    }

    if (entries.length < PAGE_SIZE) {
      break;
    }

    if (offset + PAGE_SIZE >= MAX_FILES) {
      throw new Error(
        "تعداد تصاویر از ظرفیت گزارش بیشتر است."
      );
    }
  }

  // دریافت تمام مقالات، شامل پیش‌نویس‌ها
  const articles: ArticleReference[] = [];

  for (
    let offset = 0;
    offset < MAX_ARTICLES;
    offset += PAGE_SIZE_DB
  ) {
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, image, body")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE_DB - 1);

    if (error) {
      throw new Error(
        "خطا در بررسی ارجاع تصاویر مقالات"
      );
    }

    const rows = data ?? [];
    articles.push(...rows);

    if (rows.length < PAGE_SIZE_DB) {
      break;
    }

    if (offset + PAGE_SIZE_DB >= MAX_ARTICLES) {
      throw new Error(
        "تعداد مقالات از ظرفیت گزارش بیشتر است."
      );
    }
  }

  // دریافت ارجاع‌های ثبت‌شده در جدول مستقل تصاویر
  const referenceTitles = new Map<
    string,
    Set<string>
  >();

  for (
    let offset = 0;
    ;
    offset += PAGE_SIZE_DB
  ) {
    const { data, error } = await supabase
      .from("article_image_references")
      .select("article_id, storage_path")
      .order("article_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE_DB - 1);

    if (error) {
      // در صورت شکست بررسی، گزارش ناقص را نمایش نمی‌دهیم
      throw new Error(
        "خطا در دریافت ارجاع‌های ثبت‌شده تصاویر"
      );
    }

    const rows = data ?? [];

    for (const row of rows) {
      const article = articles.find(
        (item) => item.id === row.article_id
      );

      const titles =
        referenceTitles.get(row.storage_path) ??
        new Set<string>();

      if (article) {
        titles.add(article.title);
      }

      referenceTitles.set(
        row.storage_path,
        titles
      );
    }

    if (rows.length < PAGE_SIZE_DB) {
      break;
    }

    if (offset + PAGE_SIZE_DB >= MAX_ARTICLES) {
      throw new Error(
        "تعداد ارجاع‌های تصاویر از ظرفیت گزارش بیشتر است."
      );
    }
  }

  // ساخت گزارش نهایی تصاویر
  const images: ArticleImageItem[] = files.map(
    (file) => {
      const path = `${FOLDER}/${file.name}`;

      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      const url = data.publicUrl;

      const articleTitles =
        referenceTitles.get(path) ??
        new Set<string>();

      let usedAsCover = articleTitles.size > 0;
      let usedInBody = false;

      // بررسی ارجاع مستقیم در تصویر شاخص و متن مقالات
      for (const article of articles) {
        const cover = article.image ?? "";
        const body = article.body ?? "";

        if (
          cover === url ||
          cover === path ||
          cover.includes(
            `/article-images/${path}`
          ) ||
          cover.includes(file.name)
        ) {
          usedAsCover = true;
          articleTitles.add(article.title);
        }

        if (
          body.includes(url) ||
          body.includes(path) ||
          body.includes(file.name)
        ) {
          usedInBody = true;
          articleTitles.add(article.title);
        }
      }

      // بررسی تنظیمات و سایر محتوای ذخیره‌شده سایت
      const referenceChecks = [
        path,
        url,
        `/${BUCKET}/${path}`,
        file.name,
      ];

      const usedInSettings =
        referenceChecks.some((value) =>
          serializedContent.includes(value)
        );

      // تصویر دارای هر نوع ارجاع شناخته‌شده، استفاده‌شده است
      const used =
        usedAsCover ||
        usedInBody ||
        usedInSettings;

      const createdTime = file.createdAt
        ? new Date(file.createdAt).getTime()
        : NaN;

      const olderThanSevenDays =
        Number.isFinite(createdTime) &&
        Date.now() - createdTime >
          7 * 24 * 60 * 60 * 1000;

      return {
        path,
        url,
        used,
        usedAsCover,
        usedInBody,
        usedInSettings,
        size: file.size,
        createdAt: file.createdAt,
        articleTitles: [...articleTitles],

        // فقط کاندید گزارش؛ مجوز حذف نیست
        deletionCandidate:
          !used && olderThanSevenDays,
      };
    }
  );

  return {
    images,
    total: images.length,
    used: images.filter(
      (image) => image.used
    ).length,
    unused: images.filter(
      (image) => !image.used
    ).length,
    deletionCandidates: images.filter(
      (image) => image.deletionCandidate
    ).length,
  };
}
