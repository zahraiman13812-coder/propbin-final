import type { Metadata } from "next";
export const metadata: Metadata = { alternates: { canonical: "/" } };

import Link from "next/link";
import type { ReactNode } from "react";

import {
  BookOpen,
  GitCompareArrows,
  Instagram,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";

import { getPublishedArticles } from "@/lib/supabase-articles";
import { getActiveLotteryRounds } from "@/lib/lottery-rounds";
import { getPublicContent as getContent } from "@/lib/public-content";

import {
  parseHomeSections,
  isSafeSiteImage,
  type HomeSectionId,
} from "@/lib/site-ui";

import HomeFirmCarousel from "@/components/HomeFirmCarousel";
import ArticleCard from "@/components/ArticleCard";
import FeaturedReviews from "@/components/FeaturedReviews";

export const dynamic = "force-dynamic";



function socialHref(value: string, network: "instagram" | "telegram") {
  const base = network === "instagram"
    ? "https://www.instagram.com/"
    : "https://t.me/";
  const raw = value.trim();
  if (!raw) return base;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const allowedHosts = network === "instagram"
        ? ["instagram.com", "www.instagram.com"]
        : ["t.me", "telegram.me", "www.telegram.me"];
      if (url.protocol === "https:" && allowedHosts.includes(url.hostname.toLowerCase())) {
        return url.toString();
      }
    } catch {
      // Fall through and treat it as a handle.
    }
  }

  const handle = raw.replace(/^@+/, "").replace(/^\/+/, "").split(/[/?#]/)[0];
  return handle ? `${base}${encodeURIComponent(handle)}` : base;
}

function socialLabel(value: string, network: "instagram" | "telegram") {
  const raw = value.trim();
  if (!raw) {
    return network === "instagram"
      ? "برای مشاهده صفحه اینستاگرام کلیک کن"
      : "برای ورود به کانال تلگرام کلیک کن";
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const firstPath = url.pathname.split("/").filter(Boolean)[0];
      if (!firstPath) return "صفحه رسمی";
      if (firstPath.startsWith("+")) return "لینک دعوت تلگرام";
      return `@${firstPath}`;
    } catch {
      // Show the raw configured value if it is not a valid URL.
    }
  }

  return `@${raw.replace(/^@+/, "")}`;
}

function SocialSection({
  instagram,
  telegram,
  siteName,
}: {
  instagram: string;
  telegram: string;
  siteName: string;
}) {
  const items: {
    key: "instagram" | "telegram";
    label: string;
    eyebrow: string;
    description: string;
    handle: string;
    href: string;
    action: string;
    Icon: LucideIcon;
    className: string;
    iconClassName: string;
  }[] = [
    {
      key: "instagram",
      label: "اینستاگرام",
      eyebrow: `با ${siteName} همراه شو`,
      description: "خبرها، نکته‌های کوتاه و محتوای تازه را در صفحه اینستاگرام دنبال کن.",
      handle: socialLabel(instagram, "instagram"),
      href: socialHref(instagram, "instagram"),
      action: "ورود به اینستاگرام",
      Icon: Instagram,
      className: "border-pink-500/30 from-fuchsia-600/20 via-pink-500/10 to-amber-400/10 hover:border-pink-400/70",
      iconClassName: "bg-pink-500/15 text-pink-400",
    },
    {
      key: "telegram",
      label: "تلگرام",
      eyebrow: `عضو جامعه ${siteName} شو`,
      description: "اطلاعیه‌ها، مطالب جدید و خبرهای مهم را در کانال تلگرام دریافت کن.",
      handle: socialLabel(telegram, "telegram"),
      href: socialHref(telegram, "telegram"),
      action: "ورود به تلگرام",
      Icon: Send,
      className: "border-sky-500/30 from-sky-600/20 via-cyan-500/10 to-blue-500/10 hover:border-sky-400/70",
      iconClassName: "bg-sky-500/15 text-sky-400",
    },
  ];

  return (
    <section id="social" className="relative overflow-hidden border-y border-border-theme bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-primary">ارتباط با {siteName}</span>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">ما را در شبکه‌های اجتماعی دنبال کن</h2>
          </div>
          <p className="max-w-md text-xs leading-7 text-muted">
            برای دیدن محتوای تازه و اطلاعیه‌ها، یکی از صفحه‌های رسمی ما را انتخاب کن.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const Icon = item.Icon;
            return (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${item.action} — ${item.handle}`}
                className={`group relative isolate min-h-[220px] overflow-hidden rounded-3xl border bg-gradient-to-br p-5 transition duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-7 ${item.className}`}
              >
                <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 -z-10 h-48 w-48 rounded-full border border-current/15" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-12 -z-10 h-48 w-48 rounded-full bg-current/5 blur-2xl" />

                <div className="flex h-full min-h-[170px] flex-col justify-between gap-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-muted">{item.eyebrow}</span>
                      <h3 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">{item.label}</h3>
                      <p className="mt-2 max-w-sm text-xs leading-7 text-muted sm:text-sm">{item.description}</p>
                      <span className="mt-3 inline-block max-w-full truncate rounded-full border border-current/15 bg-background/30 px-3 py-1 text-[11px] font-semibold text-foreground/80">{item.handle}</span>
                    </div>
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${item.iconClassName}`}>
                      <Icon size={30} strokeWidth={1.8} />
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-current/10 pt-4">
                    <span className="text-sm font-extrabold text-foreground">{item.action}</span>
                    <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-background/50 text-lg transition-transform group-hover:-translate-x-1">←</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    title: "بررسی پراپ‌ها",
    href: "/firms",
    Icon: Search,
  },
  {
    title: "مقایسه پراپ",
    href: "/compare",
    Icon: GitCompareArrows,
  },
  {
    title: "کد تخفیف",
    href: "/discounts",
    Icon: TicketPercent,
  },
  { title: "همکاری با ما", href: "/cooperation", Icon: MessageSquare },
];

