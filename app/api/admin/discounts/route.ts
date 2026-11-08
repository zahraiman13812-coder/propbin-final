import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
    const { data, error } = await getSupabaseAdmin()
      .from("prop_firms")
      .select("id,name,code,discount,logo,logo_text")
      .order("name");
    if (error) {
      console.error("Discount listing failed:", error);
      return NextResponse.json({ error: "خواندن تخفیف‌ها از دیتابیس ناموفق بود" }, { status: 500 });
    }
    const firms = (data ?? []).map((row: { id: string; name: string; code: string | null; discount: string | null; logo: string | null; logo_text: string | null }) => ({
      id: row.id,
      name: row.name,
      code: row.code ?? "",
      discount: row.discount ?? "",
      logo: row.logo ?? "",
      logoText: row.logo_text ?? "",
    }));
    return NextResponse.json({ firms }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Discount listing error:", error);
    return NextResponse.json({ error: "خطای سرور هنگام دریافت تخفیف‌ها" }, { status: 500 });
  }
}
