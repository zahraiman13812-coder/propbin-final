import { validOrigin } from "@/lib/guard";

import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

const MAX_BODY_SIZE = 16 * 1024;

const FIRM_ID_PATTERN =
  /^[a-z0-9][a-z0-9_-]{0,79}$/;

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

type UpdateFirm = Partial<
  Record<TextField, string>
> & {
  website?: string | null;
  is_active?: boolean;
  sort_order?: number;
};
function respond(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function sameOrigin(request: Request): boolean {
  return validOrigin(request);
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.body) {
    throw new Error("EMPTY_BODY");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    total += value.byteLength;

    if (total > MAX_BODY_SIZE) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(
    new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes)
  );
}

function validateUpdate(input: unknown):
  | { success: true; data: UpdateFirm }
  | { success: false; error: string } {

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {
      success: false,
      error: "اطلاعات ویرایش نامعتبر است.",
    };
  }

  const values = input as Record<string, unknown>;

  const allowed = new Set<string>([
  ...TEXT_FIELDS,
  "website",
  "is_active",
  "sort_order",
]);

  const keys = Object.keys(values);

  if (keys.length === 0) {
    return {
      success: false,
      error: "هیچ تغییری ارسال نشده است.",
    };
  }

  for (const key of keys) {
    if (!allowed.has(key)) {
      return {
        success: false,
        error: `فیلد ${key} قابل ویرایش نیست.`,
      };
    }
  }

  const data: UpdateFirm = {};

  for (const field of TEXT_FIELDS) {
    if (!(field in values)) continue;

    const value = values[field];

    if (typeof value !== "string") {
      return {
        success: false,
        error: `مقدار فیلد ${field} باید متن باشد.`,
      };
    }

    const trimmed = value.trim();

    const maxLength =
      field === "description" ? 5000 : 300;

    if (trimmed.length > maxLength) {
      return {
        success: false,
        error: `مقدار فیلد ${field} بیش از حد طولانی است.`,
      };
    }

    if (
      field === "name" &&
      trimmed.length === 0
    ) {
      return {
        success: false,
        error: "نام شرکت نمی‌تواند خالی باشد.",
      };
    }

    if (field === "rating") {
      const rating = Number(trimmed);

      if (
        trimmed === "" ||
        !Number.isFinite(rating) ||
        rating < 0 ||
        rating > 5
      ) {
        return {
          success: false,
          error: "امتیاز باید عددی بین صفر تا پنج باشد.",
        };
      }
    }

    if (
      field === "color" &&
      !/^#[0-9a-fA-F]{6}$/.test(trimmed)
    ) {
      return {
        success: false,
        error: "رنگ باید مانند #4986ff باشد.",
      };
    }

    data[field] = trimmed;
  }

  
if ("website" in values) {
  const website = values.website;

  if (website === null || website === "") {
    data.website = null;
  } else if (typeof website !== "string") {
    return {
      success: false,
      error: "آدرس وب‌سایت نامعتبر است.",
    };
  } else {
    const trimmed = website.trim();

    if (trimmed.length === 0) {
      data.website = null;
    } else {
      if (trimmed.length > 2048) {
        return {
          success: false,
          error: "آدرس وب‌سایت بیش از حد طولانی است.",
        };
      }

      try {
        const url = new URL(trimmed);

        if (
          url.protocol !== "https:" ||
          !url.hostname.includes(".") ||
          url.username ||
          url.password
        ) {
          return {
            success: false,
            error:
              "آدرس وب‌سایت باید معتبر و با https:// شروع شود.",
          };
        }

        data.website = url.toString();
      } catch {
        return {
          success: false,
          error: "فرمت آدرس وب‌سایت معتبر نیست.",
        };
      }
    }
  }
}


  if ("is_active" in values) {
    if (typeof values.is_active !== "boolean") {
      return {
        success: false,
        error: "وضعیت شرکت باید صحیح یا غلط باشد.",
      };
    }

    data.is_active = values.is_active;
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

    data.sort_order = order;
  }

  return {
    success: true,
    data,
  };
}

