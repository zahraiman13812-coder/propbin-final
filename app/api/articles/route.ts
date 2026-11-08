
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";

import {
  listAdminArticles,
} from "@/lib/article-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // بررسی ورود مدیر قبل از دریافت داده
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, error: "دسترسی غیرمجاز" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const { searchParams } = new URL(request.url);

    const pageText = searchParams.get("page") ?? "1";
    const sizeText = searchParams.get("pageSize") ?? "20";

    if (
      !/^[1-9]\d*$/.test(pageText) ||
      !/^[1-9]\d*$/.test(sizeText)
    ) {
      return NextResponse.json(
        { success: false, error: "صفحه‌بندی نامعتبر است" },
        { status: 400 }
      );
    }

    const page = Number(pageText);
    const pageSize = Number(sizeText);

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(pageSize) ||
      pageSize > 100 ||
      page > 100000
    ) {
      return NextResponse.json(
        { success: false, error: "صفحه‌بندی نامعتبر است" },
        { status: 400 }
      );
    }

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
    console.error("Admin articles API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
