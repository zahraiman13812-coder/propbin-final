import { validOrigin } from "@/lib/guard";

import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import {
  listAdminArticles,
  createArticleDraft,
} from "@/lib/article-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // بررسی مجوز مدیر
    const admin = await isAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // دریافت شماره صفحه و تعداد رکوردها
    const { searchParams } = new URL(request.url);

    const pageText = searchParams.get("page") ?? "1";
    const sizeText = searchParams.get("pageSize") ?? "20";

    if (
      !/^[1-9]\d*$/.test(pageText) ||
      !/^[1-9]\d*$/.test(sizeText)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "مقادیر صفحه‌بندی نامعتبر هستند",
        },
        { status: 400 }
      );
    }

    const page = Number(pageText);
    const pageSize = Number(sizeText);

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(pageSize) ||
      page > 100000 ||
      pageSize > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "مقادیر صفحه‌بندی نامعتبر هستند",
        },
        { status: 400 }
      );
    }

    // دریافت مقالات از Supabase
    const result = await listAdminArticles(
      page,
      pageSize
    );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin articles API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        { status: 401 }
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          error: "فرمت درخواست باید JSON باشد",
        },
        { status: 415 }
      );
    }

    // جلوگیری از درخواست‌های بین‌سایتی
    if (!validOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          error: "مبدأ درخواست معتبر نیست",
        },
        { status: 403 }
      );
    }

    const maxBytes = 1024 * 1024;
    const size = Number(
      request.headers.get("content-length") ?? "0"
    );

    if (size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: "حجم درخواست بیش از حد مجاز است",
        },
        { status: 413 }
      );
    }

    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).length > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: "حجم درخواست بیش از حد مجاز است",
        },
        { status: 413 }
      );
    }

    let input: unknown;

    try {
      input = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "JSON نامعتبر است",
        },
        { status: 400 }
      );
    }

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "اطلاعات مقاله معتبر نیست",
        },
        { status: 400 }
      );
    }

    const article = await createArticleDraft(
      input as Parameters<typeof createArticleDraft>[0]
    );

    return NextResponse.json(
      {
        success: true,
        article,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Create article API error:", error);

    if (error instanceof Error) {
      const message = error.message;

      if (
        message.includes("الزامی") ||
        message.includes("نامعتبر") ||
        message.includes("کاراکتر") ||
        message.includes("اسلاگ") ||
        message.includes("قبلاً ثبت")
      ) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      { status: 500 }
    );
  }
}
