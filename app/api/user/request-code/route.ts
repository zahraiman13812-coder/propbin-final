import { readBoundedJson, RequestBodyError } from "@/lib/request-body";
import { NextRequest, NextResponse } from "next/server";
import { issueLoginCode, LoginCodeThrottled } from "@/lib/user-auth";
import { validOrigin } from "@/lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  let body;
  try { body = await readBoundedJson(request, 2048); }
  catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyError ? error.message : "درخواست نامعتبر است." },
      { status: error instanceof RequestBodyError ? error.status : 400 });
  }
  if (!body || (body.mode !== "login" && body.mode !== "register") || typeof body.email !== "string" ||
      (body.mode === "register" && typeof body.name !== "string"))
    return NextResponse.json({ error: "اطلاعات درخواست نامعتبر است." }, { status: 400 });
  try {
    await issueLoginCode(body.email, body.mode, typeof body.name === "string" ? body.name : "");
    return NextResponse.json({ ok: true, message: "کد شش‌رقمی به ایمیل شما ارسال شد. اعتبار آن ۱۰ دقیقه است." },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LoginCodeThrottled)
      return NextResponse.json({ error: error.message }, { status: 429 });
    const message = error instanceof Error ? error.message : "ارسال کد ناموفق بود.";
    console.error("Request login code failed:", error instanceof Error ? error.name : "unknown");
    const status = message.includes("ثبت") || message.includes("ایمیل معتبر") || message.includes("نام باید") ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
