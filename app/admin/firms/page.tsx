
import Link from "next/link";

import {
  Building2,
  CheckCircle2,
  CircleOff,
  ArrowRight,
  Star,
  TicketPercent,
  Plus,
} from "lucide-react";

import { requireAdmin } from "@/lib/admin";
import { listAdminFirms } from "@/lib/admin-firms";
import DeleteFirmButton from "@/components/admin/DeleteFirmButton";

export const dynamic = "force-dynamic";

export default async function AdminFirmsPage() {
  // بررسی دسترسی مدیر
  await requireAdmin();

  // دریافت شرکت‌ها از Supabase
  const firms = await listAdminFirms();

  const activeCount = firms.filter(
    (firm) => firm.is_active
  ).length;

  const inactiveCount = firms.length - activeCount;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        {/* عنوان صفحه و دکمه‌ها */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-primary">
              پنل مدیریت پراپ‌بین
            </p>

            <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
              <Building2
                className="text-primary"
                size={28}
              />
              مدیریت شرکت‌های پراپ
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted">
              مشاهده، افزودن، ویرایش و حذف شرکت‌های
              ثبت‌شده
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/firms/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              <Plus size={18} />
              افزودن شرکت جدید
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-border-theme bg-surface px-5 py-3 text-sm font-bold transition hover:opacity-80"
            >
              <ArrowRight size={17} />
              بازگشت به پنل
            </Link>
          </div>
        </div>

        {/* آمار شرکت‌ها */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {/* تعداد کل */}
          <div className="rounded-2xl border border-border-theme bg-surface p-5">
            <p className="flex items-center gap-2 text-sm text-muted">
              <Building2 size={17} />
              کل شرکت‌ها
            </p>

            <p className="mt-4 text-3xl font-extrabold">
              {firms.length.toLocaleString("fa-IR")}
            </p>
          </div>

          {/* شرکت‌های فعال */}
          <div className="rounded-2xl border border-border-theme bg-surface p-5">
            <p className="flex items-center gap-2 text-sm text-muted">
              <CheckCircle2 size={17} />
              شرکت‌های فعال
            </p>

            <p className="mt-4 text-3xl font-extrabold text-green-500">
              {activeCount.toLocaleString("fa-IR")}
            </p>
          </div>

          {/* شرکت‌های غیرفعال */}
          <div className="rounded-2xl border border-border-theme bg-surface p-5">
            <p className="flex items-center gap-2 text-sm text-muted">
              <CircleOff size={17} />
              شرکت‌های غیرفعال
            </p>

            <p className="mt-4 text-3xl font-extrabold text-amber-500">
              {inactiveCount.toLocaleString("fa-IR")}
            </p>
          </div>
        </div>

        {/* جدول مدیریت شرکت‌ها */}
        <section className="overflow-hidden rounded-2xl border border-border-theme bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-theme p-5">
            <div>
              <h2 className="text-lg font-extrabold">
                فهرست شرکت‌ها
              </h2>

              <p className="mt-2 text-xs text-muted">
                اطلاعات مستقیماً از جدول prop_firms
                دریافت می‌شود.
              </p>
            </div>

            <span className="rounded-lg bg-background px-3 py-2 text-xs font-bold text-muted">
              {firms.length.toLocaleString("fa-IR")} شرکت
            </span>
          </div>

          {firms.length === 0 ? (
            <div className="space-y-4 p-12 text-center">
              <p className="text-sm text-muted">
                هنوز هیچ شرکتی ثبت نشده است.
              </p>

              <Link
                href="/admin/firms/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                <Plus size={17} />
                افزودن اولین شرکت
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-right text-sm">
                <thead className="bg-background text-muted">
                  <tr>
                    <th className="px-5 py-4">
                      شرکت
                    </th>

                    <th className="px-5 py-4">
                      امتیاز
                    </th>

                    <th className="px-5 py-4">
                      سرمایه
                    </th>

                    <th className="px-5 py-4">
                      هزینه
                    </th>

                    <th className="px-5 py-4">
                      تخفیف
                    </th>

                    <th className="px-5 py-4">
                      وضعیت
                    </th>

                    <th className="px-5 py-4">
                      ترتیب
                    </th>

                    <th className="px-5 py-4">
                      عملیات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {firms.map((firm) => (
                    <tr
                      key={firm.id}
                      className="border-t border-border-theme transition hover:bg-background/50"
                    >
                      {/* نام و لوگوی متنی شرکت */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-gray-900"
                            style={{
                              backgroundColor: firm.color,
                            }}
                          >
                            {firm.logo ? <img src={firm.logo} alt={`لوگوی ${firm.name}`} className="h-full w-full rounded-xl object-contain" /> : (firm.logo_text || firm.name.slice(0, 2))}
                          </div>

                          <div>
                            <p className="font-bold">
                              {firm.name}
                            </p>

                            <p
                              dir="ltr"
                              className="mt-1 text-left text-xs text-muted"
                            >
                              {firm.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* امتیاز */}
                      <td className="px-5 py-5">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Star
                            size={15}
                            className="text-amber-500"
                          />
                          {firm.rating}
                        </span>
                      </td>

                      {/* سرمایه */}
                      <td className="px-5 py-5">
                        {firm.capital || "—"}
                      </td>

                      {/* هزینه */}
                      <td className="px-5 py-5">
                        {firm.fee || "—"}
                      </td>

                      {/* تخفیف و کد */}
                      <td className="px-5 py-5">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 font-bold text-green-500">
                            <TicketPercent size={15} />
                            {firm.discount || "—"}
                          </p>

                          <p
                            dir="ltr"
                            className="text-left text-xs text-muted"
                          >
                            {firm.code || "—"}
                          </p>
                        </div>
                      </td>

                      {/* وضعیت */}
                      <td className="px-5 py-5">
                        {firm.is_active ? (
                          <span className="inline-flex rounded-lg bg-green-500/10 px-3 py-2 text-xs font-bold text-green-500">
                            فعال
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-500">
                            غیرفعال
                          </span>
                        )}
                      </td>

                      {/* ترتیب نمایش */}
                      <td className="px-5 py-5 font-bold">
                        {firm.sort_order.toLocaleString(
                          "fa-IR"
                        )}
                      </td>

                      {/* عملیات */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/firms/${encodeURIComponent(
                              firm.id
                            )}/edit`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
                          >
                            ویرایش
                          </Link>

                          <DeleteFirmButton
                            firmId={firm.id}
                            firmName={firm.name}
                            isActive={firm.is_active}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* توضیح امنیتی */}
        <p className="mt-5 text-xs leading-7 text-muted">
          برای حذف شرکت، ابتدا باید آن را غیرفعال
          کنی. حذف دائمی است و قبل از انجام آن،
          تأیید شناسه دقیق شرکت الزامی است.
        </p>
      </div>
    </main>
  );
}
