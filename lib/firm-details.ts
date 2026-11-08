import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

import { emptyDetails, type FirmDetailsData } from "@/lib/firm-details-types";
export async function getFirmDetails(id: string): Promise<FirmDetailsData> {
  const { data, error } = await getSupabaseAdmin().from("firm_details").select("content,updated_at").eq("firm_id", id).maybeSingle();
  if (error) { console.error("firm_details read failed", error); throw new Error("اطلاعات بررسی شرکت در دسترس نیست. Migration دیتابیس را بررسی کنید."); }
  if (!data) return { ...emptyDetails };
  const obj = data.content && typeof data.content === "object" ? data.content as Partial<FirmDetailsData> : {};
  return { ...emptyDetails, ...obj, updatedAt: data.updated_at };
}
