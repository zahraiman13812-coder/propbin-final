
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AdminFirm = {
  id: string;
  name: string;
  rating: string;
  capital: string;
  profit: string;
  fee: string;
  discount: string;
  code: string;
  color: string;
  description: string;
  payout: string;
  challenge: string;
  logo_text: string;
  logo: string | null;
  website: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listAdminFirms(): Promise<AdminFirm[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("prop_firms")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Admin firms error:", error);

    throw new Error(
      "دریافت فهرست شرکت‌های پراپ ناموفق بود."
    );
  }

  return (data ?? []) as AdminFirm[];
}
