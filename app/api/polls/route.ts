import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isDemoUser } from "@/lib/user-auth";
import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { getActivePropFirms } from "@/lib/supabase-firms";
import { getPolls, addPoll, editPoll, removePoll } from "@/lib/supabase-polls";
import type { Poll } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
function refreshPages() {
  for (const path of ["/", "/polls", "/account", "/admin", "/admin/polls", "/admin/featured"]) revalidatePath(path);
}
function publicPoll(poll: Poll) {
  return {
    id: poll.id, firmId: poll.firmId, trust: poll.trust, support: poll.support,
    payout: poll.payout, rules: poll.rules, comment: poll.comment,
    approved: poll.approved, featured: poll.featured,
    createdAt: poll.createdAt, displayName: poll.displayName || "کاربر پراپ بین",
  };
}
function message(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const mine = request.nextUrl.searchParams.get("mine") === "1";
    if (mine) {
      const user = await getCurrentUser();
      if (!user) return error("ابتدا وارد حساب کاربری شوید.", 401);
      const polls = (await getPolls()).filter(p => p.userId === user.id);
      return NextResponse.json({ polls }, { headers: { "Cache-Control": "no-store" } });
    }
    const polls = (await getPolls()).filter(p => p.approved).map(publicPoll);
    return NextResponse.json({ polls }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) { return error(message(err, "دریافت نظرات ناموفق بود."), 500); }
}

export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return error("درخواست نامعتبر است.", 403);
  const user = await getCurrentUser();
  if (!user) return error("برای ثبت نظر ابتدا وارد حساب شوید.", 401);
  if (isDemoUser(user)) return error("حساب نمایشی فقط برای مشاهده است.", 403);
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.firmId !== "string" || !payload.firmId.trim()) return error("شرکت موردنظر مشخص نشده است.");
  for (const key of ["trust", "support", "payout", "rules"] as const) {
    if (!Number.isInteger(payload[key]) || payload[key] < 1 || payload[key] > 5) return error("برای همه معیارها امتیاز بین ۱ تا ۵ انتخاب کنید.");
  }
  if (typeof payload.comment !== "string" || payload.comment.trim().length > 500) return error("متن نظر باید حداکثر ۵۰۰ کاراکتر باشد.");
  try {
    const firms = await getActivePropFirms();
    if (!firms.some(f => f.id === payload.firmId)) return error("شرکت موردنظر وجود ندارد.");
    await addPoll({ firmId: payload.firmId, trust: payload.trust, support: payload.support,
      payout: payload.payout, rules: payload.rules, comment: payload.comment.trim(),
      approved: false, featured: false, userId: user.id, displayName: user.name || "کاربر پراپ بین" });
    refreshPages();
    return NextResponse.json({ ok: true, message: "نظر ثبت شد و پس از تأیید مدیر نمایش داده می‌شود." }, { status: 201 });
  } catch (err) { return error(message(err, "ثبت نظر انجام نشد."), 400); }
}

export async function PATCH(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) return error("دسترسی غیرمجاز.", 403);
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)) return error("شناسه نظر نامعتبر است.");
  if (typeof payload.approved !== "boolean" && typeof payload.featured !== "boolean") return error("تغییری برای اعمال مشخص نشده است.");
  try {
    await editPoll(payload.id, {
      ...(typeof payload.approved === "boolean" ? { approved: payload.approved } : {}),
      ...(typeof payload.featured === "boolean" ? { featured: payload.featured } : {}),
    });
    refreshPages();
    return NextResponse.json({ ok: true });
  } catch (err) { return error(message(err, "ویرایش نظر انجام نشد."), 400); }
}

export async function DELETE(request: NextRequest) {
  if (!validOrigin(request)) return error("درخواست نامعتبر است.", 403);
  const user = await getCurrentUser();
  const admin = await isAdmin();
  if (!admin && !user) return error("ابتدا وارد حساب شوید.", 401);
  if (!admin && isDemoUser(user)) return error("حساب نمایشی فقط برای مشاهده است.", 403);
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)) return error("شناسه نظر نامعتبر است.");
  try {
    const deleted = await removePoll(payload.id, admin ? undefined : user!.id);
    if (!deleted) return error("نظر پیدا نشد یا اجازه حذف آن را ندارید.", 404);
    refreshPages();
    return NextResponse.json({ ok: true });
  } catch (err) { return error(message(err, "حذف نظر انجام نشد."), 500); }
}
