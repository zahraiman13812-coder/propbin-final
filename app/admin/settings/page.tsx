
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  CheckCircle2,
  Loader2,
  Palette,
  Save,
  Settings,
  Share2,
  Type,
} from "lucide-react";

import type {
  SiteSettings,
} from "@/lib/content";

type Field = {
  key: keyof SiteSettings;
  label: string;
  placeholder?: string;
  multiline?: boolean;
};

const groups: {
  title: string;
  description: string;
  icon: typeof Settings;
  fields: Field[];
}[] = [
  {
    title: "اطلاعات عمومی سایت",
    description:
      "نام برند، شعار و راه ارتباطی",
    icon: Settings,
    fields: [
      {
        key: "name",
        label: "نام سایت",
      },
      {
        key: "tagline",
        label: "شعار کوتاه سایت",
      },
      {
        key: "contactEmail",
        label: "ایمیل ارتباطی",
        placeholder: "info@example.com",
      },
    ],
  },
  { title: "همکاری با ما", description: "آیدی تلگرام نمایش داده‌شده در صفحه همکاری", icon: Share2, fields: [ { key: "cooperationTelegram", label: "آیدی یا لینک تلگرام همکاری", placeholder: "@YourTelegramID" } ] },
  {
    title: "تنظیمات هیرو سکشن",
    description:
      "متن‌های بنر اصلی صفحه اول",
    icon: Type,
    fields: [
      {
        key: "heroEyebrow",
        label: "متن کوچک بالای عنوان",
      },
      {
        key: "heroTitle",
        label: "عنوان اصلی هیرو",
      },
      {
        key: "heroHighlight",
        label: "قسمت آبی‌رنگ عنوان",
      },
      {
        key: "heroDescription",
        label: "توضیحات هیرو",
        multiline: true,
      },
    ],
  },
  {
    title: "بخش‌های صفحه اصلی",
    description:
      "عنوان‌ها و توضیحات بخش‌های مهم",
    icon: Type,
    fields: [
      {
        key: "firmsTitle",
        label: "عنوان شرکت‌های پراپ",
      },
      {
        key: "firmsDescription",
        label: "توضیحات بخش شرکت‌ها",
        multiline: true,
      },
      {
        key: "compareTitle",
        label: "عنوان بخش مقایسه",
      },
      {
        key: "compareDescription",
        label: "توضیحات بخش مقایسه",
        multiline: true,
      },
      {
        key: "articlesTitle",
        label: "عنوان مقالات",
      },
      {
        key: "articlesDescription",
        label: "توضیحات مقالات",
        multiline: true,
      },
      {
        key: "reviewsTitle",
        label: "عنوان نظرات کاربران",
      },
    ],
  },
  {
    title: "اینستاگرام و تلگرام",
    description:
      "آیدی یا لینک صفحه رسمی را وارد کن؛ بنرهای اینستاگرام و تلگرام در صفحه اصلی به همین آدرس‌ها وصل می‌شوند.",
    icon: Share2,
    fields: [
      {
        key: "instagram",
        label: "آیدی یا لینک اینستاگرام",
        placeholder: "@yourpage یا https://instagram.com/yourpage",
      },
      {
        key: "telegram",
        label: "آیدی یا لینک تلگرام",
        placeholder: "@yourchannel یا https://t.me/yourchannel",
      },
    ],
  },
  {
    title: "فوتر و رنگ‌ها",
    description:
      "توضیحات پایین سایت و رنگ اصلی دو تم",
    icon: Palette,
    fields: [
      {
        key: "footerDescription",
        label: "توضیحات فوتر",
        multiline: true,
      },
      {
        key: "primaryDark",
        label: "رنگ اصلی دارک مود",
      },
      {
        key: "primaryLight",
        label: "رنگ اصلی لایت مود",
      },
    ],
  },
];

const colors = [
  "#008cff",
  "#0078ed",
  "#7c3aed",
  "#0d9488",
  "#e11d48",
  "#f59e0b",
];

function validHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export default function AdminSettingsPage() {
  const [settings, setSettings] =
    useState<SiteSettings | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          "/api/admin/settings",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            "بارگذاری تنظیمات ناموفق بود."
          );
        }

        const result = await response.json();

        if (active) {
          setSettings(result.settings);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت تنظیمات"
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  function update(
    key: keyof SiteSettings,
    value: string
  ) {
    setSettings((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : null
    );

    setMessage("");
  }

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!settings || saving) return;

    setError("");
    setMessage("");

    if (
      !validHex(settings.primaryDark) ||
      !validHex(settings.primaryLight)
    ) {
      setError(
        "رنگ‌ها باید به شکل کد HEX معتبر باشند."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ settings }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "ذخیره تنظیمات انجام نشد."
        );
      }

      if (result.settings) {
        setSettings(result.settings as SiteSettings);
      }

      setMessage(
        "تنظیمات با موفقیت ذخیره شدند. صفحه اصلی را بازخوانی کن تا تغییرات را ببینی."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-muted">
        <Loader2
          size={22}
          className="animate-spin"
        />
        در حال بارگذاری تنظیمات...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
        {error || "تنظیمات در دسترس نیستند."}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-w-0 space-y-7 text-foreground"
    >
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          تنظیمات سایت پراپ‌بین
        </h1>

        <p className="mt-3 text-sm leading-8 text-muted">
          متن‌ها و رنگ‌های اصلی سایت رو
          بدون تغییر کدنویسی مدیریت کن.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/10 p-4 text-sm leading-7 text-success"
        >
          <CheckCircle2
            size={19}
            className="mt-1 shrink-0"
          />
          {message}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={save}
        className="space-y-6"
      >
        {groups.map((group) => {
          const Icon = group.icon;

          return (
            <section
              key={group.title}
              className="min-w-0 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6"
            >
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={22} />
                </div>

                <div>
                  <h2 className="text-base font-bold">
                    {group.title}
                  </h2>

                  <p className="mt-2 text-xs leading-6 text-muted">
                    {group.description}
                  </p>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
                {group.fields.map((field) => {
                  const isColor =
                    field.key === "primaryDark" ||
                    field.key === "primaryLight";

                  return (
                    <div
                      key={field.key}
                      className={`min-w-0 ${
                        field.multiline
                          ? "md:col-span-2"
                          : ""
                      }`}
                    >
                      <label
                        htmlFor={field.key}
                        className="mb-2 block text-xs font-semibold text-muted"
                      >
                        {field.label}
                      </label>

                      {field.multiline ? (
                        <textarea
                          id={field.key}
                          rows={4}
                          maxLength={1500}
                          value={settings[field.key]}
                          onChange={(event) =>
                            update(
                              field.key,
                              event.target.value
                            )
                          }
                          className="w-full resize-y rounded-xl border border-border-theme bg-background p-4 text-sm leading-8 text-foreground outline-none focus:border-primary"
                        />
                      ) : (
                        <div className="flex min-w-0 items-center gap-2">
                          {isColor && (
                            <input
                              type="color"
                              aria-label={`انتخاب ${field.label}`}
                              value={
                                validHex(
                                  settings[field.key]
                                )
                                  ? settings[field.key]
                                  : "#008cff"
                              }
                              onChange={(event) =>
                                update(
                                  field.key,
                                  event.target.value
                                )
                              }
                              className="h-12 w-14 shrink-0 cursor-pointer rounded-lg border border-border-theme bg-background p-1"
                            />
                          )}

                          <input
                            id={field.key}
                            type={
                              field.key ===
                              "contactEmail"
                                ? "email"
                                : "text"
                            }
                            dir={
                              isColor ||
                              field.key ===
                                "contactEmail"
                                ? "ltr"
                                : "auto"
                            }
                            required={field.key === "name"}
                            maxLength={1500}
                            placeholder={
                              field.placeholder
                            }
                            value={
                              settings[field.key]
                            }
                            onChange={(event) =>
                              update(
                                field.key,
                                event.target.value
                              )
                            }
                            className="h-12 w-full min-w-0 rounded-xl border border-border-theme bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {isColor && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`انتخاب رنگ ${color}`}
                              aria-pressed={
                                settings[field.key] ===
                                color
                              }
                              onClick={() =>
                                update(field.key, color)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-theme"
                            >
                              <span
                                className="h-6 w-6 rounded-full"
                                style={{
                                  backgroundColor: color,
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-theme bg-surface p-4 shadow-xl">
          <p className="text-xs leading-6 text-muted">
            بعد از ذخیره، تغییرات در محتوای سایت
            اعمال می‌شن.
          </p>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
          >
            {saving ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save size={18} />
            )}

            {saving
              ? "در حال ذخیره..."
              : "ذخیره تمام تنظیمات"}
          </button>
        </div>
      </form>
    </div>
  );
}
