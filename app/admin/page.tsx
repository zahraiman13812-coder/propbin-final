import Link from "next/link";
import {
  ArrowUpLeft,
  BookOpen,
  Building2,
  MessageSquare,
  ShieldAlert,
  Tags,
} from "lucide-react";

import { requireAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function getDashboardCounts() {
  const supabase = getSupabaseAdmin();

  const [firmsResult, discountsResult, articlesResult, pollsResult] =
    await Promise.all([
      supabase
        .from("prop_firms")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("prop_firms")
        .select("id", { count: "exact", head: true })
        .not("code", "is", null)
        .neq("code", ""),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("site_polls")
        .select("id", { count: "exact", head: true }),
    ]);

  const failed = [
    firmsResult,
    discountsResult,
    articlesResult,
    pollsResult,
  ].find((result) => result.error);

  if (failed?.error) {
    console.error("Admin dashboard counts query failed:", {
      message: failed.error.message,
      code: failed.error.code,
      details: failed.error.details,
      hint: failed.error.hint,
    });
    throw new Error("دریافت آمار پنل مدیریت ناموفق بود.");
  }

  return {
    firms: firmsResult.count ?? 0,
    discounts: discountsResult.count ?? 0,
    articles: articlesResult.count ?? 0,
    polls: pollsResult.count ?? 0,
  };
}

export default async function Dashboard() {
  await requireAdmin();

  const counts = await getDashboardCounts();

  const boxes = [
    {
      label: "شرکت‌های پراپ",
      count: counts.firms,
      href: "/admin/firms",
      Icon: Building2,
    },
    {
      label: "کدهای تخفیف",
      count: counts.discounts,
      href: "/admin/discounts",
      Icon: Tags,
    },
    {
      label: "مقالات",
      count: counts.articles,
      href: "/admin/articles",
      Icon: BookOpen,
    },
    {
      label: "نظرسنجی‌ها",
      count: counts.polls,
      href: "/admin/polls",
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
          
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {boxes.map(({ label, count, href, Icon }) => (
          <Link
            href={href}
            key={href}
            className="rounded-2xl border border-border-theme bg-surface p-5 hover:border-primary"
          >
            <Icon className="text-primary" size={24} />
            <p className="mt-5 text-sm text-muted">{label}</p>
            <p className="mt-2 text-3xl font-extrabold">
              {count.toLocaleString("fa-IR")}
            </p>
            <ArrowUpLeft
              className="mr-auto text-primary"
              size={18}
            />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border-theme bg-surface p-5">
          <h3 className="mb-4 font-bold">میانبرهای مدیریت</h3>
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
              href="/admin/settings"
              className="rounded-xl bg-surface-secondary p-3 text-sm hover:text-primary"
            >
              تنظیمات سایت
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border-theme bg-surface p-5">
          <ShieldAlert className="text-primary" />
          <h3 className="mt-3 font-bold">وضعیت ذخیره‌سازی</h3>
          <p className="mt-3 text-sm leading-8 text-muted">
            
          </p>
          <p className="mt-2 text-sm text-muted">
            نظرات تازه تا پیش از تأیید مدیر در بخش عمومی نمایش داده نمی‌شوند.
          </p>
        </div>
      </div>
    </div>
  );
}