function TradingVisual() {
  return (
    <div className="hero-visual">
      <div className="visual-glow" />

      <div className="terminal-window">
        <div className="terminal-head">
          <span />
          <span />
          <span />
          <small>MARKET OVERVIEW / BTCUSD</small>
        </div>

        <div className="terminal-label">
          <span>BTC / USD</span>
          <b>+2.45%</b>
        </div>

        <div className="chart">
          <div className="chart-grid" />

          <svg
            viewBox="0 0 600 250"
            preserveAspectRatio="none"
            role="img"
            aria-label="نمودار تزئینی بازار"
          >
            <defs>
              <linearGradient
                id="parabin-chart-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0"
                  stopColor="#00cfff"
                  stopOpacity=".32"
                />
                <stop
                  offset="1"
                  stopColor="#00cfff"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <path
              d="M0 204 L30 185 L52 195 L78 152
              L101 165 L125 128 L148 146 L173 100
              L198 122 L220 91 L248 110 L272 70
              L300 88 L322 55 L350 73 L377 44
              L405 61 L432 30 L457 50 L482 23
              L506 42 L530 14 L555 32 L580 8
              L600 18 L600 250 L0 250 Z"
              fill="url(#parabin-chart-gradient)"
            />

            <polyline
              points="0,204 30,185 52,195 78,152
              101,165 125,128 148,146 173,100
              198,122 220,91 248,110 272,70
              300,88 322,55 350,73 377,44
              405,61 432,30 457,50 482,23
              506,42 530,14 555,32 580,8 600,18"
              fill="none"
              stroke="#1bcfff"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="terminal-bottom">
          <span>
            موجودی حساب
            <b>$24,580.00</b>
          </span>

          <span>
            بازدهی
            <b className="green">+8.42%</b>
          </span>
        </div>
      </div>

      <div className="floating-stat stat-one">
        <span className="stat-icon">↗</span>
        <small>سهم سود تا</small>
        <b>۱۰۰٪</b>
      </div>

      <div className="floating-stat stat-two">
        <span className="stat-icon">✓</span>
        <small>انتخاب آگاهانه</small>
        <b>مقایسه شفاف</b>
      </div>

      <div className="hero-orbit orbit-one" />
      <div className="hero-orbit orbit-two" />
    </div>
  );
}

