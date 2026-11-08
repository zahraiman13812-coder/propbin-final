import { validOrigin } from "@/lib/guard";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const respond = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function sameOrigin(request: Request): boolean {
  return validOrigin(request);
}
async function canWrite(request: Request) { return (await isAdmin()) && sameOrigin(request); }

export async function GET() {
  if (!(await isAdmin())) return respond({ error: "دسترسی غیرمجاز" }, 401);
  try {
    const db = getSupabaseAdmin();
    const [firms, discounts] = await Promise.all([
      db.from("prop_firms").select("id,name,discount_intro,sort_order")
        .order("sort_order", { ascending: true }).order("id", { ascending: true }),
      db.from("firm_discounts").select("id,firm_id,code,amount,description,sort_order")
        .order("sort_order", { ascending: true }).order("id", { ascending: true }),
    ]);
    if (firms.error || discounts.error) throw firms.error || discounts.error;
    return respond({ firms: firms.data ?? [], discounts: discounts.data ?? [] });
  } catch (error) {
    console.error("discount admin GET", error);
    return respond({ error: "خطا در دریافت تخفیف‌ها؛ ساختار دیتابیس را بررسی کنید" }, 500);
  }
}

export async function POST(request: Request) {
  if (!(await canWrite(request))) return respond({ error: "دسترسی غیرمجاز یا مبدأ نامعتبر" }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 6000) return respond({ error: "حجم درخواست زیاد است" }, 413);
    const b = JSON.parse(raw);
    const firmId = String(b.firmId || "");
    if (!uuid.test(firmId)) return respond({ error: "شناسه شرکت نامعتبر است" }, 400);
    const db = getSupabaseAdmin();
    if (b.action === "intro") {
      if (typeof b.intro !== "string" || b.intro.length > 1000) return respond({ error: "توضیحات نامعتبر است" }, 400);
      const result = await db.from("prop_firms").update({ discount_intro: b.intro.trim() }).eq("id", firmId).select("id").maybeSingle();
      return result.error || !result.data ? respond({ error: "ذخیره توضیحات انجام نشد" }, 500) : respond({ success: true });
    }
    if (typeof b.code !== "string" || typeof b.amount !== "string" || typeof b.description !== "string") return respond({ error: "اطلاعات نامعتبر است" }, 400);
    const code = b.code.trim(), amount = b.amount.trim(), description = b.description.trim();
    if (!code || !amount || code.length > 100 || amount.length > 100 || description.length > 1000) return respond({ error: "مقادیر نامعتبر است" }, 400);
    if (b.id != null && (typeof b.id !== "string" || !uuid.test(b.id))) return respond({ error: "شناسه کد نامعتبر است" }, 400);
    // Codes need not be unique: separate offers may share the same coupon text.
    const r = b.id
      ? await db.from("firm_discounts").update({ code, amount, description }).eq("id", b.id).eq("firm_id", firmId).select("id").maybeSingle()
      : await db.from("firm_discounts").insert({ firm_id: firmId, code, amount, description, sort_order: 1000000 }).select("id").maybeSingle();
    if (r.error || !r.data) {
      console.error("discount save", r.error);
      return respond({ error: "ثبت کد ناموفق بود؛ محدودیت‌های دیتابیس را بررسی کنید" }, 500);
    }
    return respond({ success: true });
  } catch (error) {
    console.error("discount POST", error);
    return respond({ error: "خطا در ذخیره اطلاعات" }, 500);
  }
}

export async function PATCH(request: Request) {
  if (!(await canWrite(request))) return respond({ error: "دسترسی غیرمجاز" }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 8000) return respond({ error: "حجم درخواست زیاد است" }, 413);
    const b = JSON.parse(raw);
    if (!uuid.test(b?.firmId || "") || !Array.isArray(b?.orderedIds) || b.orderedIds.length > 200 || b.orderedIds.some((v:unknown) => typeof v !== "string" || !uuid.test(v))) {
      return respond({ error: "ترتیب ارسالی نامعتبر است" }, 400);
    }
    const ids = b.orderedIds as string[];
    if (new Set(ids).size !== ids.length) return respond({ error: "شناسه تکراری در ترتیب" }, 400);
    const updated = await withDatabaseTransaction(async client => {
      // Parent lock also serializes FK-checked inserts while this order is committed.
      const firm = await client.query("SELECT id FROM public.prop_firms WHERE id=$1 FOR UPDATE", [b.firmId]);
      if (!firm.rowCount) return false;
      const existing = await client.query("SELECT id FROM public.firm_discounts WHERE firm_id=$1 FOR UPDATE", [b.firmId]);
      const existingIds = existing.rows.map((row: { id: string }) => row.id);
      if (existingIds.length !== ids.length || ids.some(id => !existingIds.includes(id))) return false;
      for (let i = 0; i < ids.length; i++) {
        const result = await client.query("UPDATE public.firm_discounts SET sort_order=$1 WHERE firm_id=$2 AND id=$3 RETURNING id", [(i+1)*10,b.firmId,ids[i]]);
        if (!result.rowCount) throw new Error("Discount disappeared");
      }
      return true;
    });
    if (!updated) return respond({ error: "فهرست کدها تغییر کرده؛ صفحه را تازه‌سازی کنید" }, 409);
    return respond({ success: true });
  } catch (error) {
    console.error("discount sort PATCH", error);
    return respond({ error: "ذخیره ترتیب کدها ناموفق بود" }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await canWrite(request))) return respond({ error: "دسترسی غیرمجاز" }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 1000) return respond({ error: "درخواست نامعتبر است" }, 413);
    const { id } = JSON.parse(raw);
    if (typeof id !== "string" || !uuid.test(id)) return respond({ error: "شناسه نامعتبر است" }, 400);
    const result = await getSupabaseAdmin().from("firm_discounts").delete().eq("id", id).select("id").maybeSingle();
    return result.error || !result.data ? respond({ error: "حذف انجام نشد" }, 500) : respond({ success: true });
  } catch (error) {
    console.error("discount DELETE", error);
    return respond({ error: "خطای حذف" }, 500);
  }
}
