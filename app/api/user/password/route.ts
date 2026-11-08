import { NextResponse } from "next/server";

// Password-based user authentication is deliberately disabled.
// Admin authentication continues to use its separate /api/auth endpoint.
export async function POST() {
  return NextResponse.json(
    { error: "ورود با رمز عبور غیرفعال است. برای ورود، کد یک‌بارمصرف ایمیل بگیرید." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
