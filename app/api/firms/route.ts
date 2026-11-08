
import { NextResponse } from "next/server";

import { getActivePropFirms } from "@/lib/supabase-firms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const firms = await getActivePropFirms();

    return NextResponse.json(
      {
        success: true,
        total: firms.length,
        firms,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Public firms API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "دریافت اطلاعات شرکت‌ها ناموفق بود.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
