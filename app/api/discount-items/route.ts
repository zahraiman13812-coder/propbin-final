import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const [firms, discounts] = await Promise.all([
      db.from("prop_firms")
        .select("id,name,color,logo,logo_text,discount_intro,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
      db.from("firm_discounts")
        .select("id,firm_id,code,amount,description,sort_order")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),
    ]);
    if (firms.error || discounts.error) {
      console.error("public discounts load", firms.error, discounts.error);
      return NextResponse.json({ error: "دریافت کدهای تخفیف ناموفق بود" }, { status: 500 });
    }
    return NextResponse.json(
      { firms: firms.data ?? [], discounts: discounts.data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("public discounts load", error);
    return NextResponse.json({ error: "خطا در دریافت کدهای تخفیف" }, { status: 500 });
  }
}
