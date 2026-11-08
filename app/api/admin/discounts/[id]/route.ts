import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(origin && host && new URL(origin).host === host);
  } catch { /* reject invalid origin */ }
  if (!sameOrigin) {
    return NextResponse.json({ error: "مبدأ درخواست نامعتبر است" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "شناسه شرکت نامعتبر است" }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("prop_firms")
      .update({ code: "", discount: "", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Discount delete error:", error);
      return NextResponse.json({ error: "خطا در ذخیره حذف تخفیف" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "شرکت پیدا نشد" }, { status: 404 });
    }

    revalidatePath("/");
    revalidatePath("/discounts");
    revalidatePath("/firms");
    revalidatePath("/admin/discounts");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Discount delete unexpected error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try {
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json({ error: "مبدأ درخواست نامعتبر است" }, { status: 403 });
    }
  } catch { return NextResponse.json({ error: "مبدأ نامعتبر" }, { status: 403 }); }

  const { id } = await context.params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "شناسه شرکت نامعتبر است" }, { status: 400 });
  }
  let input: unknown;
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) throw new Error();
    const raw = await request.text();
    if (raw.length > 4096) throw new Error();
    input = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "اطلاعات ارسالی نامعتبر است" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "اطلاعات ارسالی نامعتبر است" }, { status: 400 });
  }
  const values = input as Record<string, unknown>;
  if (typeof values.code !== "string" || typeof values.discount !== "string") {
    return NextResponse.json({ error: "کد یا مقدار تخفیف نامعتبر است" }, { status: 400 });
  }
  const code = values.code.trim();
  const discount = values.discount.trim();
  if (!code || !discount || code.length > 100 || discount.length > 100) {
    return NextResponse.json({ error: "کد و مقدار تخفیف باید بین ۱ تا ۱۰۰ کاراکتر باشند" }, { status: 400 });
  }
  try {
    const { data, error } = await getSupabaseAdmin().from("prop_firms")
      .update({ code, discount, updated_at: new Date().toISOString() })
      .eq("id", id).select("id").maybeSingle();
    if (error) {
      console.error("Discount save error:", error);
      return NextResponse.json({ error: "ذخیره تخفیف ناموفق بود" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "شرکت پیدا نشد" }, { status: 404 });
    revalidatePath("/");
    revalidatePath("/discounts");
    revalidatePath("/firms");
    revalidatePath("/admin/discounts");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Discount save unexpected error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
