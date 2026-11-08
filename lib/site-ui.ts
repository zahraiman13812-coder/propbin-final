
export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export type HomeSectionId =
  | "hero"
  | "features"
  | "firms"
  | "compare"
  | "articles"
  | "reviews"
  | "social";

export const defaultNavigation: NavigationItem[] = [
  {
    id: "home",
    label: "صفحه اصلی",
    href: "/",
    visible: true,
  },
  {
    id: "discounts",
    label: "کد تخفیف",
    href: "/discounts",
    visible: true,
  },
  {
    id: "firms",
    label: "بررسی پراپ",
    href: "/firms",
    visible: true,
  },
  {
    id: "compare",
    label: "مقایسه پراپ",
    href: "/compare",
    visible: true,
  },
  {
    id: "polls",
    label: "نظرسنجی پراپ",
    href: "/polls",
    visible: true,
  },
  {
    id: "articles",
    label: "مقالات پراپ",
    href: "/articles",
    visible: true,
  },
];

export const homeSectionLabels: Record<
  HomeSectionId,
  string
> = {
  hero: "بنر اصلی و نمودار ترید",
  features: "دسترسی‌های سریع",
  firms: "شرکت‌های پراپ",
  compare: "بنر مقایسه پراپ",
  articles: "مقالات",
  reviews: "نظرات منتخب",
  social: "اینستاگرام و تلگرام",
};

export const defaultSections: HomeSectionId[] = [
  "hero",
  "features",
  "firms",
  "compare",
  "articles",
  "reviews",
  "social",
];

export function isSafeInternalPath(
  value: string
): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("..") &&
    !/[\s?#<>]/.test(value)
  );
}

export function parseNavigation(
  value: string
): NavigationItem[] {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return defaultNavigation;
    }

    const seen = new Set<string>();
    const result: NavigationItem[] = [];

    for (const entry of parsed.slice(0, 12)) {
      if (
        !entry ||
        typeof entry !== "object"
      ) {
        continue;
      }

      const item = entry as Record<
        string,
        unknown
      >;

      if (
        typeof item.id !== "string" ||
        typeof item.label !== "string" ||
        typeof item.href !== "string" ||
        typeof item.visible !== "boolean"
      ) {
        continue;
      }

      if (
        !/^[a-z0-9-]{1,50}$/.test(item.id) ||
        seen.has(item.id) ||
        !isSafeInternalPath(item.href) ||
        item.label.trim().length === 0 ||
        item.label.length > 60
      ) {
        continue;
      }

      seen.add(item.id);

      result.push({
        id: item.id,
        label: item.label.trim(),
        href: item.href,
        visible: item.visible,
      });
    }

    return result;
  } catch {
    return defaultNavigation;
  }
}

export function parseHomeSections(
  value: string
): HomeSectionId[] {
  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return defaultSections;
    }

    const result: HomeSectionId[] = [];

    for (const item of parsed) {
      if (
        typeof item === "string" &&
        defaultSections.includes(
          item as HomeSectionId
        ) &&
        !result.includes(
          item as HomeSectionId
        )
      ) {
        result.push(
          item as HomeSectionId
        );
      }
    }

    return result;
  } catch {
    return defaultSections;
  }
}

export function isSafeSiteImage(
  value: string
): boolean {
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length <= 150000) return true;
  if (
    value === "/pb-logo.png" ||
    /^\/uploads\/branding\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(value)
  ) {
    return true;
  }

  const localBranding = /^\/uploads\/branding-images\/branding\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;
  if (localBranding.test(value)) return true;
  try {
    const imageUrl = new URL(value);
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://propbin.com");
    if (["http:", "https:"].includes(imageUrl.protocol) && imageUrl.origin === siteUrl.origin &&
        !imageUrl.username && !imageUrl.password && !imageUrl.search && !imageUrl.hash &&
        localBranding.test(imageUrl.pathname)) return true;
  } catch { /* Continue checking supported legacy URLs. */ }

  // Only accept public URLs from this project's configured Supabase origin
  // and the expected branding bucket/folder.
  try {
    const configuredSupabaseUrl = process.env.SUPABASE_URL;
    if (!configuredSupabaseUrl) return false;

    const imageUrl = new URL(value);
    const projectUrl = new URL(configuredSupabaseUrl);

    return (
      imageUrl.origin === projectUrl.origin &&
      imageUrl.protocol === projectUrl.protocol &&
      !imageUrl.username &&
      !imageUrl.password &&
      /^\/storage\/v1\/object\/public\/branding-images\/branding\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i.test(
        imageUrl.pathname
      )
    );
  } catch {
    return false;
  }
}
