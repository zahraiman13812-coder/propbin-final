
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import FirmLogoUpload from "@/components/admin/FirmLogoUpload";

type FirmForm = {
  id: string;
  name: string;
  rating: string;
  capital: string;
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
  logo: string;
  sort_order: string;
};

type TextField = Exclude<
  keyof FirmForm,
  "description" | "sort_order" | "logo"
>;

type CreateResponse = {
  success?: boolean;
  error?: string;
  firm?: {
    id: string;
    name: string;
  };
};

const initialForm: FirmForm = {
  id: "",
  name: "",
  rating: "0",
  capital: "",
  profit: "",
  fee: "",
  discount: "",
  code: "",
  color: "#64748b",
  description: "",
  payout: "",
  purchase_method: "",
  challenge: "",
  logo_text: "",
  logo: "",
  sort_order: "0",
};

const fields: {
  name: TextField;
  label: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
}[] = [
  {
    name: "id",
    label: "شناسه یکتای شرکت",
    placeholder: "example-prop",
    dir: "ltr",
    required: true,
  },
  {
    name: "name",
    label: "نام شرکت",
    placeholder: "نام شرکت پراپ",
    required: true,
  },
  {
    name: "rating",
    label: "امتیاز از ۵",
    placeholder: "0",
    dir: "ltr",
    required: true,
  },
  {
    name: "capital",
    label: "حداکثر سرمایه",
    placeholder: "$100,000",
    dir: "ltr",
  },
  {
    name: "profit",
    label: "سهم سود",
    placeholder: "80%",
    dir: "ltr",
  },
  {
    name: "fee",
    label: "هزینه چالش",
    placeholder: "$100",
    dir: "ltr",
  },
  {
    name: "payout",
    label: "پرداخت سود",
    placeholder: "مثلاً هر ۱۴ روز",
  },
  {
    name: "purchase_method",
    label: "نحوه خرید",
    placeholder: "پرداخت ریالی یا رمزارز",
  },
  {
    name: "challenge",
    label: "نوع چالش",
    placeholder: "دو مرحله‌ای",
  },
  {
    name: "logo_text",
    label: "متن جایگزین لوگو",
    placeholder: "EP",
  },
  {
    name: "color",
    label: "رنگ شرکت",
    placeholder: "#64748b",
    dir: "ltr",
    required: true,
  },
];

export default function FirmCreateForm() {
  const [form, setForm] = useState<FirmForm>(
    initialForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof FirmForm>(
    key: K,
    value: FirmForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setError("");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");

    const id = form.id.trim();
    const name = form.name.trim();
    const ratingText = form.rating.trim();
    const rating = Number(ratingText);
    const color = form.color.trim();
    const orderText = form.sort_order.trim();
    const sortOrder = Number(orderText);

    if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) {
      setError(
        "شناسه باید با حرف یا عدد انگلیسی شروع شود و فقط حروف کوچک انگلیسی، عدد، خط تیره و زیرخط داشته باشد."
      );
      return;
    }

    if (!name || name.length > 300) {
      setError(
        "نام شرکت الزامی است و حداکثر ۳۰۰ کاراکتر دارد."
      );
      return;
    }

    if (
      !ratingText ||
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 5
    ) {
      setError(
        "امتیاز باید عددی بین صفر تا پنج باشد."
      );
      return;
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      setError("رنگ باید مانند #64748b باشد.");
      return;
    }

    if (
      !orderText ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 10000
    ) {
      setError(
        "ترتیب نمایش باید عددی بین صفر تا ۱۰۰۰۰ باشد."
      );
      return;
    }

    const confirmed = window.confirm(
      "شرکت جدید به‌صورت غیرفعال ثبت می‌شود. ادامه می‌دهی؟"
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/firms",
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            name,
            rating: ratingText,
            capital: form.capital.trim(),
            profit: form.profit.trim(),
            fee: form.fee.trim(),
            discount: form.discount.trim(),
            code: form.code.trim(),
            color,
            description: form.description.trim(),
            payout: form.payout.trim(),
            purchase_method: form.purchase_method.trim(),
            challenge: form.challenge.trim(),
            logo_text: form.logo_text.trim(),
            logo: form.logo,
            sort_order: sortOrder,
            is_active: false,
          }),
        }
      );

      const result =
        (await response.json()) as CreateResponse;

      if (
        !response.ok ||
        result.success !== true ||
        !result.firm?.id
      ) {
        throw new Error(
          result.error ||
            "ثبت شرکت جدید ناموفق بود."
        );
      }

      // After creating the inactive firm,
      // complete its website and activation
      // settings in the edit page.
      const editUrl =
        `/admin/firms/${encodeURIComponent(
          result.firm.id
        )}/edit`;

      window.location.assign(editUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ثبت شرکت"
      );
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6"
      dir="rtl"
    >
      <FirmLogoUpload value={form.logo} onChange={(value) => update("logo", value)} />
      <div className="rounded-2xl border border-border-theme bg-surface p-5">
        <h2 className="text-lg font-extrabold">
          اطلاعات شرکت جدید
        </h2>

        <p className="mt-2 text-sm leading-7 text-muted">
          شناسه شرکت پس از ثبت قابل تغییر نیست.
          فقط از حروف کوچک انگلیسی، اعداد،
          خط تیره و زیرخط استفاده کن.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {fields.map((field) => (
            <label
              key={field.name}
              className="block min-w-0 space-y-2"
            >
              <span className="text-sm font-bold">
                {field.label}
                {field.required && (
                  <span className="mr-1 text-red-500">
                    *
                  </span>
                )}
              </span>

              <input
                type="text"
                dir={field.dir || "rtl"}
                required={field.required}
                value={form[field.name]}
                placeholder={field.placeholder}
                onChange={(event) =>
                  update(
                    field.name,
                    event.target.value
                  )
                }
                maxLength={
                  field.name === "id" ? 80 : 300
                }
                className="w-full min-w-0 rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border-theme bg-surface p-5">
        <label className="block space-y-2">
          <span className="text-sm font-bold">
            توضیحات شرکت
          </span>

          <textarea
            rows={5}
            maxLength={5000}
            value={form.description}
            onChange={(event) =>
              update(
                "description",
                event.target.value
              )
            }
            placeholder="توضیحات و نکات مهم درباره شرکت..."
            className="w-full resize-y rounded-xl border border-border-theme bg-background px-4 py-3 text-sm leading-7 text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-border-theme bg-surface p-5">
        <label className="block max-w-sm space-y-2">
          <span className="text-sm font-bold">
            ترتیب نمایش
          </span>

          <input
            type="number"
            min={0}
            max={10000}
            step={1}
            required
            value={form.sort_order}
            onChange={(event) =>
              update(
                "sort_order",
                event.target.value
              )
            }
            className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>

        <div className="mt-5 flex items-center gap-3 rounded-xl border border-border-theme bg-background p-4">
          <input
            type="checkbox"
            checked={false}
            disabled
            readOnly
            className="h-5 w-5"
          />

          <div>
            <p className="text-sm font-bold">
              وضعیت اولیه: غیرفعال
            </p>
            <p className="mt-1 text-xs leading-6 text-muted">
              پس از ثبت، در صفحه ویرایش
              می‌توانی شرکت را فعال کنی.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-500"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "در حال ثبت شرکت..."
            : "ثبت شرکت جدید"}
        </button>

        <Link
          href="/admin/firms"
          className="rounded-xl border border-border-theme bg-surface px-6 py-3 text-sm font-bold"
        >
          انصراف و بازگشت
        </Link>
      </div>
    </form>
  );
}
