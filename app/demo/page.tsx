
import Link from "next/link";
import {
  ArrowUpLeft,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export const metadata = {
  title: "نسخه نمایشی پنل‌ها",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <div
      dir="rtl"
      className="min-h-[75vh] bg-background px-4 py-14 text-foreground"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-9 text-center">
          <p className="text-sm font-bold text-primary">
            نسخه نمایشی پراپ‌بین PB
          </p>
          <h1 className="mt-3 text-3xl font-extrabold">
            انتخاب پنل
          </h1>
          <p className="mt-3 text-sm leading-8 text-muted">
            برای مشاهده هر پنل فقط روی دکمه آن
            کلیک کنید. نیازی به رمز عبور نیست.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl border border-border-theme bg-surface p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound size={28} />
            </div>

            <h2 className="mt-5 text-xl font-extrabold">
              پنل کاربران
            </h2>

            <p className="mt-3 min-h-20 text-sm leading-8 text-muted">
              مشاهده نمای حساب کاربر،
              نظرات، امتیازها و علاقه‌مندی‌ها.
            </p>

            <Link
              href="/demo-account"
              className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              ورود بدون رمز
              <ArrowUpLeft size={18} />
            </Link>
          </section>

          <section className="rounded-2xl border border-border-theme bg-surface p-7">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck size={28} />
            </div>

            <h2 className="mt-5 text-xl font-extrabold">
              پنل مدیریت
            </h2>

            <p className="mt-3 min-h-20 text-sm leading-8 text-muted">
              مشاهده نمای داشبورد مدیریت،
              شرکت‌ها، مقالات و تنظیمات سایت.
            </p>

            <Link
              href="/demo-admin"
              className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              ورود بدون رمز
              <ArrowUpLeft size={18} />
            </Link>
          </section>
        </div>

        <p className="mt-8 text-center text-xs leading-7 text-muted">
          این دو پنل فقط برای نمایش هستند و
          اطلاعات واقعی سایت را تغییر نمی‌دهند.
        </p>
      </div>
    </div>
  );
}
