"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Firm = {
  id: string;
  name: string;
  color: string;
  logo: string;
  logo_text: string;
  discount_intro: string;
};

type Discount = {
  id: string;
  firm_id: string;
  code: string;
  amount: string;
  description: string;
};

export default function DiscountsPage() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [items, setItems] = useState<Discount[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function loadDiscounts() {
      try {
        const response = await fetch("/api/discount-items", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "خطا در دریافت کدهای تخفیف");
        if (!cancelled) {
          setFirms(Array.isArray(data.firms) ? data.firms : []);
          setItems(Array.isArray(data.discounts) ? data.discounts : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "خطا در دریافت کدهای تخفیف");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDiscounts();
    return () => { cancelled = true; };
  }, []);

  async function copy(code: string, id: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
    } catch {
      setCopied("");
    }
  }

  return (
    <main dir="rtl" className="page-shell min-w-0 text-foreground">
      <div className="container mx-auto max-w-6xl space-y-6 py-10">
        <div className="page-heading">
          <span className="eyebrow">پیشنهادهای ویژه</span>
          <h1>کدهای <em>تخفیف پراپ</em></h1>
          <p>کدها و شرایط استفاده را پیش از خرید در سایت رسمی شرکت بررسی کنید.</p>
        </div>

        {loading && <p>در حال دریافت تخفیف‌ها...</p>}
        {error && <p role="alert" className="text-danger">{error}</p>}

        {!loading && !error && firms.map((firm) => {
          const codes = items.filter((item) => item.firm_id === firm.id);

          return (
            <section
              id={firm.id}
              key={firm.id}
              className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-border-theme bg-surface"
            >
              <header className="flex flex-wrap items-center gap-3 border-b border-border-theme p-4 sm:p-5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-theme bg-surface-secondary font-bold"
                  style={{ color: firm.color }}
                >
                  {firm.logo ? (
                    <img src={firm.logo} alt={`لوگوی ${firm.name}`} className="h-full w-full object-contain" />
                  ) : (
                    firm.logo_text || firm.name.slice(0, 2)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-extrabold sm:text-lg">کد تخفیف {firm.name}</h2>
                  {firm.discount_intro && (
                    <p className="mt-1 whitespace-pre-line break-words text-xs leading-7 text-muted sm:text-sm">
                      {firm.discount_intro}
                    </p>
                  )}
                </div>
              </header>

              {/* هر کد تخفیف یک ردیف تمام‌عرض است؛ نه شبکه دو ستونه */}
              <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-5">
                {codes.map((discount) => (
                  <article
                    key={discount.id}
                    className="min-w-0 rounded-xl border border-border-theme bg-surface-secondary p-3 sm:p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                        <span className="w-fit shrink-0 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-extrabold text-emerald-400 sm:text-sm">
                          {discount.amount} تخفیف
                        </span>
                        <p className="min-w-0 flex-1 whitespace-pre-line break-words text-xs leading-7 text-muted sm:text-sm">
                          {discount.description || "بدون توضیحات"}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0">
                        <span
                          dir="ltr"
                          className="max-w-full rounded-lg border border-border-theme bg-background px-3 py-2 text-left text-sm font-bold text-foreground [overflow-wrap:anywhere]"
                        >
                          {discount.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copy(discount.code, discount.id)}
                          className="min-h-10 shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 sm:text-sm"
                        >
                          {copied === discount.id ? "کپی شد ✓" : "کپی کد"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {codes.length === 0 && (
                  <p className="py-3 text-sm text-muted">فعلاً کد تخفیفی ثبت نشده است.</p>
                )}
              </div>

              <footer className="flex flex-wrap gap-3 border-t border-border-theme p-4 sm:px-5">
                <Link
                  href={`/firms/${encodeURIComponent(firm.id)}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border-theme px-4 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary hover:text-primary sm:text-sm"
                >
                  مشاهده بررسی کامل
                </Link>
              </footer>
            </section>
          );
        })}
      </div>
    </main>
  );
}
