
import { getActivePropFirms } from "./supabase-firms";
import { getPublishedArticles } from "./supabase-articles";

import { firms, articles } from "./data";
import { getPolls } from "./supabase-polls";
import { getArticleLotterySettings } from "./supabase-lottery";
import { getSiteSettings, patchSiteSettings } from "./supabase-site-settings";

export type Firm = (typeof firms)[number];

export type Article = (typeof articles)[number] & {
  body?: string;
  image?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export type Poll = {
  id: string;
  firmId: string;
  trust: number;
  support: number;
  payout: number;
  rules: number;
  comment: string;
  approved: boolean;
  featured: boolean;
  createdAt: string;
  userId?: string;
  displayName?: string;
};

export type SiteSettings = {
  name: string;
  tagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  firmsTitle: string;
  firmsDescription: string;
  compareTitle: string;
  compareDescription: string;
  articlesTitle: string;
  articlesDescription: string;
  reviewsTitle: string;
  footerDescription: string;
  contactEmail: string;
  instagram: string;
  telegram: string;
  cooperationTelegram: string;
  primaryDark: string;
  primaryLight: string;

  logoUrl: string;
  heroImageUrl: string;
  navigationJson: string;
  homeSectionsJson: string;
};

export type ArticleLottery = {
  enabled: boolean;
  title: string;
  description: string;
  articleSlug: string;
  period: string;
  entries: {
    id: string;
    userId: string;
    name: string;
    email: string;
    code: string;
    period: string;
    createdAt: string;
  }[];
};

export const defaultArticleLottery: ArticleLottery = {
  enabled: false,
  title: "قرعه‌کشی ویژه مقالات",
  description:
    "مقاله را بخوانید و کد شرکت دریافت کنید.",
  articleSlug: "",
  period: "دوره اول",
  entries: [],
};

export type Content = {
  articleLottery: ArticleLottery;
  firms: Firm[];
  articles: Article[];
  polls: Poll[];
  settings: SiteSettings;
};

export const initialContent: Content = {
  firms,
  articles,
  polls: [],

  settings: {
    name: "پراپ‌بین",
    tagline:
      "مرجع بررسی و مقایسه شرکت‌های پراپ",

    heroEyebrow:
      "راهنمای هوشمند دنیای پراپ",
    heroTitle: "پراپ‌بین؛",
    heroHighlight: "انتخاب بهتر",

    heroDescription:
      "شرکت‌های پراپ را شفاف بررسی و کنار هم مقایسه کن؛ قوانین، هزینه‌ها و تخفیف‌ها را یک‌جا ببین.",

    firmsTitle: "شرکت‌های پراپ برتر",
    firmsDescription:
      "شرکت‌های محبوب و شرایط آن‌ها را بررسی کن.",

    compareTitle:
      "قبل از انتخاب، مقایسه کن.",
    compareDescription:
      "سهم سود، هزینه شروع و سقف سرمایه را کنار هم ببین.",

    articlesTitle: "آخرین مقالات",
    articlesDescription:
      "نکات کاربردی برای شناخت پراپ و مدیریت ریسک.",

    reviewsTitle:
      "تریدرها چه می‌گویند؟",

    footerDescription:
      "پراپ‌بین، مرجع بررسی و مقایسه شرکت‌های پراپ.",

    contactEmail: "",
    instagram: "",
    telegram: "",
    cooperationTelegram: "",

    primaryDark: "#008cff",
    primaryLight: "#0078ed",

    logoUrl: "/pb-logo.png",
    heroImageUrl: "",

    navigationJson: JSON.stringify([
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
        id: "articles",
        label: "مقالات پراپ",
        href: "/articles",
        visible: true,
      },
      { id: "cooperation", label: "همکاری با ما", href: "/cooperation", visible: true },
    ]),

    homeSectionsJson: JSON.stringify([
      "hero",
      "features",
      "firms",
      "compare",
      "articles",
      "reviews",
      "social",
    ]),
  },

  articleLottery: structuredClone(
    defaultArticleLottery
  ),
};

/** Database collections are authoritative; bundled fixtures are only demo data. */
export async function getContent(): Promise<Content> {
  const [polls, articleLottery, settings, firms, articles] = await Promise.all([
    getPolls(), getArticleLotterySettings(), getSiteSettings(initialContent.settings),
    getActivePropFirms(), getPublishedArticles(),
  ]);
  return { polls, articleLottery, settings, firms, articles };
}

/** Compatibility helper for the appearance/settings editors. */
export async function updateContent<T>(callback: (content: Content) => T | Promise<T>): Promise<T> {
  const content = await getContent();
  const previous = structuredClone(content.settings);
  const collections = JSON.stringify({ firms: content.firms, articles: content.articles, polls: content.polls, articleLottery: content.articleLottery });
  const result = await callback(content);
  if (JSON.stringify({ firms: content.firms, articles: content.articles, polls: content.polls, articleLottery: content.articleLottery }) !== collections) {
    throw new Error('برای ویرایش محتوا از صفحه اختصاصی همان بخش در مدیریت استفاده کنید.');
  }
  const patch = Object.fromEntries(Object.entries(content.settings).filter(([key,value]) =>
    JSON.stringify(value) !== JSON.stringify(previous[key as keyof typeof previous])));
  if (Object.keys(patch).length) await patchSiteSettings(patch);
  return result;
}
