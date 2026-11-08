import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdmin } from "@/lib/auth";
import { validOrigin } from "@/lib/guard";
import { initialContent, type SiteSettings } from "@/lib/content";
import { getSiteSettings, patchSiteSettings } from "@/lib/supabase-site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITABLE_FIELDS = [
  "name",
  "tagline",
  "heroEyebrow",
  "heroTitle",
  "heroHighlight",
  "heroDescription",
  "firmsTitle",
  "firmsDescription",
  "compareTitle",
  "compareDescription",
  "articlesTitle",
  "articlesDescription",
  "reviewsTitle",
  "footerDescription",
  "contactEmail",
  "instagram",
  "telegram",
  "cooperationTelegram",
  "primaryDark",
  "primaryLight",
] as const satisfies readonly (keyof SiteSettings)[];

type EditableField = (typeof EDITABLE_FIELDS)[number];
type SocialNetwork = "instagram" | "telegram";

const FIELD_LIMITS: Record<EditableField, number> = {
  name: 100,
  tagline: 250,
  heroEyebrow: 150,
  heroTitle: 180,
  heroHighlight: 120,
  heroDescription: 1500,
  firmsTitle: 180,
  firmsDescription: 1500,
  compareTitle: 180,
  compareDescription: 1500,
  articlesTitle: 180,
  articlesDescription: 1500,
  reviewsTitle: 180,
  footerDescription: 1500,
  contactEmail: 254,
  instagram: 500,
  telegram: 500,
  cooperationTelegram: 500,
  primaryDark: 7,
  primaryLight: 7,
};

const SOCIAL_HOSTS: Record<SocialNetwork, string[]> = {
  instagram: ["instagram.com", "www.instagram.com"],
  telegram: ["t.me", "telegram.me", "www.telegram.me"],
};

function normalizeSocial(value: string, network: SocialNetwork): string {
  const raw = value.trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error(`لینک ${network === "instagram" ? "اینستاگرام" : "تلگرام"} معتبر نیست.`);
    }

    if (url.protocol !== "https:" || !SOCIAL_HOSTS[network].includes(url.hostname.toLowerCase())) {
      throw new Error(`فقط لینک رسمی ${network === "instagram" ? "instagram.com" : "t.me یا telegram.me"} مجاز است.`);
    }

    // A profile/channel URL is kept as a URL so invite links can be supported too.
    url.hash = "";
    return url.toString().replace(/\/$/, url.pathname === "/" ? "/" : "");
  }

  const handle = raw.replace(/^@+/, "");
  if (!/^[A-Za-z0-9._-]{1,60}$/.test(handle)) {
    throw new Error(`آیدی ${network === "instagram" ? "اینستاگرام" : "تلگرام"} معتبر نیست؛ آیدی یا لینک کامل را وارد کن.`);
  }

  return handle;
}

function normalizeField(field: EditableField, value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`مقدار «${field}» باید متن باشد.`);
  }

  const trimmed = value.trim().slice(0, FIELD_LIMITS[field]);

  if (field === "instagram" || field === "telegram" || field === "cooperationTelegram") {
    return normalizeSocial(trimmed, field === "instagram" ? "instagram" : "telegram");
  }

  if (field === "contactEmail" && trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("ایمیل ارتباطی معتبر نیست.");
  }

  if ((field === "primaryDark" || field === "primaryLight") && !/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    throw new Error("رنگ‌ها باید به شکل کد HEX مانند #008cff باشند.");
  }

  return trimmed;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
  }

  try {
    const settings = await getSiteSettings(initialContent.settings);
    return NextResponse.json(
      { settings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load admin site settings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "دریافت تنظیمات سایت ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!validOrigin(request) || !(await isAdmin())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null) as { settings?: unknown } | null;
  if (!payload?.settings || typeof payload.settings !== "object" || Array.isArray(payload.settings)) {
    return NextResponse.json({ error: "ساختار تنظیمات ارسالی نامعتبر است." }, { status: 400 });
  }

  let current: SiteSettings;
  try {
    current = await getSiteSettings(initialContent.settings);
  } catch (error) {
    console.error("Failed to read site settings before save:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خواندن تنظیمات فعلی ناموفق بود." },
      { status: 500 },
    );
  }

  const incoming = payload.settings as Record<string, unknown>;
  const next: SiteSettings = { ...current };

  try {
    let updatedAnyField = false;
    for (const field of EDITABLE_FIELDS) {
      if (!(field in incoming)) continue;
      next[field] = normalizeField(field, incoming[field]);
      updatedAnyField = true;
    }

    if (!updatedAnyField) {
      return NextResponse.json({ error: "هیچ تنظیم قابل‌ذخیره‌ای ارسال نشده است." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "مقادیر تنظیمات معتبر نیستند." },
      { status: 400 },
    );
  }

  try {
    const patch = Object.fromEntries(EDITABLE_FIELDS
      .filter(field => field in incoming && next[field] !== current[field])
      .map(field => [field, next[field]]));
    await patchSiteSettings(patch);
    revalidatePath("/");
    revalidatePath("/", "layout");
    revalidatePath("/api/theme");

    return NextResponse.json(
      { ok: true, settings: next },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to save admin site settings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ذخیره تنظیمات در Supabase ناموفق بود." },
      { status: 500 },
    );
  }
}
