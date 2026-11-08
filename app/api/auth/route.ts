import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, isAdmin, sessionCookie } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { readBoundedJson, RequestBodyError } from "@/lib/request-body";
import { reserveAdminLoginAttempt } from "@/lib/admin-login-limit";
export const runtime = "nodejs";
const reply = (data: unknown, status = 200) => NextResponse.json(data, {
  status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
});
export async function GET() {
  try { return reply({ authenticated: await isAdmin() }); }
  catch { return reply({ error: "بررسی نشست ناموفق بود." }, 503); }
}
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return reply({ error: "درخواست نامعتبر" }, 403);
  try {
    const body = await readBoundedJson(req, 2048);
    if (!body || typeof body.password !== "string" || !body.password.length || body.password.length > 128) {
      return reply({ error: "رمز عبور نامعتبر است." }, 400);
    }
    if (!(await reserveAdminLoginAttempt())) return reply({ error: "تلاش‌های ورود زیاد است. یک دقیقه بعد تلاش کنید." }, 429);
    const token = await authenticateAdmin(body.password);
    if (!token) return reply({ error: "رمز عبور نادرست است یا سرور تنظیم نشده" }, 401);
    const res = reply({ ok: true });
    res.cookies.set(sessionCookie.name, token, sessionCookie.options);
    return res;
  } catch (error) {
    if (error instanceof RequestBodyError) return reply({ error: error.message }, error.status);
    console.error("Admin login failed:", error instanceof Error ? error.name : "unknown");
    return reply({ error: "ورود موقتاً در دسترس نیست." }, 503);
  }
}
export async function DELETE(req: NextRequest) {
  if (!validOrigin(req)) return reply({ error: "درخواست نامعتبر" }, 403);
  const res = reply({ ok: true });
  res.cookies.set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 });
  return res;
}
