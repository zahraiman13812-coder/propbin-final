import { validOrigin } from "@/lib/guard";

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

import {
  getAdminArticleById,
  updateArticle,
  publishArticle,
  unpublishArticle,
  type UpdateArticleInput,
} from "@/lib/article-service";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

type ArticleAction =
  | "update"
  | "publish"
  | "unpublish";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 1024 * 1024;

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function isValidId(id: string) {
  return UUID_PATTERN.test(id);
}

function isSameOrigin(request: Request): boolean {
  return validOrigin(request);
}

function isValidationError(message: string) {
  return [
    "نامعتبر",
    "الزامی",
    "اسلاگ",
    "کاراکتر",
    "هیچ تغییری",
    "برای انتشار",
    "قبلاً استفاده",
    "آدرس معتبری",
    "نباید",
  ].some((word) => message.includes(word));
}

export async function GET(
  _request: Request,
  { params }: Context
) {
  try {
    if (!(await isAdmin())) {
      return json({
        success: false,
        error: "دسترسی غیرمجاز",
      }, 401);
    }

    const { id } = await params;

    if (!isValidId(id)) {
      return json({
        success: false,
        error: "شناسه مقاله نامعتبر است",
      }, 400);
    }

    const article = await getAdminArticleById(id);

    if (!article) {
      return json({
        success: false,
        error: "مقاله پیدا نشد",
      }, 404);
    }

    return json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Admin article GET error:", error);

    return json({
      success: false,
      error: "خطای داخلی سرور",
    }, 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: Context
) {
  try {
    // اول مجوز مدیر بررسی می‌شود
    if (!(await isAdmin())) {
      return json({
        success: false,
        error: "دسترسی غیرمجاز",
      }, 401);
    }

    // جلوگیری از درخواست‌های بین‌سایتی
    if (!isSameOrigin(request)) {
      return json({
        success: false,
        error: "مبدأ درخواست معتبر نیست",
      }, 403);
    }

    const { id } = await params;

    if (!isValidId(id)) {
      return json({
        success: false,
        error: "شناسه مقاله نامعتبر است",
      }, 400);
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
      return json({
        success: false,
        error: "فرمت درخواست باید JSON باشد",
      }, 415);
    }

    const declaredLength = Number(
      request.headers.get("content-length") ?? "0"
    );

    if (
      !Number.isFinite(declaredLength) ||
      declaredLength < 0 ||
      declaredLength > MAX_BODY_BYTES
    ) {
      return json({
        success: false,
        error: "حجم درخواست نامعتبر است",
      }, 413);
    }

    // اندازه درخواست را هنگام خواندن محدود می‌کنیم
    const reader = request.body?.getReader();

    if (!reader) {
      return json({
        success: false,
        error: "بدنه درخواست خالی است",
      }, 400);
    }

    const chunks: Uint8Array[] = [];
    let total = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;

      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return json({
          success: false,
          error: "حجم درخواست بیش از حد مجاز است",
        }, 413);
      }

      chunks.push(value);
    }

    const buffer = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    let payload: unknown;

    try {
      const raw = new TextDecoder(
        "utf-8",
        { fatal: true }
      ).decode(buffer);

      payload = JSON.parse(raw);
    } catch {
      return json({
        success: false,
        error: "JSON نامعتبر است",
      }, 400);
    }

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      return json({
        success: false,
        error: "اطلاعات درخواست نامعتبر است",
      }, 400);
    }

    const body = payload as Record<string, unknown>;
    const action = body.action as ArticleAction;

    if (
      action !== "update" &&
      action !== "publish" &&
      action !== "unpublish"
    ) {
      return json({
        success: false,
        error: "عملیات نامعتبر است",
      }, 400);
    }

    // بررسی وجود مقاله
    const existing = await getAdminArticleById(id);

    if (!existing) {
      return json({
        success: false,
        error: "مقاله پیدا نشد",
      }, 404);
    }

    let article;

    if (action === "update") {
      if (
        !body.data ||
        typeof body.data !== "object" ||
        Array.isArray(body.data)
      ) {
        return json({
          success: false,
          error: "اطلاعات ویرایش نامعتبر است",
        }, 400);
      }

      article = await updateArticle(
        id,
        body.data as UpdateArticleInput
      );
    } else if (action === "publish") {
      article = await publishArticle(id);
    } else {
      article = await unpublishArticle(id);
    }

    return json({
      success: true,
      action,
      article,
    });
  } catch (error) {
    console.error("Admin article PATCH error:", error);

    if (
      error instanceof Error &&
      isValidationError(error.message)
    ) {
      return json({
        success: false,
        error: error.message,
      }, 400);
    }

    return json({
      success: false,
      error: "خطای داخلی سرور",
    }, 500);
  }
}


export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    if (!(await isAdmin())) {
      return Response.json(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        { status: 401 }
      );
    }

    const origin = request.headers.get("origin");

    if (!origin) {
      return Response.json(
        {
          success: false,
          error: "مبدأ درخواست مشخص نیست",
        },
        { status: 403 }
      );
    }

    try {
      if (
        !validOrigin(request)
      ) {
        return Response.json(
          {
            success: false,
            error: "مبدأ درخواست معتبر نیست",
          },
          { status: 403 }
        );
      }
    } catch {
      return Response.json(
        {
          success: false,
          error: "مبدأ درخواست معتبر نیست",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    if (!isUuid) {
      return Response.json(
        {
          success: false,
          error: "شناسه مقاله نامعتبر است",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: deletedArticle, error } =
      await supabase
        .from("articles")
        .delete()
        .eq("id", id)
        .select("id, title")
        .maybeSingle();

    if (error) {
      console.error("Article deletion failed:", error);

      return Response.json(
        {
          success: false,
          error: "حذف مقاله از دیتابیس ناموفق بود",
        },
        { status: 500 }
      );
    }

    if (!deletedArticle) {
      return Response.json(
        {
          success: false,
          error: "مقاله پیدا نشد یا قبلاً حذف شده است",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      deletedArticle: {
        id: deletedArticle.id,
        title: deletedArticle.title,
      },
      message: "مقاله حذف شد",
    });
  } catch (error) {
    console.error("Delete article API error:", error);

    return Response.json(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      { status: 500 }
    );
  }
}
