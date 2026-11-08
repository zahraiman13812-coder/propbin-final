
import Link from "next/link";

import {
  Building2,
  TicketPercent,
  BookOpen,
  MessageSquare,
  ArrowUpLeft,
  ShieldCheck,
} from "lucide-react";

import {
  getContent,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function DemoDashboard() {
  const content = await getContent();

  const boxes = [
    {
      label: "شرکت‌های پراپ",
      count: content.firms.length,
      href: "/demo-admin/firms",
      Icon: Building2,
    },
    {
      label: "کدهای تخفیف",
      count: content.firms.filter(
        (firm) => Boolean(firm.code)
      ).length,
      href: "/demo-admin/discounts",
      Icon: TicketPercent,
    },
    {
      label: "مقالات",
      count: content.articles.length,
      href: "/demo-admin/articles",
      Icon: BookOpen,
    },
    {
      label: "نظرسنجی‌ها",
      count: content.polls.filter(
        (poll) => poll.approved
      ).length,
      href: "/demo-admin/polls",
      Icon: MessageSquare,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-bold">
          خوش اومدی به پنل پراپ‌بین
        </h2>
        <p className="mt-2 text-sm text-muted">
          نسخه نمایشی مدیریت — فقط مشاهده
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {boxes.map(
          ({ label, count, href, Icon }) => (
            <Link
              href={href}
              key={href}
              className="rounded-2xl border border-border-theme bg-surface p-5 hover:border-primary"
            >
              <Icon
                className="text-primary"
                size={24}
              />
              <p className="mt-5 text-sm text-muted">
                {label}
              </p>
              <p className="mt-2 text-3xl font-extrabold">
                {count.toLocaleString("fa-IR")}
              </p>
              <ArrowUpLeft
                className="mr-auto text-primary"
                size={18}
              />
            </Link>
          )
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border-theme bg-surface p-5">
          <h3 className="mb-4 font-bold">
            میانبرهای مدیریت
          </h3>

          <div className="grid gap-2">
            {boxes.map((box) => (
              <Link
                href={box.href}
                key={box.href}
                className="flex justify-between rounded-xl bg-surface-secondary p-3 text-sm hover:text-primary"
              >
                {box.label}
                <ArrowUpLeft size={16} />
              </Link>
            ))}

            <Link
              href="/demo-admin/settings"
              className="rounded-xl bg-surface-secondary p-3 text-sm hover:text-primary"
            >
              تنظیمات سایت
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border-theme bg-surface p-5">
          <ShieldCheck className="text-primary" />
          <h3 className="mt-3 font-bold">
            حالت پیش‌نمایش فعال است
          </h3>
          <p className="mt-3 text-sm leading-8 text-muted">
            ساختار پنل مدیریت پراپ‌بین را مشاهده
            می‌کنید. افزودن، ویرایش، حذف و
            ذخیره اطلاعات در این حالت غیرفعال است.
          </p>
          <p className="mt-2 text-sm text-muted">
            تمام لینک‌های مدیریت در این بخش
            داخل نسخه نمایشی باقی می‌مانند.
          </p>
        </div>
      </div>
    </div>
  );
}
