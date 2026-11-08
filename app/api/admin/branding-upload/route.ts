import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "branding-images";
const FOLDER = "branding";
const MAX_SIZE = 2 * 1024 * 1024;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function detectImageType(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return "jpg";

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  ) return "png";

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return "webp";

  return null;
}

const mimeByExtension = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) {
    return reply({ ok: false, error: "درخواست نامعتبر است." }, 403);
  }

  if (!(await isAdmin())) {
    return reply({ ok: false, error: "دسترسی غیرمجاز." }, 401);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_SIZE + 64 * 1024) {
    return reply({ ok: false, error: "حجم تصویر نباید بیشتر از ۲ مگابایت باشد." }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply({ ok: false, error: "فرمت فایل ارسالی نامعتبر است." }, 400);
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return reply({ ok: false, error: "تصویری انتخاب نشده است." }, 400);
  }

  if (file.size === 0 || file.size > MAX_SIZE) {
    return reply({ ok: false, error: "حجم تصویر باید کمتر از ۲ مگابایت باشد." }, 413);
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return reply({ ok: false, error: "فقط JPG، PNG و WebP پشتیبانی می‌شوند." }, 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = detectImageType(buffer);
  if (!extension || mimeByExtension[extension] !== file.type) {
    return reply({ ok: false, error: "فرمت واقعی تصویر معتبر نیست." }, 400);
  }

  const storagePath = `${FOLDER}/${randomUUID()}.${extension}`;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      console.error("Branding image Storage upload failed:", error.message);
      return reply({ ok: false, error: "آپلود تصویر برند در Supabase ناموفق بود." }, 500);
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    return reply({ ok: true, url: publicData.publicUrl, path: data.path }, 201);
  } catch (error) {
    console.error("Branding image upload error:", error);
    return reply({ ok: false, error: "خطا در ارتباط با فضای ذخیره‌سازی تصویر." }, 500);
  }
}