// دریافت اطلاعات یک شرکت برای پنل مدیر
export async function GET(
  _request: Request,
  context: Context
) {
  try {
    if (!(await isAdmin())) {
      return respond(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        401
      );
    }

    const { id } = await context.params;

    if (!FIRM_ID_PATTERN.test(id)) {
      return respond(
        {
          success: false,
          error: "شناسه شرکت نامعتبر است.",
        },
        400
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("prop_firms")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Get firm error:", error);

      return respond(
        {
          success: false,
          error: "خطا در دریافت شرکت",
        },
        500
      );
    }

    if (!data) {
      return respond(
        {
          success: false,
          error: "شرکت پیدا نشد.",
        },
        404
      );
    }

    return respond({
      success: true,
      firm: data,
    });
  } catch (error) {
    console.error("Admin firm GET error:", error);

    return respond(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      500
    );
  }
}

// ویرایش اطلاعات شرکت
export async function PATCH(
  request: Request,
  context: Context
) {
  try {
    // بررسی دسترسی مدیر
    if (!(await isAdmin())) {
      return respond(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        401
      );
    }

    // بررسی مبدأ درخواست
    if (!sameOrigin(request)) {
      return respond(
        {
          success: false,
          error: "مبدأ درخواست نامعتبر است.",
        },
        403
      );
    }

    // بررسی نوع درخواست
    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !/^application\/json(?:\s*;|$)/i.test(
        contentType
      )
    ) {
      return respond(
        {
          success: false,
          error: "درخواست باید JSON باشد.",
        },
        415
      );
    }

    const declaredLength =
      request.headers.get("content-length");

    if (declaredLength !== null) {
      const size = Number(declaredLength);

      if (
        !Number.isSafeInteger(size) ||
        size < 0 ||
        size > MAX_BODY_SIZE
      ) {
        return respond(
          {
            success: false,
            error: "حجم درخواست نامعتبر است.",
          },
          413
        );
      }
    }

    const { id } = await context.params;

    if (!FIRM_ID_PATTERN.test(id)) {
      return respond(
        {
          success: false,
          error: "شناسه شرکت نامعتبر است.",
        },
        400
      );
    }

    let input: unknown;

    try {
      input = await readJson(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BODY_TOO_LARGE"
      ) {
        return respond(
          {
            success: false,
            error: "حجم درخواست بیش از حد مجاز است.",
          },
          413
        );
      }

      return respond(
        {
          success: false,
          error: "JSON درخواست نامعتبر است.",
        },
        400
      );
    }

    const validated = validateUpdate(input);

    if (!validated.success) {
      return respond(
        {
          success: false,
          error: validated.error,
        },
        400
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("prop_firms")
      .update({
        ...validated.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Update firm error:", error);

      return respond(
        {
          success: false,
          error: "ذخیره تغییرات شرکت ناموفق بود.",
        },
        500
      );
    }

    if (!data) {
      return respond(
        {
          success: false,
          error: "شرکت پیدا نشد.",
        },
        404
      );
    }

    return respond({
      success: true,
      message: "اطلاعات شرکت با موفقیت ذخیره شد.",
      firm: data,
    });
  } catch (error) {
    console.error("Admin firm PATCH error:", error);

    return respond(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      500
    );
  }
}


/**
 * حذف دائمی یک شرکت پراپ
 *
 * شرایط:
 * - فقط مدیر سایت
 * - درخواست از همان مبدأ سایت
 * - شرکت باید غیرفعال باشد
 * - تأیید با شناسه دقیق شرکت
 */
export async function DELETE(
  request: Request,
  context: Context
) {
  try {
    if (!(await isAdmin())) {
      return respond(
        {
          success: false,
          error: "دسترسی غیرمجاز",
        },
        401
      );
    }

    if (!sameOrigin(request)) {
      return respond(
        {
          success: false,
          error: "مبدأ درخواست نامعتبر است.",
        },
        403
      );
    }

    const { id } = await context.params;

    if (!FIRM_ID_PATTERN.test(id)) {
      return respond(
        {
          success: false,
          error: "شناسه شرکت نامعتبر است.",
        },
        400
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "";

    if (
      !/^application\/json(?:\s*;|$)/i.test(
        contentType
      )
    ) {
      return respond(
        {
          success: false,
          error: "درخواست باید JSON باشد.",
        },
        415
      );
    }

    let input: unknown;

    try {
      input = await readJson(request);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "BODY_TOO_LARGE"
      ) {
        return respond(
          {
            success: false,
            error: "حجم درخواست بیش از حد مجاز است.",
          },
          413
        );
      }

      return respond(
        {
          success: false,
          error: "اطلاعات تأیید حذف نامعتبر است.",
        },
        400
      );
    }

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return respond(
        {
          success: false,
          error: "تأیید حذف نامعتبر است.",
        },
        400
      );
    }

    const body = input as Record<string, unknown>;

    if (
      typeof body.confirmId !== "string" ||
      body.confirmId !== id
    ) {
      return respond(
        {
          success: false,
          error:
            "برای حذف، شناسه دقیق شرکت را وارد کنید.",
        },
        400
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existing, error: readError } =
      await supabase
        .from("prop_firms")
        .select("id, name, is_active")
        .eq("id", id)
        .maybeSingle();

    if (readError) {
      console.error("Read firm before delete:", readError);

      return respond(
        {
          success: false,
          error: "بررسی وضعیت شرکت ناموفق بود.",
        },
        500
      );
    }

    if (!existing) {
      return respond(
        {
          success: false,
          error: "شرکت پیدا نشد.",
        },
        404
      );
    }

    if (existing.is_active) {
      return respond(
        {
          success: false,
          error:
            "برای حذف شرکت، ابتدا آن را غیرفعال کنید.",
        },
        409
      );
    }

    // شرط is_active هنگام حذف نیز بررسی می‌شود
    // تا شرکت فعال بر اثر تغییر هم‌زمان حذف نشود.
    const { data: deleted, error: deleteError } =
      await supabase
        .from("prop_firms")
        .delete()
        .eq("id", id)
        .eq("is_active", false)
        .select("id");

    if (deleteError) {
      console.error("Delete firm error:", deleteError);

      return respond(
        {
          success: false,
          error: "حذف شرکت ناموفق بود.",
        },
        500
      );
    }

    if (!deleted || deleted.length === 0) {
      return respond(
        {
          success: false,
          error:
            "شرکت حذف نشد؛ ممکن است وضعیت آن تغییر کرده باشد.",
        },
        409
      );
    }

    return respond({
      success: true,
      message: "شرکت با موفقیت حذف شد.",
      deletedId: id,
    });
  } catch (error) {
    console.error("Admin firm DELETE error:", error);

    return respond(
      {
        success: false,
        error: "خطای داخلی سرور",
      },
      500
    );
  }
}
