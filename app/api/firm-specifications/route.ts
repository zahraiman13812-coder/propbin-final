
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const firmId = searchParams.get("firmId");

    if (!firmId) {
      return NextResponse.json(
        { error: "شناسه شرکت الزامی است." },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from("firm_details")
      .select("content")
      .eq("firm_id", firmId)
      .maybeSingle();

    if (error) {
      console.error("Firm specifications:", error);
      return NextResponse.json(
        { error: "خطا در دریافت مشخصات شرکت." },
        { status: 500 }
      );
    }

    const content = data?.content;

    const specifications =
      content &&
      typeof content === "object" &&
      !Array.isArray(content) &&
      content.specifications &&
      typeof content.specifications === "object" &&
      !Array.isArray(content.specifications)
        ? content.specifications
        : {};

    return NextResponse.json(
      { specifications },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Firm specifications GET:", error);
    return NextResponse.json(
      { error: "خطای داخلی سرور." },
      { status: 500 }
    );
  }
}
