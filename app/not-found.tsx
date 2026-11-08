
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Home,
  SearchX,
} from "lucide-react";

export const metadata: Metadata = {
  title: "صفحه پیدا نشد",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <section
      dir="rtl"
      className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16 text-foreground"
    >
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <SearchX size={40} />
        </div>

        <p className="mt-6 text-7xl font-black tracking-tight text-primary">
          ۴۰۴
        </p>

        <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
          این صفحه پیدا نشد!
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-8 text-muted">
          آدرس صفحه ممکنه تغییر کرده باشه یا
          صفحه موردنظر دیگه وجود نداشته باشه.
          می‌تونی به صفحه اصلی برگردی یا
          شرکت‌های پراپ رو بررسی کنی.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <Home size={18} />
            صفحه اصلی
          </Link>

          <Link
            href="/firms"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-theme bg-surface px-5 text-sm font-bold text-foreground"
          >
            بررسی پراپ‌ها
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
