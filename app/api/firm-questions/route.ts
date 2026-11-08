import { NextRequest, NextResponse } from "next/server";
import { withDatabaseTransaction } from "@/lib/supabase-admin";
import { getCurrentUser, isDemoUser } from "@/lib/user-auth";
import { validOrigin } from "@/lib/guard";
import { readBoundedJson, RequestBodyError } from "@/lib/request-body";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status });
export async function POST(req: NextRequest) {
  if (!validOrigin(req)) return reply({ error: "درخواست نامعتبر" }, 403);
  const user = await getCurrentUser();
  if (!user) return reply({ error: "برای ثبت پرسش وارد حساب شوید" }, 401);
  if (isDemoUser(user)) return reply({ error: "حساب نمایشی فقط برای مشاهده است." }, 403);
  try {
    const body = await readBoundedJson(req, 12000);
    const id = body?.firmId;
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || question.length < 5 || question.length > 1500) {
      return reply({ error: "متن یا شناسه شرکت نامعتبر است" }, 400);
    }
    const result = await withDatabaseTransaction(async client => {
      // Serialize this user's submissions so parallel requests cannot exceed the quota.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [JSON.stringify([user.id, id])]);
      const firm = await client.query("SELECT id FROM public.prop_firms WHERE id=$1 AND is_active=true FOR SHARE", [id]);
      if (!firm.rowCount) return "missing";
      const count = await client.query("SELECT count(*)::int AS n FROM public.firm_questions WHERE user_id=$1 AND firm_id=$2", [user.id, id]);
      if (count.rows[0].n >= 100) return "limited";
      await client.query("INSERT INTO public.firm_questions(firm_id,user_id,display_name,question,approved) VALUES ($1,$2,$3,$4,false)", [id,user.id,user.name,question]);
      return "created";
    });
    if (result === "missing") return reply({ error: "شرکت فعال پیدا نشد" }, 404);
    if (result === "limited") return reply({ error: "حداکثر تعداد پرسش‌های شما برای این شرکت ثبت شده است" }, 429);
    return reply({ ok: true, message: "پرسش ثبت شد و پس از تأیید مدیر نمایش داده می‌شود" }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) return reply({ error: error.message }, error.status);
    console.error("Firm question failed:", error);
    return reply({ error: "ثبت پرسش موقتاً در دسترس نیست." }, 503);
  }
}
