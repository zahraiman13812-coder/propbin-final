
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowUpLeft,
  BookOpen,
  Building2,
  FileText,
  MessageSquare,
  Palette,
  Settings,
  ShieldCheck,
  TicketPercent,
} from "lucide-react";

import { getContent } from "@/lib/content";

const sections = {
  firms: {
    title: "شرکت‌های پراپ",
    Icon: Building2,
    description:
      "نمای اطلاعات شرکت‌های ثبت‌شده در سایت",
  },
  discounts: {
    title: "کدهای تخفیف",
    Icon: TicketPercent,
    description:
      "نمای کدهای تخفیف شرکت‌ها",
  },
  articles: {
    title: "مقالات",
    Icon: BookOpen,
    description:
      "نمای مقالات آموزشی منتشرشده",
  },
  polls: {
    title: "نظرسنجی‌ها",
    Icon: MessageSquare,
    description:
      "نمای نظرات تأییدشده کاربران",
  },
  featured: {
    title: "نظرات منتخب",
    Icon: ShieldCheck,
    description:
      "نظرات تأییدشده و منتخب صفحه اصلی",
  },
  appearance: {
    title: "مدیریت ظاهر",
    Icon: Palette,
    description:
      "نمای تنظیمات عمومی ظاهر سایت",
  },
  settings: {
    title: "تنظیمات سایت",
    Icon: Settings,
    description:
      "نمای اطلاعات و عنوان‌های سایت",
  },
} as const;

type SectionName = keyof typeof sections;

export const dynamic = "force-dynamic";

function DisplayRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-theme py-4 last:border-b-0">
      <span className="text-sm text-muted">
        {label}
      </span>
      <span className="break-all text-sm font-semibold">
        {value || "—"}
      </span>
    </div>
  );
}

export default async function DemoAdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!Object.hasOwn(sections, section)) {
    notFound();
  }

  const key = section as SectionName;
  const current = sections[key];
  const Icon = current.Icon;

  const content = await getContent();

  const approvedPolls = content.polls.filter(
    (poll) => poll.approved
  );

  const featuredPolls = approvedPolls.filter(
    (poll) => poll.featured
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {current.title}
        </h2>

        <p className="mt-2 text-sm text-muted">
          {current.description}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <ShieldCheck
          size={21}
          className="mt-1 shrink-0 text-primary"
        />

        <p className="text-sm leading-7 text-muted">
          این بخش نسخه نمایشی پنل مدیریت است.
          اطلاعات خصوصی یا در انتظار تأیید
          نمایش داده نمی‌شوند و امکان ذخیره،
          ویرایش یا حذف وجود ندارد.
        </p>
      </div>

      {key === "firms" && (
        <div className="space-y-3">
          {content.firms.map((firm) => (
            <div
              key={firm.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-theme bg-surface p-5"
            >
              <div>
                <Building2
                  size={20}
                  className="mb-3 text-primary"
                />
                <h3 className="font-bold">
                  {firm.name}
                </h3>
                <p className="mt-2 text-xs text-muted">
                  شناسه شرکت: {firm.id}
                </p>
              </div>

              <Link
                href="/firms"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                مشاهده در سایت
                <ArrowUpLeft size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {key === "discounts" && (
        <div className="space-y-3">
          {content.firms
            .filter((firm) => Boolean(firm.code))
            .map((firm) => (
              <div
                key={firm.id}
                className="rounded-2xl border border-border-theme bg-surface p-5"
              >
                <h3 className="font-bold">
                  {firm.name}
                </h3>

                <DisplayRow
                  label="کد تخفیف"
                  value={firm.code}
                />
              </div>
            ))}
        </div>
      )}

      {key === "articles" && (
        <div className="grid gap-4 md:grid-cols-2">
          {content.articles.map((article) => (
            <article
              key={article.slug}
              className="rounded-2xl border border-border-theme bg-surface p-5"
            >
              <FileText
                size={23}
                className="text-primary"
              />

              <h3 className="mt-4 font-bold">
                {article.title}
              </h3>

              <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted">
                {article.excerpt}
              </p>

              <Link
                href={`/articles/${encodeURIComponent(
                  article.slug
                )}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                مشاهده مقاله
                <ArrowUpLeft size={16} />
              </Link>
            </article>
          ))}
        </div>
      )}

      {(key === "polls" || key === "featured") && (
        <div className="space-y-4">
          {(key === "featured"
            ? featuredPolls
            : approvedPolls
          ).map((poll) => {
            const firm = content.firms.find(
              (item) => item.id === poll.firmId
            );

            const average =
              (
                poll.trust +
                poll.support +
                poll.payout +
                poll.rules
              ) / 4;

            return (
              <div
                key={poll.id}
                className="rounded-2xl border border-border-theme bg-surface p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>
                    {firm?.name || "شرکت پراپ"}
                  </strong>

                  <span className="text-sm font-bold text-primary">
                    {average.toFixed(1)} از ۵
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-8 text-muted">
                  {poll.comment || "بدون توضیح"}
                </p>

                <p className="mt-3 text-xs text-muted">
                  {poll.featured
                    ? "نظر منتخب"
                    : "نظر تأییدشده"}
                </p>
              </div>
            );
          })}

          {(key === "featured"
            ? featuredPolls
            : approvedPolls
          ).length === 0 && (
            <div className="rounded-2xl border border-border-theme bg-surface p-8 text-center text-sm text-muted">
              هنوز نظری برای نمایش وجود ندارد.
            </div>
          )}
        </div>
      )}

      {key === "appearance" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border-theme bg-surface p-6">
            <h3 className="mb-5 font-bold">
              لوگوی سایت
            </h3>

            <div className="flex min-h-36 items-center justify-center rounded-xl bg-surface-secondary">
              <img
                src={content.settings.logoUrl || "/pb-logo.png"}
                alt="لوگوی فعلی سایت"
                className="h-24 w-24 object-contain"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border-theme bg-surface p-6">
            <h3 className="mb-5 font-bold">
              رنگ‌های برند
            </h3>

            <DisplayRow
              label="رنگ حالت تیره"
              value={content.settings.primaryDark}
            />

            <DisplayRow
              label="رنگ حالت روشن"
              value={content.settings.primaryLight}
            />
          </div>
        </div>
      )}

      {key === "settings" && (
        <div className="rounded-2xl border border-border-theme bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Settings
              size={22}
              className="text-primary"
            />
            <h3 className="font-bold">
              اطلاعات سایت
            </h3>
          </div>

          <DisplayRow
            label="نام سایت"
            value={content.settings.name}
          />

          <DisplayRow
            label="شعار سایت"
            value={content.settings.tagline}
          />

          <DisplayRow
            label="عنوان بخش پراپ‌ها"
            value={content.settings.firmsTitle}
          />

          <DisplayRow
            label="عنوان بخش مقالات"
            value={content.settings.articlesTitle}
          />

          <DisplayRow
            label="عنوان بخش نظرات"
            value={content.settings.reviewsTitle}
          />

          <DisplayRow
            label="ایمیل تماس عمومی"
            value={content.settings.contactEmail}
          />
        </div>
      )}

      <Link
        href="/demo-admin"
        className="inline-flex items-center gap-2 rounded-xl border border-border-theme bg-surface px-5 py-3 text-sm font-semibold hover:border-primary"
      >
        بازگشت به داشبورد
        <ArrowUpLeft size={17} />
      </Link>

      <div className="text-xs text-muted">
        <Icon
          size={15}
          className="ml-2 inline text-primary"
        />
        {current.title} — حالت نمایشی
      </div>
    </div>
  );
}
