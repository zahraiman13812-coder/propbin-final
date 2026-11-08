import "server-only";

import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  SupportMessage,
  SupportRole,
  SupportThread,
} from "./support-types";

const MAX_MESSAGE = 2000;

type ThreadRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  role: SupportRole;
  text: string;
  created_at: string;
  read_by_user: boolean;
  read_by_admin: boolean;
};

function cleanMessage(value: string): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_MESSAGE) : "";
}

function dbError(context: string, error: unknown): never {
  console.error(`Support ${context}:`, error);
  throw new Error("خطا در ارتباط با پایگاه داده پشتیبانی.");
}

function mapMessage(row: MessageRow): SupportMessage {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
    readByUser: row.read_by_user,
    readByAdmin: row.read_by_admin,
  };
}

async function loadMessages(threadIds: string[]): Promise<Map<string, SupportMessage[]>> {
  const byThread = new Map<string, SupportMessage[]>();
  if (!threadIds.length) return byThread;

  const { data, error } = await getSupabaseAdmin()
    .from("support_messages")
    .select("id,thread_id,role,text,created_at,read_by_user,read_by_admin")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: true });

  if (error) dbError("load messages", error);

  for (const row of (data ?? []) as MessageRow[]) {
    const messages = byThread.get(row.thread_id) ?? [];
    messages.push(mapMessage(row));
    byThread.set(row.thread_id, messages);
  }
  return byThread;
}

async function mapThreads(rows: ThreadRow[]): Promise<SupportThread[]> {
  const messages = await loadMessages(rows.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: messages.get(row.id) ?? [],
  }));
}

export async function getThreadForUser(userId: string): Promise<SupportThread | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("support_threads")
    .select("id,user_id,name,email,status,created_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) dbError("get user thread", error);
  if (!data) return null;
  return (await mapThreads([data as ThreadRow]))[0];
}

export async function getAllThreads(): Promise<SupportThread[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("support_threads")
    .select("id,user_id,name,email,status,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) dbError("get all threads", error);
  return mapThreads((data ?? []) as ThreadRow[]);
}

export async function sendUserMessage(
  user: { id: string; name: string; email: string },
  message: string
): Promise<SupportThread> {
  const text = cleanMessage(message);
  if (!text) throw new Error("متن پیام خالی است.");

  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: thread, error: threadError } = await db
    .from("support_threads")
    .upsert(
      {
        user_id: user.id,
        name: user.name || "کاربر پراپ‌بین",
        email: user.email,
        status: "open",
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (threadError || !thread) dbError("upsert thread", threadError);

  const { error: messageError } = await db.from("support_messages").insert({
    id: randomUUID(),
    thread_id: thread.id,
    role: "user",
    text,
    read_by_user: true,
    read_by_admin: false,
  });
  if (messageError) dbError("send user message", messageError);

  const result = await getThreadForUser(user.id);
  if (!result) throw new Error("گفتگو پیدا نشد.");
  return result;
}

export async function sendAdminReply(threadId: string, message: string): Promise<SupportThread> {
  const text = cleanMessage(message);
  if (!text) throw new Error("متن پیام خالی است.");

  const db = getSupabaseAdmin();
  const { data: thread, error: lookupError } = await db
    .from("support_threads")
    .select("user_id")
    .eq("id", threadId)
    .maybeSingle();
  if (lookupError) dbError("find thread", lookupError);
  if (!thread) throw new Error("گفتگو پیدا نشد.");

  const { error: insertError } = await db.from("support_messages").insert({
    id: randomUUID(),
    thread_id: threadId,
    role: "admin",
    text,
    read_by_user: false,
    read_by_admin: true,
  });
  if (insertError) dbError("send admin reply", insertError);

  const { error: updateError } = await db
    .from("support_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);
  if (updateError) dbError("update thread", updateError);

  const result = await getThreadForUser(thread.user_id);
  if (!result) throw new Error("گفتگو پیدا نشد.");
  return result;
}

export async function markThreadRead(
  threadId: string,
  role: SupportRole
): Promise<SupportThread | null> {
  const db = getSupabaseAdmin();
  const { data: thread, error: lookupError } = await db
    .from("support_threads")
    .select("user_id")
    .eq("id", threadId)
    .maybeSingle();
  if (lookupError) dbError("find read thread", lookupError);
  if (!thread) return null;

  const { error } = await db
    .from("support_messages")
    .update(role === "user" ? { read_by_user: true } : { read_by_admin: true })
    .eq("thread_id", threadId)
    .eq("role", role === "user" ? "admin" : "user");
  if (error) dbError("mark messages read", error);

  return getThreadForUser(thread.user_id);
}

/** Remove one complete support conversation, including messages (FK cascade). */
export async function deleteSupportThread(threadId: string): Promise<void> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) {
    throw new Error("شناسه گفتگو نامعتبر است.");
  }
  const { error } = await getSupabaseAdmin().from("support_threads")
    .delete().eq("id", threadId);
  if (error) dbError("delete thread", error);
}
