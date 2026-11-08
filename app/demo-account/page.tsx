
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  MessageSquare,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";

export const metadata = {
  title: "پنل کاربری نمایشی",
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: "نظرات من",
    description:
      "مشاهده نظرات ارسال‌شده و وضعیت تأیید آنها",
    Icon: MessageSquare,
  },
  {
    title: "علاقه‌مندی‌ها",
    description:
      "بخش شرکت‌های پراپ ذخیره‌شده کاربر",
    Icon: Heart,
  },
  {
    title: "امتیازهای من",
    description:
      "نمای کلی امتیازهای ثبت‌شده توسط کاربر",
    Icon: Star,
  },
];

export default function DemoAccountPage() {
  return (
    <div
      dir="rtl"
      className="min-h-[75vh] bg-background px-4 py-12 text-foreground"
    >
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-border-theme bg-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound size={32} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold">
                پنل کاربری پراپ‌بین
              </h1>
              <p className="mt-2 text-sm text-muted">
                خوش آمدید، کاربر نمایشی
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-primary/10 p-4 text-sm leading-7 text-primary">
            <ShieldCheck
              size={20}
              className="mt-1 shrink-0"
            />
            حالت نمایشی فعال است؛
            برای مشاهده این صفحه نیازی به
            ثبت‌نام یا ورود نیست.
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {sections.map(
            ({ title, description, Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-border-theme bg-surface p-6"
              >
                <Icon
                  size={25}
                  className="text-primary"
                />
                <h2 className="mt-5 font-bold">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {description}
                </p>
                <p className="mt-5 text-xs text-primary">
                  پیش‌نمایش
                </p>
              </article>
            )
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border-theme bg-surface p-6">
          <h2 className="text-lg font-bold">
            اطلاعات حساب
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-secondary p-4">
              <p className="text-xs text-muted">
                نام نمایشی
              </p>
              <p className="mt-2 font-semibold">
                کاربر نمایشی پراپ‌بین
              </p>
            </div>

            <div className="rounded-xl bg-surface-secondary p-4">
              <p className="text-xs text-muted">
                نوع حساب
              </p>
              <p className="mt-2 font-semibold">
                نمایش به کارفرما
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/demo"
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-theme bg-surface px-5 text-sm font-semibold"
        >
          <ArrowRight size={18} />
          بازگشت به انتخاب پنل
        </Link>
      </div>
    </div>
  );
}
