import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Poll } from "@/lib/content";

type PollRow = {
  id: string;
  firm_id: string;
  user_id: string;
  trust: number;
  support: number;
  payout: number;
  rules: number;
  comment: string;
  approved: boolean;
  featured: boolean;
  created_at: string;
  display_name: string;
};

function mapPoll(row: PollRow): Poll {
  return {
    id: row.id,
    firmId: row.firm_id,
    userId: row.user_id,
    trust: row.trust,
    support: row.support,
    payout: row.payout,
    rules: row.rules,
    comment: row.comment,
    approved: row.approved,
    featured: row.featured,
    createdAt: row.created_at,
    displayName: row.display_name,
  };
}

function raiseDatabaseError(error: { code?: string; message: string }): never {
  if (error.code === "23505") {
    throw new Error("شما قبلاً برای این شرکت نظر ثبت کرده‌اید.");
  }
  console.error("Supabase polls error:", error);
  throw new Error("ارتباط با پایگاه داده نظرسنجی ناموفق بود.");
}

export async function getPolls(): Promise<Poll[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("site_polls")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) raiseDatabaseError(error);
  return ((data ?? []) as PollRow[]).map(mapPoll);
}

export async function addPoll(poll: Omit<Poll, "id" | "createdAt">): Promise<void> {
  const { error } = await getSupabaseAdmin().from("site_polls").insert({
    firm_id: poll.firmId,
    user_id: poll.userId,
    trust: poll.trust,
    support: poll.support,
    payout: poll.payout,
    rules: poll.rules,
    comment: poll.comment,
    approved: false,
    featured: false,
    display_name: poll.displayName,
  });
  if (error) raiseDatabaseError(error);
}

export async function editPoll(id: string, patch: { approved?: boolean; featured?: boolean }): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await supabase
    .from("site_polls")
    .select("approved,featured,comment")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) raiseDatabaseError(lookupError);
  if (!existing) throw new Error("نظر پیدا نشد.");
  const approved = patch.approved ?? existing.approved;
  const featured = approved ? (patch.featured ?? existing.featured) : false;
  if (featured && !String(existing.comment).trim()) {
    throw new Error("نظر بدون متن نمی‌تواند منتخب صفحه اصلی باشد.");
  }
  const { error } = await supabase.from("site_polls")
    .update({ approved, featured }).eq("id", id);
  if (error) raiseDatabaseError(error);
}

export async function removePoll(id: string, userId?: string): Promise<boolean> {
  let query = getSupabaseAdmin().from("site_polls").delete().eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query.select("id");
  if (error) raiseDatabaseError(error);
  return (data?.length ?? 0) > 0;
}
