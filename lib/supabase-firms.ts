
import "server-only";

import type { Firm } from "@/lib/content";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type FirmRow = {
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
  purchase_method: string | null;
  challenge: string;
  logo_text: string;
  logo: string | null;
  website: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapFirm(row: FirmRow): Firm {
  const firm = {
    id: row.id,
    name: row.name,
    rating: row.rating,
    capital: row.capital,
    profit: row.profit,
    fee: row.fee,
    discount: row.discount,
    code: row.code,
    color: row.color,
    description: row.description,
    payout: row.payout,
    purchaseMethod: row.purchase_method ?? "",
    challenge: row.challenge,
    logoText: row.logo_text,

    ...(row.logo ? { logo: row.logo } : {}),
    ...(row.website ? { website: row.website } : {}),
  };

  return firm;
}

/**
 * دریافت فقط شرکت‌های فعال برای نمایش عمومی سایت.
 *
 * این تابع فقط در سمت سرور استفاده می‌شود.
 */
export async function getActivePropFirms(): Promise<Firm[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("prop_firms")
    .select(
      [
        "id",
        "name",
        "rating",
        "capital",
        "profit",
        "fee",
        "discount",
        "code",
        "color",
        "description",
        "payout",
        "purchase_method",
        "challenge",
        "logo_text",
        "logo",
        "website",
        "is_active",
        "sort_order",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to load prop firms:", error);

    throw new Error(
      "دریافت اطلاعات شرکت‌های پراپ از Supabase ناموفق بود."
    );
  }

  return ((data ?? []) as unknown as FirmRow[]).map(mapFirm);
}

/**
 * دریافت یک شرکت فعال با شناسه ثابت آن.
 */
export async function getActivePropFirm(
  id: string
): Promise<Firm | null> {
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) {
    return null;
  }

  const firms = await getActivePropFirms();

  return firms.find((firm) => firm.id === id) ?? null;
}
