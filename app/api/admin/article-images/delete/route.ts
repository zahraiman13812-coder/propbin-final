import { validOrigin } from "@/lib/guard";

import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getContent } from "@/lib/content";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "article-images";
const MAX_BODY_BYTES = 4096;
const MAX_ARTICLES = 10000;

const PATH_PATTERN =
  /^covers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function sameOrigin(request: Request): boolean {
  return validOrigin(request);
}

async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("EMPTY_BODY");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    size += value.byteLength;

    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let position = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.byteLength;
  }

  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  );
}


async function isReferenced(
  path: string,
  publicUrl: string,
  filename: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // 1. بررسی جدول مستقل ارجاع تصاویر
  const {
    data: references,
    error: referenceError,
  } = await supabase
    .from("article_image_references")
    .select("article_id")
    .eq("storage_path", path)
    .limit(1);

  if (referenceError) {
    throw new Error("REFERENCE_CHECK_FAILED");
  }

  if ((references ?? []).length > 0) {
    return true;
  }

  // 2. بررسی تنظیمات و محتوای ذخیره‌شده سایت
  // اگر خواندن محتوا ناموفق باشد، خطا می‌دهیم تا حذف متوقف شود.
  const content = await getContent();
  const serializedContent = JSON.stringify(content);

  const checks = [
    path,
    publicUrl,
    `/${BUCKET}/${path}`,
    filename,
  ];

  const referencedInContent = checks.some((value) =>
    serializedContent.includes(value)
  );

  if (referencedInContent) {
    return true;
  }

  // 3. بررسی تمام مقالات، شامل پیش‌نویس‌ها
  for (
    let offset = 0;
    offset < MAX_ARTICLES;
    offset += 500
  ) {
    const { data, error } = await supabase
      .from("articles")
      .select("image, body")
      .order("id", { ascending: true })
      .range(offset, offset + 499);

    if (error) {
      throw new Error("ARTICLE_SCAN_FAILED");
    }

    const articles = data ?? [];

    for (const article of articles) {
      const image = article.image ?? "";
      const body = article.body ?? "";

      const referencedInArticle = checks.some(
        (value) =>
          image.includes(value) ||
          body.includes(value)
      );

      if (referencedInArticle) {
        return true;
      }
    }

    if (articles.length < 500) {
      return false;
    }

    if (offset + 500 >= MAX_ARTICLES) {
      throw new Error("ARTICLE_SCAN_LIMIT_REACHED");
    }
  }

  return false;
}


export async function DELETE(request: Request) {
  try {
    if (!(await isAdmin())) {
      return reply(
        { success: false, error: "دسترسی غیرمجاز" },
        401
      );
    }

    if (!sameOrigin(request)) {
      return reply(
        { success: false, error: "مبدأ درخواست نامعتبر است" },
        403
      );
    }

    if (
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers.get("content-type") ?? ""
      )
    ) {
      return reply(
        { success: false, error: "فرمت درخواست نامعتبر است" },
        415
      );
    }

    const contentLength = request.headers.get("content-length");

    if (contentLength !== null) {
      const size = Number(contentLength);

      if (
        !Number.isSafeInteger(size) ||
        size < 0 ||
        size > MAX_BODY_BYTES
      ) {
        return reply(
          { success: false, error: "حجم درخواست نامعتبر است" },
          413
        );
      }
    }

    let payload: unknown;

    try {
      payload = await readBoundedJson(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BODY_TOO_LARGE"
      ) {
        return reply(
          { success: false, error: "حجم درخواست بیش از حد مجاز است" },
          413
        );
      }

      return reply(
        { success: false, error: "بدنه درخواست نامعتبر است" },
        400
      );
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return reply(
        { success: false, error: "اطلاعات درخواست نامعتبر است" },
        400
      );
    }

    const body = payload as Record<string, unknown>;
    const path = body.path;

    if (
      typeof path !== "string" ||
      !PATH_PATTERN.test(path)
    ) {
      return reply(
        {
          success: false,
          error: "فقط تصاویر دارای مسیر معتبر پوشه covers مجاز هستند",
        },
        400
      );
    }

    const filename = path.split("/").pop()!;

    if (
      body.confirmFilename !== filename ||
      body.confirmUnused !== true
    ) {
      return reply(
        { success: false, error: "تأیید حذف معتبر نیست" },
        400
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    // اطمینان از وجود دقیق فایل در Storage
    const { data: files, error: listError } =
      await supabase.storage
        .from(BUCKET)
        .list("covers", {
          search: filename,
          limit: 100,
        });

    if (listError) {
      throw new Error("STORAGE_LIST_FAILED");
    }

    const exists = (files ?? []).some(
      (file) => file.name === filename && file.id !== null
    );

    if (!exists) {
      return reply(
        { success: false, error: "تصویر پیدا نشد" },
        404
      );
    }

    // اگر بررسی ارجاع شکست بخورد، حذف انجام نمی‌شود
    let referenced: boolean;

    try {
      referenced = await isReferenced(
        path,
        publicData.publicUrl,
        filename
      );
    } catch {
      return reply(
        {
          success: false,
          error: "بررسی ارجاع تصویر کامل نشد؛ حذف انجام نشد",
        },
        503
      );
    }

    if (referenced) {
      return reply(
        {
          success: false,
          error: "تصویر هنوز در یک یا چند مقاله استفاده می‌شود",
        },
        409
      );
    }
    // حالت آزمایشی: فقط بررسی ارجاع، بدون حذف فایل
if (body.dryRun === true) {
  return reply({
    success: true,
    dryRun: true,
    deleted: false,
    checkedPath: path,
    message: "بررسی ارجاع انجام شد؛ فایلی حذف نشد.",
  });
}

    const { data: removed, error: removeError } =
      await supabase.storage
        .from(BUCKET)
        .remove([path]);

    if (removeError) {
      console.error("Image removal failed:", removeError);

      return reply(
        { success: false, error: "حذف تصویر ناموفق بود" },
        500
      );
    }

    const confirmed = (removed ?? []).some(
      (file) =>
        file.name === filename ||
        file.name === path
    );

    if (!confirmed) {
      return reply(
        {
          success: false,
          error: "نتیجه حذف قطعی نیست؛ Storage را بررسی کنید",
        },
        502
      );
    }

    return reply({
      success: true,
      deletedPath: path,
      message: "تصویر حذف شد",
    });
  } catch (error) {
    console.error("Delete article image error:", error);

    return reply(
      { success: false, error: "خطای داخلی سرور" },
      500
    );
  }
}
