import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type WheelLimitPeriod = "day" | "month";

export type WheelSettings = {
  id: "main";
  is_active: boolean;
  title: string;
  description: string;
  terms: string;
  spin_limit: number;
  limit_period: WheelLimitPeriod;
  updated_at: string;
};

export type WheelPrizeRow = {
  id: string;
  label: string;
  description: string;
  color: string;
  weight: number;
  code: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type WheelSpinRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  prize_id: string;
  prize_label: string;
  prize_code: string | null;
  period_key: string;
  created_at: string;
};

export type WheelDrawRow = {
  id: string;
  month: string;
  user_id: string;
  user_name: string;
  user_email: string;
  prize_id: string;
  prize_label: string;
  spin_id: string | null;
  created_at: string;
};

export type WheelUserStat = {
  spins: number;
  lastSpinAt: string | null;
};

function fail(label: string, error: unknown): never {
  console.error(label, error);
  throw new Error("خطا در ارتباط با پایگاه داده گردونه شانس.");
}

export function wheelPeriodKey(
  period: WheelLimitPeriod,
  now = new Date()
): string {
  const utc = now.toISOString();
  return period === "day" ? utc.slice(0, 10) : utc.slice(0, 7);
}

export async function getWheelSettings(): Promise<WheelSettings> {
  const { data, error } = await getSupabaseAdmin()
    .from("wheel_settings")
    .select("id,is_active,title,description,terms,spin_limit,limit_period,updated_at")
    .eq("id", "main")
    .maybeSingle();

  if (error) fail("Wheel settings query failed:", error);
  if (!data) throw new Error("تنظیمات گردونه در Supabase پیدا نشد. فایل 05_wheel.sql را اجرا کنید.");
  return data as WheelSettings;
}

export async function getWheelUserStats(): Promise<Map<string, WheelUserStat>> {
  const supabase = getSupabaseAdmin();
  const stats = new Map<string, WheelUserStat>();
  const pageSize = 1000;
  const maxPages = 100;

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("wheel_spins")
      .select("user_id,created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) fail("Wheel user stats query failed:", error);
    const rows = data ?? [];

    for (const row of rows) {
      const userId = String(row.user_id);
      const current = stats.get(userId) ?? { spins: 0, lastSpinAt: null };
      current.spins += 1;
      if (!current.lastSpinAt) current.lastSpinAt = String(row.created_at);
      stats.set(userId, current);
    }

    if (rows.length < pageSize) return stats;
  }

  throw new Error("تعداد سوابق گردونه بیش از ظرفیت صفحه‌بندی است.");
}

export async function getWheelAdminData() {
  const supabase = getSupabaseAdmin();
  const [settingsResult, prizesResult, spinsResult, drawsResult] = await Promise.all([
    supabase
      .from("wheel_settings")
      .select("id,is_active,title,description,terms,spin_limit,limit_period,updated_at")
      .eq("id", "main")
      .maybeSingle(),
    supabase
      .from("wheel_prizes")
      .select("id,label,description,color,weight,code,is_active,sort_order,created_at,updated_at")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("wheel_spins")
      .select("id,user_id,user_name,user_email,prize_id,prize_label,prize_code,period_key,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("wheel_draws")
      .select("id,month,user_id,user_name,user_email,prize_id,prize_label,spin_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (settingsResult.error) fail("Wheel admin settings query failed:", settingsResult.error);
  if (prizesResult.error) fail("Wheel admin prizes query failed:", prizesResult.error);
  if (spinsResult.error) fail("Wheel admin spins query failed:", spinsResult.error);
  if (drawsResult.error) fail("Wheel admin draws query failed:", drawsResult.error);
  if (!settingsResult.data) throw new Error("تنظیمات گردونه در Supabase پیدا نشد.");

  return {
    settings: settingsResult.data as WheelSettings,
    prizes: (prizesResult.data ?? []) as WheelPrizeRow[],
    spins: (spinsResult.data ?? []) as WheelSpinRow[],
    draws: (drawsResult.data ?? []) as WheelDrawRow[],
  };
}
