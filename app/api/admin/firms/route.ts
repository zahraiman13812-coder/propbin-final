import { validOrigin } from "@/lib/guard";

import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 180 * 1024;

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;

const TEXT_FIELDS = [
  "name",
  "rating",
  "capital",
  "profit",
  "fee",
  "discount",
  "code",
  "color",
  "description",
  "payout",
  "purchase_method",
  "challenge",
  "logo_text",
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

type CreateFirmData = {
  id: string;
  name: string;
  rating: string;
  capital: string;
  profit: string;
  fee: string;
  discount: string;
  code: string;
  color: string;
  description: string;
  payout: string;
  purchase_method: string;
  challenge: string;
  logo_text: string;
  logo: string;
  is_active: boolean;
  sort_order: number;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isSameOrigin(request: Request): boolean {
  return validOrigin(request);
}

async function readLimitedJson(
  request: Request
): Promise<unknown> {
  if (!request.body) {
    throw new Error("INVALID_JSON");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    total += value.byteLength;

    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }

    chunks.push(value);
  }

  const buffer = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(buffer)
    );
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function validateFirm(input: unknown):
  | { success: true; firm: CreateFirmData }
  | { success: false; error: string } {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {
      success: false,
      error: "اطلاعات شرکت نامعتبر است.",
    };
  }

  const values = input as Record<string, unknown>;

  const allowedKeys = new Set<string>([
    "id",
    ...TEXT_FIELDS,
    "logo",
    "sort_order",
    "is_active",
  ]);

  for (const key of Object.keys(values)) {
    if (!allowedKeys.has(key)) {
      return {
        success: false,
        error: `فیلد ${key} مجاز نیست.`,
      };
    }
  }

  if (
    typeof values.id !== "string" ||
    !ID_PATTERN.test(values.id)
  ) {
    return {
      success: false,
      error:
        "شناسه باید با حرف یا عدد انگلیسی شروع شود و فقط شامل حروف کوچک انگلیسی، اعداد، خط تیره و زیرخط باشد.",
    };
  }

  if (
    typeof values.name !== "string" ||
    !values.name.trim() ||
    values.name.trim().length > 300
  ) {
    return {
      success: false,
      error: "نام شرکت الزامی است و حداکثر ۳۰۰ کاراکتر دارد.",
    };
  }

  const firm: CreateFirmData = {
    id: values.id,
    name: "",
    rating: "0",
    capital: "",
    profit: "",
    fee: "",
    discount: "",
    code: "",
    color: "#64748b",
    description: "",
    payout: "",
    purchase_method: "",
    challenge: "",
    logo_text: "",
    logo: "",
    is_active: false,
    sort_order: 0,
  };

  // لوگوی بارگذاری‌شده فقط باید PNG/JPEG/WebP با حجم Base64 محدود باشد.
  if ("logo" in values) {
    if (typeof values.logo !== "string" ||
      (values.logo !== "" && (
        values.logo.length > 150000 ||
        !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(values.logo)
      ))) {
      return { success: false, error: "فرمت یا حجم لوگوی شرکت معتبر نیست." };
    }
    firm.logo = values.logo;
  }

  for (const field of TEXT_FIELDS) {
    if (!(field in values)) continue;

    const value = values[field];

    if (typeof value !== "string") {
      return {
        success: false,
        error: `فیلد ${field} باید متنی باشد.`,
      };
    }

    const text = value.trim();
    const maxLength =
      field === "description" ? 5000 : 300;

    if (text.length > maxLength) {
      return {
        success: false,
        error: `فیلد ${field} بیش از حد طولانی است.`,
      };
    }

    firm[field] = text;
  }

  if (!firm.name) {
    return {
      success: false,
      error: "نام شرکت نمی‌تواند خالی باشد.",
    };
  }

  const rating = Number(firm.rating);

  if (
    firm.rating === "" ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    return {
      success: false,
      error: "امتیاز باید عددی بین صفر تا پنج باشد.",
    };
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(firm.color)) {
    return {
      success: false,
      error: "رنگ شرکت باید مانند #64748b باشد.",
    };
  }

  if ("sort_order" in values) {
    const order = values.sort_order;

    if (
      typeof order !== "number" ||
      !Number.isInteger(order) ||
      order < 0 ||
      order > 10000
    ) {
      return {
        success: false,
        error: "ترتیب نمایش باید عددی بین صفر تا ۱۰۰۰۰ باشد.",
      };
    }

    firm.sort_order = order;
  }

  if ("is_active" in values) {
    if (typeof values.is_active !== "boolean") {
      return {
        success: false,
        error: "وضعیت شرکت نامعتبر است.",
      };
    }

    // ثبت اولیه همیشه غیرفعال است.
    // انتشار بعداً از API ویرایش انجام می‌شود.
    if (values.is_active !== false) {
      return {
        success: false,
        error:
          "شرکت جدید ابتدا باید غیرفعال ثبت شود.",
      };
    }
  }

  return {
    success: true,
    firm,
  };
}

export async function POST(request: Request) {
  try {
    // 1. احراز هویت مدیر
    if (!(await isAdmin())) {
      return json(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        401
      );
    }

    // 2. محافظت در برابر درخواست بین‌سایتی
    if (!isSameOrigin(request)) {
      return json(
        {
          success: false,
          error: "مبدأ درخواست نامعتبر است.",
        },
        403
      );
    }

    // 3. بررسی فرمت درخواست
    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !/^application\/json(?:\s*;|$)/i.test(
        contentType
      )
    ) {
      return json(
        {
          success: false,
          error: "درخواست باید JSON باشد.",
        },
        415
      );
    }

    const contentLength =
      request.headers.get("content-length");

    if (contentLength !== null) {
      const length = Number(contentLength);

      if (
        !Number.isSafeInteger(length) ||
        length < 0 ||
        length > MAX_BODY_BYTES
      ) {
        return json(
          {
            success: false,
            error: "حجم درخواست نامعتبر است.",
          },
          413
        );
      }
    }

    // 4. خواندن امن بدنه درخواست
    let input: unknown;

    try {
      input = await readLimitedJson(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BODY_TOO_LARGE"
      ) {
        return json(
          {
            success: false,
            error: "حجم درخواست بیش از حد مجاز است.",
          },
          413
        );
      }

      return json(
        {
          success: false,
          error: "JSON نامعتبر است.",
        },
        400
      );
    }

    // 5. اعتبارسنجی اطلاعات شرکت
    const validated = validateFirm(input);

    if (!validated.success) {
      return json(
        {
          success: false,
          error: validated.error,
        },
        400
      );
    }

    // 6. ثبت شرکت در Supabase
    
    // 6. ثبت شرکت در PostgreSQL
    const supabase = getSupabaseAdmin();

    // شناسه متنی فرم را در ستون UUID ذخیره نمی‌کنیم.
    // PostgreSQL خودش UUID تولید می‌کند.
    const { id: _formId, ...firmData } = validated.firm;

    const { data, error } = await supabase
      .from("prop_firms")
      .insert(firmData)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(
          {
            success: false,
            error: "شرکتی با این شناسه قبلاً ثبت شده است.",
          },
          409
        );
      }

      console.error("Create firm error:", error);

      return json(
        {
          success: false,
          error: "ثبت شرکت در پایگاه داده ناموفق بود.",
        },
        500
      );
    }

    return json(
      {
        success: true,
        message: "شرکت جدید با موفقیت ثبت شد.",
        firm: data,
      },
      201
    );
  } catch (error) {
    console.error("Admin create firm error:", error);

    return json(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      500
    );
  }
}