export default async function HomePage() {
  const [
    { firms, polls, settings },
    articles,
    activeLotteryRounds,
  ] = await Promise.all([
    getContent(),
    getPublishedArticles(),
    getActiveLotteryRounds(),
  ]);

  // تنظیم قدیمی گردونه، حتی اگر در دیتابیس مانده باشد،
  // در صفحه اصلی استفاده نمی‌شود.

const visibleSections = parseHomeSections(
  settings.homeSectionsJson
);
// Keep the requested social banners visible on the homepage even if the
// social section was accidentally removed from the saved section order.
if (!visibleSections.includes("social")) {
  visibleSections.push("social");
}


  const hasHeroImage =
    settings.heroImageUrl !== "" &&
    isSafeSiteImage(settings.heroImageUrl);

  
const content: Record<
  HomeSectionId,
  ReactNode
> = {

    hero: (
      <section className="hero relative">
        {hasHeroImage && (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
              style={{
                backgroundImage:
                  `url("${settings.heroImageUrl}")`,
              }}
            />

            <div className="pointer-events-none absolute inset-0 bg-background/50" />
          </>
        )}

        <div className="container hero-grid relative">
          <div className="hero-copy">
            <span className="eyebrow">
              <i />
              {settings.heroEyebrow}
            </span>

            <h1>
              {settings.heroTitle}
              <br />
              <em>{settings.heroHighlight}</em>
              {" "}برای تریدرها
            </h1>

            <p>{settings.heroDescription}</p>

            <div className="hero-actions">
              <Link
                href="/firms"
                className="button button-primary button-large"
              >
                مشاهده شرکت‌های پراپ
                <span>←</span>
              </Link>

              <Link
                href="/compare"
                className="button button-outline button-large"
              >
                مقایسه پراپ‌ها
              </Link>
            </div>

            <div className="hero-trust">
              <div>
                <b>
                  {firms.length.toLocaleString("fa-IR")}
                </b>
                <span>شرکت قابل بررسی</span>
              </div>

              <div>
                <b>شفاف</b>
                <span>قوانین و تخفیف‌ها</span>
              </div>

              <div>
                <b>رایگان</b>
                <span>ابزار مقایسه</span>
              </div>
            </div>
          </div>

          <TradingVisual />
        </div>
      </section>
    ),

    features: (
      <section className="border-b border-border-theme bg-surface">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-3 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
          {features.map(({ Icon, ...item }) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border-theme bg-background p-4 transition-colors hover:border-primary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={21} />
              </div>

              <span className="text-xs font-bold text-foreground sm:text-sm">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),

    firms: (
      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-primary">
              بررسی شرکت‌ها
            </span>

            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              {settings.firmsTitle}
            </h2>

            <p className="mt-3 text-sm text-muted">
              {settings.firmsDescription}
            </p>
          </div>

          <Link
            href="/firms"
            className="text-sm font-semibold text-primary"
          >
            مشاهده همه ←
          </Link>
        </div>

        <HomeFirmCarousel firms={firms} />
      </section>
    ),

    compare: (
      <section className="compare-banner">
        <div className="container compare-banner-inner">
          <div>
            <span className="eyebrow">
              تصمیم دقیق‌تر
            </span>

            <h2>{settings.compareTitle}</h2>
            <p>{settings.compareDescription}</p>
          </div>

          <Link
            href="/compare"
            className="button button-primary button-large"
          >
            شروع مقایسه
            <span>←</span>
          </Link>

          <div
            className="banner-decoration"
            aria-hidden="true"
          >
            ⇄
          </div>
        </div>
      </section>
    ),

    articles: (
      <section className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold text-primary">
              <BookOpen size={17} />
              آموزش و مقالات
            </span>

            <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              {settings.articlesTitle}
            </h2>

            <p className="mt-3 text-sm text-muted">
              {settings.articlesDescription}
            </p>
          </div>

          <Link
            href="/articles"
            className="text-sm font-semibold text-primary"
          >
            همه مقالات ←
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
            />
          ))}
        </div>
      </section>
    ),

    reviews: (
      <FeaturedReviews
        polls={polls}
        firms={firms}
        title={settings.reviewsTitle}
      />
    ),

    social: (
      <SocialSection
        instagram={settings.instagram}
        telegram={settings.telegram}
        siteName={settings.name}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {activeLotteryRounds.filter((round) => round.articleSlug).map((round) => (
          <section key={round.period} className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-primary/40 bg-surface p-7 text-center shadow-lg sm:flex-row sm:text-right">
              <div>
                <p className="mb-2 text-3xl">🎟️</p>
                <h2 className="text-2xl font-extrabold">{round.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">{round.description}</p>
                <p className="mt-2 text-xs text-muted">دوره: {round.period}</p>
              </div>
              <Link href={`/lottery?period=${encodeURIComponent(round.period)}`}
                className="shrink-0 rounded-xl bg-primary px-6 py-3 font-bold text-white">
                مطالعه مقاله و شرکت ←
              </Link>
            </div>
          </section>
      ))}

      {visibleSections.filter((id) => id !== "reviews").map((id) => (
        <div key={id}>
          {content[id]}
        </div>
      ))}

      <section className="border-t border-border-theme bg-surface">
        <div className="mx-auto flex max-w-[1200px] items-start gap-3 px-4 py-7 text-xs leading-8 text-muted sm:px-6 lg:px-8">
          <ShieldCheck
            size={22}
            className="shrink-0 text-primary"
          />

          <p>
            اطلاعات و شرایط شرکت‌های پراپ ممکن است
            تغییر کنند. پیش از خرید، قوانین رسمی
            هر شرکت را بررسی کنید.
          </p>
        </div>
      </section>
    </div>
  );
}
