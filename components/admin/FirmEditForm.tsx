
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Firm = {
  id: string;
  name: string;
  rating: string;
  capital: string;
  website: string | null;
  profit: string;
  fee: string;
  discount: string;
  code: string;
  color: string;
  description: string;
  payout: string;
  purchase_method: string;
  challenge: string;
  logo_text: string;
  is_active: boolean;
  sort_order: number;
};

type FormState = Omit<Firm, "id" | "website"> & {
  website: string;
};

type Props = {
  firmId: string;
};

type ApiResponse = {
  success: boolean;
  firm?: Firm;
  error?: string;
};

const fields: {
  name: keyof Omit<
  FormState,
  "is_active" | "sort_order" | "website"
>;
  label: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}[] = [
  { name: "name", label: "نام شرکت" },
  { name: "rating", label: "امتیاز (۰ تا ۵)", dir: "ltr" },
  { name: "capital", label: "سرمایه", dir: "ltr" },
  { name: "profit", label: "درصد سود", dir: "ltr" },
  { name: "fee", label: "هزینه چالش", dir: "ltr" },
  { name: "payout", label: "پرداخت سود" },
  { name: "purchase_method", label: "نحوه خرید" },
  { name: "challenge", label: "نوع چالش" },
  { name: "logo_text", label: "متن جایگزین لوگو" },
  { name: "color", label: "رنگ شرکت", dir: "ltr" },
];

export default function FirmEditForm({ firmId }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFirm() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/admin/firms/${encodeURIComponent(firmId)}`,
          {
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as ApiResponse;

        if (!response.ok || !result.success || !result.firm) {
          throw new Error(
            result.error || "دریافت اطلاعات شرکت ناموفق بود."
          );
        }

        if (cancelled) return;

        const firm = result.firm;

        setForm({
          name: firm.name,
          rating: firm.rating,
          capital: firm.capital,
          profit: firm.profit,
          fee: firm.fee,
          discount: firm.discount,
          code: firm.code,
          color: firm.color,
          description: firm.description,
          website: firm.website ?? "",
          payout: firm.payout,
          purchase_method: firm.purchase_method ?? "",
          challenge: firm.challenge,
          logo_text: firm.logo_text,
          is_active: firm.is_active,
          sort_order: firm.sort_order,
        });

        setDirty(false);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "خطا در دریافت اطلاعات شرکت"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFirm();

    return () => {
      cancelled = true;
    };
  }, [firmId]);

  function changeField<K extends keyof FormState>(
    name: K,
    value: FormState[K]
  ) {
    setForm((previous) =>
      previous
        ? { ...previous, [name]: value }
        : previous
    );

    setDirty(true);
    setMessage("");
  }

  async function saveChanges(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/firms/${encodeURIComponent(firmId)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const result =
        (await response.json()) as ApiResponse;

      if (!response.ok || !result.success || !result.firm) {
        throw new Error(
          result.error || "ذخیره تغییرات شرکت ناموفق بود."
        );
      }

      const saved = result.firm;

      setForm({
        name: saved.name,
        rating: saved.rating,
        capital: saved.capital,
        profit: saved.profit,
        fee: saved.fee,
        discount: saved.discount,
        code: saved.code,
        color: saved.color,
        description: saved.description,
        website: saved.website ?? "",
        payout: saved.payout,
        purchase_method: saved.purchase_method ?? "",
        challenge: saved.challenge,
        logo_text: saved.logo_text,
        is_active: saved.is_active,
        sort_order: saved.sort_order,
      });

      setDirty(false);
      setMessage("اطلاعات شرکت با موفقیت ذخیره شد.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تغییرات"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-theme bg-surface p-8 text-center text-muted">
        در حال دریافت اطلاعات شرکت...
      </div>
    );
  }

  if (!form) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-500/30 bg-surface p-6">
        <p className="text-sm text-red-500">
          {error || "اطلاعات شرکت پیدا نشد."}
        </p>

        <Link
          href="/admin/firms"
          className="text-sm font-bold text-primary"
        >
          بازگشت به فهرست شرکت‌ها
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={saveChanges} className="space-y-6">
      <div className="grid gap-5 rounded-2xl border border-border-theme bg-surface p-5 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block space-y-2">
            <span className="text-sm font-bold">
              {field.label}
            </span>

            <input
              type="text"
              value={form[field.name]}
              onChange={(event) =>
                changeField(field.name, event.target.value)
              }
              dir={field.dir || "rtl"}
              className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
        ))}
      </div>
      
<div className="rounded-2xl border border-border-theme bg-surface p-5">
  <label className="block space-y-2">
    <span className="text-sm font-bold">
      آدرس وب‌سایت رسمی شرکت
    </span>

    <input
      type="url"
      dir="ltr"
      value={form.website}
      onChange={(event) =>
        changeField("website", event.target.value)
      }
      placeholder="https://example.com"
      maxLength={2048}
      className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-left text-sm outline-none focus:border-primary"
    />

    <p className="text-xs leading-6 text-muted">
      آدرس را با https:// وارد کن. برای حذف لینک،
      این فیلد را خالی بگذار.
    </p>
  </label>
</div>

      <div className="rounded-2xl border border-border-theme bg-surface p-5">
        <label className="block space-y-2">
          <span className="text-sm font-bold">
            توضیحات شرکت
          </span>

          <textarea
            value={form.description}
            onChange={(event) =>
              changeField("description", event.target.value)
            }
            rows={5}
            className="w-full resize-y rounded-xl border border-border-theme bg-background px-4 py-3 text-sm leading-7 outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="grid gap-5 rounded-2xl border border-border-theme bg-surface p-5 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-bold">
            ترتیب نمایش
          </span>

          <input
            type="number"
            min={0}
            max={10000}
            step={1}
            value={form.sort_order}
            onChange={(event) =>
              changeField(
                "sort_order",
                Number(event.target.value)
              )
            }
            className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm"
          />
        </label>

        <label className="flex items-center gap-3 self-end rounded-xl border border-border-theme bg-background p-4">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              changeField(
                "is_active",
                event.target.checked
              )
            }
            className="h-5 w-5 accent-primary"
          />

          <span className="text-sm font-bold">
            شرکت فعال باشد
          </span>
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600"
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || !dirty}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>

        <Link
          href="/admin/firms"
          className="rounded-xl border border-border-theme bg-surface px-6 py-3 text-sm font-bold"
        >
          بازگشت
        </Link>

        {dirty && (
          <span className="text-xs font-bold text-amber-500">
            تغییرات ذخیره‌نشده داری.
          </span>
        )}
      </div>
    </form>
  );
}
