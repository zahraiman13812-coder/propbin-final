
"use client";

import { useEffect } from "react";
import Link from "next/link";

import {
  AlertTriangle,
  RotateCcw,
  Home,
} from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page rendering error:", error);
  }, [error]);

  return (
    <section
      dir="rtl"
      className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16 text-foreground"
    >
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-danger/10 text-danger">
          <AlertTriangle size={40} />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold">
          مشکلی پیش اومده!
        </h1>

        <p className="mt-4 text-sm leading-8 text-muted">
          بارگذاری این بخش با خطا مواجه شده.
          لطفاً دوباره تلاش کن.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <RotateCcw size={18} />
            تلاش مجدد
          </button>

          <Link
            href="/"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-theme bg-surface px-5 text-sm font-bold"
          >
            <Home size={18} />
            صفحه اصلی
          </Link>
        </div>
      </div>
    </section>
  );
}
