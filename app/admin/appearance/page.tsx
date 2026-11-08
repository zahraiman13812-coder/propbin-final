
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  defaultNavigation,
  defaultSections,
  homeSectionLabels,
  parseHomeSections,
  parseNavigation,
  isSafeInternalPath,
  type NavigationItem,
  type HomeSectionId,
} from "@/lib/site-ui";

type Appearance = {
  logoUrl: string;
  heroImageUrl: string;
  navigationJson: string;
  homeSectionsJson: string;
};

const initial: Appearance = {
  logoUrl: "/pb-logo.png",
  heroImageUrl: "",
  navigationJson: JSON.stringify(defaultNavigation),
  homeSectionsJson: JSON.stringify(defaultSections),
};

function moveItem<T>(
  array: T[],
  index: number,
  direction: number
) {
  const next = [...array];
  const target = index + direction;

  if (target < 0 || target >= next.length) {
    return next;
  }

  [next[index], next[target]] = [
    next[target],
    next[index],
  ];

  return next;
}

export default function AppearancePage() {
  const [settings, setSettings] =
    useState<Appearance>(initial);

  const [navigation, setNavigation] =
    useState<NavigationItem[]>(defaultNavigation);

  const [sections, setSections] =
    useState<HomeSectionId[]>(defaultSections);

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] =
    useState<"logo" | "hero" | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const logoRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          "/api/admin/appearance",
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            "دریافت تنظیمات انجام نشد."
          );
        }

        const data = await response.json();

        if (!active) return;

        setSettings(data.settings);
        setNavigation(
          parseNavigation(
            data.settings.navigationJson
          )
        );
        setSections(
          parseHomeSections(
            data.settings.homeSectionsJson
          )
        );
        setReady(true);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در بارگذاری"
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

  async function upload(
    file: File | undefined,
    kind: "logo" | "hero"
  ) {
    if (!file || uploading) return;

    setError("");
    setMessage("");

    if (
      file.size > 2 * 1024 * 1024 ||
      file.size === 0
    ) {
      setError("حداکثر حجم تصویر ۲ مگابایت است.");
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError("فرمت تصویر باید JPG، PNG یا WebP باشد.");
      return;
    }

    setUploading(kind);

    try {
      const form = new FormData();
      form.append("image", file);

      const response = await fetch(
        "/api/admin/branding-upload",
        {
          method: "POST",
          body: form,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "آپلود ناموفق بود."
        );
      }

      setSettings((current) => ({
        ...current,
        [kind === "logo"
          ? "logoUrl"
          : "heroImageUrl"]: result.url,
      }));

      setMessage(
        "تصویر آپلود شد. برای اعمال روی سایت، تنظیمات را ذخیره کن."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در آپلود"
      );
    } finally {
      setUploading(null);

      if (logoRef.current) logoRef.current.value = "";
      if (heroRef.current) heroRef.current.value = "";
    }
  }

  function editNav(
    id: string,
    key: "label" | "href",
    value: string
  ) {
    setNavigation((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, [key]: value }
          : item
      )
    );
  }

  function toggleNav(id: string) {
    setNavigation((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              visible: !item.visible,
            }
          : item
      )
    );
  }

  function addNav() {
    if (navigation.length >= 12) return;

    setNavigation((current) => [
      ...current,
      {
        // Date.now() alone can collide on a fast double click and the
        // duplicate id is then rejected on save.
        id: `link-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        label: "لینک جدید",
        href: "/",
        visible: true,
      },
    ]);
  }

  function toggleSection(id: HomeSectionId) {
    setSections((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : // Re-added sections go to the end and keep the custom order.
          [...current, id]
    );
  }

  async function save() {
    // Never save the fallback defaults over real settings when loading failed.
    if (busy || !ready) return;

    setError("");
    setMessage("");

    const ids = navigation.map((item) => item.id);

    if (
      ids.length !== new Set(ids).size ||
      navigation.some(
        (item) =>
          !item.label.trim() ||
          item.label.length > 60 ||
          !isSafeInternalPath(item.href)
      )
    ) {
      setError(
        "عنوان یا آدرس یکی از لینک‌های منو معتبر نیست."
      );
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/admin/appearance",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            logoUrl: settings.logoUrl,
            heroImageUrl: settings.heroImageUrl,
            navigationJson: JSON.stringify(
              navigation
            ),
            homeSectionsJson: JSON.stringify(
              sections
            ),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "ذخیره ناموفق بود."
        );
      }

      setMessage("تنظیمات ظاهر سایت ذخیره شدند.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره"
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted">
        <Loader2 className="animate-spin" size={20} />
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-w-0 space-y-6 text-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">
            مدیریت ظاهر سایت
          </h1>
          <p className="mt-2 text-sm text-muted">
            لوگو، بنر، منوها و ترتیب صفحه اصلی
          </p>
        </div>

        <Link
          href="/"
          className="rounded-xl border border-border-theme bg-surface px-4 py-3 text-sm text-primary"
        >
          مشاهده سایت
        </Link>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl bg-success/10 p-4 text-sm text-success"
        >
          {message}
        </p>
      )}

      {/* Image management */}
      <section className="grid gap-4 lg:grid-cols-2">
        {([
          {
            kind: "logo" as const,
            title: "لوگوی سایت",
            value: settings.logoUrl,
            input: logoRef,
          },
          {
            kind: "hero" as const,
            title: "تصویر پس‌زمینه هیرو",
            value: settings.heroImageUrl,
            input: heroRef,
          },
        ]).map((item) => (
          <div
            key={item.kind}
            className="min-w-0 rounded-2xl border border-border-theme bg-surface p-5"
          >
            <h2 className="font-bold">{item.title}</h2>

            <p className="mt-2 text-xs leading-7 text-muted">
              JPG، PNG یا WebP، حداکثر ۲ مگابایت
            </p>

            <div className="mt-4 flex min-h-44 items-center justify-center overflow-hidden rounded-xl bg-surface-secondary p-4">
              {item.value ? (
                <img
                  src={item.value}
                  alt={item.title}
                  className={
                    item.kind === "logo"
                      ? "h-28 w-28 object-contain"
                      : "max-h-56 w-full object-cover"
                  }
                />
              ) : (
                <ImagePlus
                  size={40}
                  className="text-muted"
                />
              )}
            </div>

            <input
              ref={item.input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) =>
                upload(
                  event.target.files?.[0],
                  item.kind
                )
              }
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() =>
                  item.input.current?.click()
                }
                className="rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {uploading === item.kind
                  ? "در حال آپلود..."
                  : "انتخاب تصویر"}
              </button>

              <button
                type="button"
                disabled={uploading !== null}
                onClick={() =>
                  setSettings((current) => ({
                    ...current,
                    [item.kind === "logo"
                      ? "logoUrl"
                      : "heroImageUrl"]:
                      item.kind === "logo"
                        ? "/pb-logo.png"
                        : "",
                  }))
                }
                className="rounded-xl border border-border-theme px-4 py-3 text-xs text-muted"
              >
                بازگشت به پیش‌فرض
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Navigation */}
      <section className="rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              مدیریت منوی سایت
            </h2>
            <p className="mt-2 text-xs text-muted">
              ترتیب، متن، آدرس و نمایش لینک‌ها
            </p>
          </div>

          <button
            type="button"
            onClick={addNav}
            disabled={navigation.length >= 12}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Plus size={17} />
            افزودن لینک
          </button>
        </div>

        <div className="space-y-3">
          {navigation.map((item, index) => (
            <div
              key={item.id}
              className="grid min-w-0 gap-3 rounded-xl border border-border-theme bg-background p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="min-w-0">
                <span className="mb-2 block text-xs text-muted">
                  عنوان منو
                </span>
                <input
                  value={item.label}
                  maxLength={60}
                  onChange={(event) =>
                    editNav(
                      item.id,
                      "label",
                      event.target.value
                    )
                  }
                  className="h-11 w-full min-w-0 rounded-lg border border-border-theme bg-surface px-3 text-sm text-foreground"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-2 block text-xs text-muted">
                  آدرس داخلی
                </span>
                <input
                  value={item.href}
                  dir="ltr"
                  onChange={(event) =>
                    editNav(
                      item.id,
                      "href",
                      event.target.value
                    )
                  }
                  className="h-11 w-full min-w-0 rounded-lg border border-border-theme bg-surface px-3 text-left text-sm text-foreground"
                />
              </label>

              <div className="flex items-end gap-1">
                <button
                  type="button"
                  title="انتقال به بالا"
                  aria-label="انتقال به بالا"
                  disabled={index === 0}
                  onClick={() =>
                    setNavigation((current) =>
                      moveItem(current, index, -1)
                    )
                  }
                  className="rounded-lg border border-border-theme p-2.5 disabled:opacity-30"
                >
                  <ArrowUp size={17} />
                </button>

                <button
                  type="button"
                  title="انتقال به پایین"
                  aria-label="انتقال به پایین"
                  disabled={
                    index === navigation.length - 1
                  }
                  onClick={() =>
                    setNavigation((current) =>
                      moveItem(current, index, 1)
                    )
                  }
                  className="rounded-lg border border-border-theme p-2.5 disabled:opacity-30"
                >
                  <ArrowDown size={17} />
                </button>

                <button
                  type="button"
                  title={item.visible ? "پنهان کردن" : "نمایش دادن"}
                  aria-label={item.visible ? "پنهان کردن لینک" : "نمایش لینک"}
                  onClick={() => toggleNav(item.id)}
                  className="rounded-lg border border-border-theme p-2.5 text-primary"
                >
                  {item.visible
                    ? <Eye size={17} />
                    : <EyeOff size={17} />}
                </button>

                <button
                  type="button"
                  title="حذف لینک"
                  aria-label="حذف لینک"
                  onClick={() =>
                    setNavigation((current) =>
                      current.filter(
                        (link) => link.id !== item.id
                      )
                    )
                  }
                  className="rounded-lg border border-border-theme p-2.5 text-danger"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Home section order */}
      <section className="rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
        <h2 className="text-lg font-bold">
          ترتیب بخش‌های صفحه اصلی
        </h2>

        <p className="mt-2 text-xs leading-7 text-muted">
          بخش‌های پنهان‌شده در صفحه اصلی
          نمایش داده نمی‌شن. ترتیب رو با فلش‌ها
          تغییر بده.
        </p>

        <div className="mt-5 space-y-2">
          {sections.map((id, index) => (
            <div
              key={id}
              className="flex items-center gap-3 rounded-xl border border-border-theme bg-background p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs text-primary">
                {(index + 1).toLocaleString("fa-IR")}
              </span>

              <span className="min-w-0 flex-1 text-sm font-medium">
                {homeSectionLabels[id]}
              </span>

              <button
                type="button"
                aria-label="انتقال به بالا"
                disabled={index === 0}
                onClick={() =>
                  setSections((current) =>
                    moveItem(current, index, -1)
                  )
                }
                className="p-2 disabled:opacity-30"
              >
                <ArrowUp size={18} />
              </button>

              <button
                type="button"
                aria-label="انتقال به پایین"
                disabled={index === sections.length - 1}
                onClick={() =>
                  setSections((current) =>
                    moveItem(current, index, 1)
                  )
                }
                className="p-2 disabled:opacity-30"
              >
                <ArrowDown size={18} />
              </button>

              <button
                type="button"
                aria-label="پنهان کردن بخش"
                onClick={() => toggleSection(id)}
                className="p-2 text-danger"
              >
                <EyeOff size={18} />
              </button>
            </div>
          ))}

          {defaultSections
            .filter((id) => !sections.includes(id))
            .map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleSection(id)}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border-theme p-3 text-right text-sm text-muted"
              >
                <Eye size={17} />
                نمایش مجدد: {homeSectionLabels[id]}
              </button>
            ))}
        </div>
      </section>

      <div className="sticky bottom-3 z-30 rounded-xl border border-border-theme bg-surface p-3 shadow-xl">
        <button
          type="button"
          disabled={busy || uploading !== null || !ready}
          onClick={save}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={19} className="animate-spin" />
          ) : (
            <Save size={19} />
          )}

          {busy
            ? "در حال ذخیره..."
            : "ذخیره تنظیمات ظاهر"}
        </button>
      </div>
    </div>
  );
}
