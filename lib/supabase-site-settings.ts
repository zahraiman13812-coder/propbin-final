import "server-only";

import { getSupabaseAdmin, withDatabaseTransaction } from "@/lib/supabase-admin";

type SupabaseSettingsError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export type SiteSettingsObject = object;

// IMPORTANT: public.site_settings.id is INTEGER in this project.
// Do not use the string "main" in queries or upserts for this table.
const SITE_SETTINGS_ROW_ID = 1;

function describeSupabaseError(error: SupabaseSettingsError) {
  return {
    message: error.message ?? "Unknown Supabase error",
    code: error.code ?? "UNKNOWN",
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function settingsErrorMessage(error: SupabaseSettingsError): string {
  const code = error.code ?? "UNKNOWN";

  if (code === "PGRST205" || code === "42P01") {
    return "جدول public.site_settings پیدا نشد. فایل SQL تنظیمات را در SQL Editor همان پروژه Supabase اجرا کن و مطمئن شو پروژه با SUPABASE_URL در .env.local یکی است.";
  }

  if (code === "42501" || /permission denied/i.test(error.message ?? "")) {
    return "دسترسی به public.site_settings رد شد. بررسی کن سرور از کلید محرمانه Supabase استفاده می‌کند و کلید محرمانه در مرورگر قرار نگرفته باشد.";
  }

  return `دریافت تنظیمات سایت از Supabase ناموفق بود (کد ${code}): ${error.message ?? "خطای نامشخص"}`;
}

/** Reads site settings through the server-only Supabase client. */
export async function getSiteSettings<T extends object>(fallback: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("site_settings")
    .select("settings,site_name,site_description")
    .eq("id", SITE_SETTINGS_ROW_ID)
    .maybeSingle();

  if (error) {
    const diagnostic = describeSupabaseError(error);
    console.error("Failed to read site settings from Supabase:", diagnostic);
    throw new Error(settingsErrorMessage(error));
  }

  // The table originally stored these two fields in dedicated columns.
  // Use them as a migration-safe fallback if the JSON settings object is empty.
  const legacyFallback: Record<string, unknown> = {
    ...(structuredClone(fallback) as unknown as Record<string, unknown>),
  };

  if (typeof data?.site_name === "string" && data.site_name.trim()) {
    legacyFallback["name"] = data.site_name;
  }
  if (typeof data?.site_description === "string" && data.site_description.trim()) {
    legacyFallback["tagline"] = data.site_description;
  }

  const saved: unknown = data?.settings;
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    return legacyFallback as T;
  }

  return {
    ...legacyFallback,
    ...(saved as Partial<T>),
  } as T;
}

/** Writes the complete settings object to the canonical integer-id row. */
export async function saveSiteSettings(settings: SiteSettingsObject): Promise<void> {
  const supabase = getSupabaseAdmin();
  const rawSettings = settings as Record<string, unknown>;
  const siteName = typeof rawSettings.name === "string" ? rawSettings.name : "پراپ‌بین";
  const siteDescription = typeof rawSettings.tagline === "string" ? rawSettings.tagline : "";
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        id: SITE_SETTINGS_ROW_ID,
        site_name: siteName,
        site_description: siteDescription,
        settings: settings as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    const diagnostic = describeSupabaseError(error);
    console.error("Failed to save site settings to Supabase:", diagnostic);
    throw new Error(
      `ذخیره تنظیمات سایت در Supabase ناموفق بود (کد ${diagnostic.code}): ${diagnostic.message}`
    );
  }
}

/** Merge only changed fields; independent admin screens cannot erase each other's updates. */
export async function patchSiteSettings(patch: Record<string, unknown>): Promise<void> {
  if (!Object.keys(patch).length) return;
  await withDatabaseTransaction(async client => {
    await client.query(`
      INSERT INTO public.site_settings(id,settings,site_name,site_description,updated_at)
      VALUES (1,$1::jsonb,COALESCE($1::jsonb->>'name','پراپ‌بین'),COALESCE($1::jsonb->>'tagline',''),now())
      ON CONFLICT (id) DO UPDATE SET
        settings = site_settings.settings || EXCLUDED.settings,
        site_name = COALESCE(EXCLUDED.settings->>'name',site_settings.site_name),
        site_description = COALESCE(EXCLUDED.settings->>'tagline',site_settings.site_description),
        updated_at = now()
    `, [JSON.stringify(patch)]);
  });
}
