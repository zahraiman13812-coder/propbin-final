
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { validOrigin } from "@/lib/guard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function validSignature(
  bytes: Uint8Array,
  mime: string
): boolean {
  if (mime === "image/png") {
    const signature = [
      137, 80, 78, 71, 13, 10, 26, 10,
    ];

    return signature.every(
      (byte, index) => bytes[index] === byte
    );
  }

  if (mime === "image/jpeg") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mime === "image/webp") {
    const header = new TextDecoder("ascii").decode(
      bytes.slice(0, 12)
    );

    return (
      header.startsWith("RIFF") &&
      header.slice(8, 12) === "WEBP"
    );
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return reply(
        { success: false, error: "دسترسی غیرمجاز" },
        401
      );
    }

    if (!validOrigin(request)) {
      return reply(
        {
          success: false,
          error: "مبدأ درخواست نامعتبر است",
        },
        403
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !contentType
        .toLowerCase()
        .startsWith("multipart/form-data;")
    ) {
      return reply(
        {
          success: false,
          error: "فرمت درخواست نامعتبر است",
        },
        415
      );
    }

    const contentLengthHeader =
      request.headers.get("content-length");

    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader);

      if (
        !Number.isSafeInteger(contentLength) ||
        contentLength <= 0 ||
        contentLength > MAX_REQUEST_SIZE
      ) {
        return reply(
          {
            success: false,
            error: "حجم درخواست نامعتبر است",
          },
          413
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return reply(
        {
          success: false,
          error: "تصویری انتخاب نشده است",
        },
        400
      );
    }

    if (
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      return reply(
        {
          success: false,
          error: "حداکثر حجم تصویر ۳ مگابایت است",
        },
        413
      );
    }

    const extension = ALLOWED_TYPES.get(file.type);

    if (!extension) {
      return reply(
        {
          success: false,
          error: "فقط JPG، PNG و WebP مجاز هستند",
        },
        415
      );
    }

    const bytes = new Uint8Array(
      await file.arrayBuffer()
    );

    if (!validSignature(bytes, file.type)) {
      return reply(
        {
          success: false,
          error: "محتوای فایل با نوع تصویر مطابقت ندارد",
        },
        400
      );
    }

    const pathname =
      `covers/${randomUUID()}.${extension}`;

    // Use the same persistent storage backend as the rest of the application.
    // The returned pathname is kept compatible with article image references.
    const storage = getSupabaseAdmin().storage.from("article-images");
    const { data, error } = await storage.upload(pathname, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error || !data) {
      console.error("Article cover storage error:", error?.message);
      return reply({ success: false, error: "ذخیره تصویر ناموفق بود." }, 500);
    }

    return reply(
      {
        success: true,
        url: storage.getPublicUrl(data.path).data.publicUrl,
        path: data.path,
      },
      201
    );
  } catch (error) {
    console.error("Article image upload error:", error);

    return reply(
      {
        success: false,
        error: "آپلود تصویر در فضای ذخیره‌سازی ناموفق بود.",
      },
      500
    );
  }
}
