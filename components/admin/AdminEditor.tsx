
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  Plus,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";

import type { Content } from "@/lib/content";
import ArticleImageUpload from "./ArticleImageUpload";

type Section =
  | "firms"
  | "discounts"
  | "articles"
  | "settings"
  | "polls";

type Row = Record<string, string>;

const fields: Record<
  Exclude<Section, "polls">,
  [string, string][]
> = {
  firms: [
    ["id", "شناسه انگلیسی شرکت"],
    ["name", "نام شرکت"],
    ["rating", "امتیاز"],
    ["capital", "حداکثر سرمایه"],
    ["profit", "سهم سود"],
    ["fee", "هزینه شروع / هزینه چالش"],
    ["discount", "درصد تخفیف"],
    ["code", "کد تخفیف"],
    ["color", "رنگ شرکت"],
    ["description", "توضیحات"],
    ["payout", "میزان برداشت سود"],
    ["challenge", "نوع چالش"],
    ["logo", "آدرس لوگو (اختیاری)"],
    ["logoText", "متن جایگزین لوگو"],
  ],
  discounts: [
    ["name", "نام شرکت"],
    ["logo", "آدرس لوگو (اختیاری)"],
    ["logoText", "متن جایگزین لوگو"],
    ["discount", "درصد تخفیف"],
    ["code", "کد تخفیف"],
  ],
  articles: [
    ["slug", "شناسه انگلیسی مقاله"],
    ["title", "عنوان مقاله"],
    ["category", "دسته‌بندی"],
    ["date", "تاریخ نمایشی انتشار"],
    ["excerpt", "خلاصه مقاله"],
    ["read", "زمان مطالعه"],
    ["icon", "نماد جایگزین"],
    ["body", "متن کامل مقاله"],
    ["seoTitle", "عنوان سئو (اختیاری)"],
    ["seoDescription", "توضیحات متا (اختیاری)"],
    ["keywords", "کلمات کلیدی (با کاما)"],
    ["author", "نویسنده"],
    ["publishedAt", "تاریخ انتشار ISO"],
    ["updatedAt", "تاریخ به‌روزرسانی ISO"],
  ],
  settings: [
    ["name", "نام سایت"],
    ["tagline", "شعار سایت"],
    ["heroTitle", "عنوان صفحه اصلی"],
    ["heroHighlight", "عنوان رنگی"],
    ["heroDescription", "توضیحات صفحه اصلی"],
    ["footerDescription", "توضیحات فوتر"],
    ["primaryDark", "رنگ اصلی دارک"],
    ["primaryLight", "رنگ اصلی لایت"],
    ["contactEmail", "ایمیل ارتباطی"],
  ],
};

const titles: Record<Section, string> = {
  firms: "مدیریت شرکت‌های پراپ",
  discounts: "مدیریت تخفیف‌ها",
  articles: "مدیریت مقالات",
  settings: "تنظیمات سایت",
  polls: "مدیریت نظرسنجی‌ها",
};

export default function AdminEditor({
  section,
  initial,
}: {
  section: Section;
  initial: Content;
}) {
  const router = useRouter();

  const [data, setData] = useState(initial);
  const [form, setForm] = useState<Row | null>(null);
  const [original, setOriginal] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [discountFirmId, setDiscountFirmId] = useState("");

  useEffect(() => {
    setData(initial);
    setForm(null);
    setDiscountFirmId("");
    setNotice("");
    if (section !== "discounts") return;
    let cancelled = false;
    void fetch("/api/admin/discounts", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "دریافت تخفیف‌ها ناموفق بود.");
        if (!cancelled) setData(previous => ({ ...previous, firms: payload.firms }));
      })
      .catch(error => { if (!cancelled) setNotice(error instanceof Error ? error.message : "خطا در دریافت تخفیف‌ها"); });
    return () => { cancelled = true; };
  }, [initial, section]);

  const configuredFields =
    section === "polls" ? [] : fields[section];

  const records =
    section === "articles"
      ? data.articles
      : data.firms;

  const rows = (
    section === "polls" ||
    section === "settings"
      ? []
      : section === "discounts"
        ? data.firms.filter(item => Boolean(item.code || item.discount))
        : records
  ).filter((item) =>
    JSON.stringify(item)
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase())
  );

  function edit(row: Row) {
    setForm({ ...row });
    if (section === "discounts") setDiscountFirmId(row.id || "");
    setOriginal(row.id || row.slug || "");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createNew() {
    const blank = Object.fromEntries(
      configuredFields.map(([key]) => [key, ""])
    ) as Row;

    if (section === "firms") {
      blank.color = "#008cff";
    }

    if (section === "articles") {
      blank.image = "";
      blank.icon = "PB";
    }

    setForm(blank);
    if (section === "discounts") setDiscountFirmId("");
    setOriginal("");
    setNotice("");
  }

  function updateField(key: string, value: string) {
    setForm((previous) =>
      previous
        ? { ...previous, [key]: value }
        : null
    );
  }

  async function reload() {
    if (section === "discounts") {
      const response = await fetch("/api/admin/discounts", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "دریافت تخفیف‌ها ناموفق بود.");
      setData(previous => ({ ...previous, firms: result.firms }));
    } else {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (!response.ok) throw new Error("دریافت اطلاعات به‌روز ناموفق بود.");
      const result: Content = await response.json();
      setData(result);
    }
    router.refresh();
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (!form || busy) return;

    setBusy(true);
    setNotice("");

    try {
      let response: Response;
      if (section === "discounts") {
        const firmId = original || discountFirmId;
        if (!firmId) throw new Error("ابتدا شرکت را انتخاب کنید.");
        const code = (form.code || "").trim();
        const discount = (form.discount || "").trim();
        if (!code || !discount) throw new Error("کد و مقدار تخفیف را وارد کنید.");
        response = await fetch(`/api/admin/discounts/${encodeURIComponent(firmId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, discount }),
        });
      } else {
        response = await fetch("/api/content", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: section, item: { ...form }, originalId: original }),
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "ذخیره ناموفق بود."
        );
      }

      await reload();

      setForm(null);
      setNotice("اطلاعات با موفقیت ذخیره شدند.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره اطلاعات"
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(
    type: "firms" | "articles" | "polls",
    id: string
  ) {
    if (
      busy ||
      !window.confirm(
        "آیا از حذف این مورد مطمئن هستید؟"
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(type === "polls" ? "/api/polls" : "/api/content", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, id }),
      });

      if (!response.ok) {
        throw new Error("حذف انجام نشد.");
      }

      await reload();
      setNotice("مورد انتخاب‌شده حذف شد.");
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function removeDiscount(id: string) {
    if (
      busy ||
      !window.confirm(
        "کد تخفیف و درصد تخفیف این شرکت حذف شود؟ خود شرکت باقی می‌ماند."
      )
    ) return;

    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/discounts/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "حذف کد تخفیف ناموفق بود.");
      }
      await reload();
      if (original === id) setForm(null);
      setNotice("کد تخفیف و درصد تخفیف حذف شدند؛ اطلاعات شرکت حفظ شد.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "خطا در حذف کد تخفیف");
    } finally {
      setBusy(false);
    }
  }

  async function moderate(
    id: string,
    approved: boolean
  ) {
    setBusy(true);

    try {
      const response = await fetch("/api/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, approved }),
      });

      if (!response.ok) {
        throw new Error("تغییر وضعیت انجام نشد.");
      }

      await reload();
      setNotice("وضعیت نظر به‌روز شد.");
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {titles[section]}
          </h2>

          <p className="mt-2 text-sm text-muted">
            مدیریت اطلاعات سایت پراپ‌بین
          </p>
        </div>

        {section !== "polls" &&
          section !== "settings" && (
            <button
              type="button"
              onClick={createNew}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
            >
              <Plus size={18} />
              {section === "discounts" ? "افزودن کد تخفیف" : "افزودن جدید"}
            </button>
          )}

        {section === "settings" && (
          <button
            type="button"
            onClick={() =>
              edit(data.settings as unknown as Row)
            }
            className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
          >
            ویرایش تنظیمات
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-border-theme bg-surface-secondary p-4 text-sm text-foreground"
        >
          {notice}
        </div>
      )}

      {form && section !== "polls" && (
        <form
          onSubmit={save}
          className="min-w-0 space-y-6 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-foreground">
              {original
                ? "ویرایش اطلاعات"
                : "افزودن اطلاعات جدید"}
            </h3>

            <button
              type="button"
              onClick={() => setForm(null)}
              className="text-sm text-muted"
            >
              انصراف
            </button>
          </div>

          {section === "discounts" && (
            <label className="block space-y-2">
              <span className="block text-xs font-semibold text-muted">شرکت پراپ</span>
              <select
                required
                disabled={Boolean(original)}
                value={original || discountFirmId}
                onChange={(event) => setDiscountFirmId(event.target.value)}
                className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground"
              >
                <option value="">یک شرکت انتخاب کنید</option>
                {data.firms.map((firm) => (
                  <option key={firm.id} value={firm.id}>{firm.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {configuredFields.filter(([key]) => section !== "discounts" || key === "code" || key === "discount").map(([key, label]) => {
              const isLong = [
                "body",
                "description",
                "excerpt",
                "seoDescription",
                "heroDescription",
                "footerDescription",
              ].includes(key);

              return (
                <label
                  key={key}
                  className={`min-w-0 ${
                    isLong ? "md:col-span-2" : ""
                  }`}
                >
                  <span className="mb-2 block text-xs font-semibold text-muted">
                    {label}
                  </span>

                  {isLong ? (
                    <textarea
                      rows={key === "body" ? 9 : 3}
                      value={form[key] || ""}
                      onChange={(event) =>
                        updateField(
                          key,
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-border-theme bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      value={form[key] || ""}
                      required={[
                        "id",
                        "slug",
                        "name",
                        "title",
                      ].includes(key)}
                      onChange={(event) =>
                        updateField(
                          key,
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                    />
                  )}
                </label>
              );
            })}
          </div>

          {(section === "articles" ||
            section === "firms") && (
            <ArticleImageUpload
              value={
                section === "articles"
                  ? form.image || ""
                  : form.logo || ""
              }
              onChange={(url) =>
                updateField(
                  section === "articles"
                    ? "image"
                    : "logo",
                  url
                )
              }
              endpoint={
                section === "articles"
                  ? "/api/admin/upload"
                  : "/api/admin/branding-upload"
              }
              title={
                section === "articles"
                  ? "تصویر شاخص مقاله"
                  : "لوگوی شرکت"
              }
              description="JPG، PNG یا WebP — حداکثر ۲ مگابایت. اگر تصویری نداری، از فیلد «متن جایگزین لوگو» استفاده کن."
              alt={
                section === "articles"
                  ? "پیش‌نمایش تصویر مقاله"
                  : "پیش‌نمایش لوگوی شرکت"
              }
              previewClassName={
                section === "articles"
                  ? "aspect-video w-full object-cover"
                  : "h-40 w-full object-contain p-3"
              }
              emptyClassName="h-40"
            />
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto"
          >
            <Save size={18} />
            {busy
              ? "در حال ذخیره..."
              : "ذخیره تغییرات"}
          </button>
        </form>
      )}

      {section === "polls" ? (
        <div className="grid gap-4">
          {data.polls.length === 0 && (
            <div className="rounded-xl border border-border-theme bg-surface p-5 text-muted">
              هنوز نظری ثبت نشده است.
            </div>
          )}

          {data.polls.map((vote) => (
            <article
              key={vote.id}
              className="min-w-0 rounded-xl border border-border-theme bg-surface p-4"
            >
              <strong className="text-foreground">
                {data.firms.find(
                  (firm) => firm.id === vote.firmId
                )?.name || vote.firmId}
              </strong>

              <p className="mt-3 text-xs leading-7 text-muted">
                اعتبار: {vote.trust} · پشتیبانی:{" "}
                {vote.support} · برداشت:{" "}
                {vote.payout} · قوانین:{" "}
                {vote.rules}
              </p>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-foreground">
                {vote.comment || "بدون توضیح"}
              </p>

              <p className="mt-3 text-xs text-muted">
                {vote.approved
                  ? "تأییدشده"
                  : "در انتظار بررسی"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    moderate(
                      vote.id,
                      !vote.approved
                    )
                  }
                  className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary"
                >
                  {vote.approved
                    ? "لغو تأیید"
                    : "تأیید انتشار"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    remove("polls", vote.id)
                  }
                  className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
                >
                  حذف نظر
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : section === "settings" ? (
        <div className="rounded-xl border border-border-theme bg-surface p-5">
          {Object.entries(data.settings).map(
            ([key, value]) => (
              <div
                key={key}
                className="break-words border-b border-border-theme py-3 text-sm"
              >
                <span className="text-muted">
                  {fields.settings.find(
                    (field) => field[0] === key
                  )?.[1] || key}
                  :{" "}
                </span>

                <span className="text-foreground">
                  {value}
                </span>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="جست‌وجو..."
            className="w-full max-w-lg rounded-xl border border-border-theme bg-surface px-4 py-3 text-sm text-foreground"
          />

          <div className="grid gap-3">
            {rows.map((row) => {
              const id =
                "id" in row ? row.id : row.slug;

              const title =
                "name" in row
                  ? row.name
                  : row.title;

              const full = row as unknown as Row;

              return (
                <article
                  key={id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-border-theme bg-surface p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {section === "articles" &&
                      "image" in row &&
                      typeof row.image === "string" &&
                      row.image.startsWith("/") && (
                        <img
                          src={row.image}
                          alt=""
                          className="h-16 w-24 shrink-0 rounded-lg object-cover"
                        />
                      )}

                    {(section === "firms" ||
                      section === "discounts") &&
                      "logo" in row &&
                      typeof row.logo === "string" &&
                      row.logo.startsWith("/") && (
                        <img
                          src={row.logo}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg bg-surface-secondary object-contain p-1"
                        />
                      )}

                    <div className="min-w-0">
                      <strong className="block break-words text-sm text-foreground">
                        {title}
                      </strong>

                      <p className="mt-1 break-all text-xs text-muted">
                        {section === "discounts"
                          ? `${full.code || "بدون کد"} · ${
                              full.discount || "بدون تخفیف"
                            }`
                          : section === "firms"
                            ? `${full.fee || "—"} · ${
                                full.challenge || "—"
                              } · ${full.payout || "—"}`
                            : id}
                      </p>

                      {(section === "firms" ||
                        section === "discounts") &&
                        full.logoText && (
                          <p className="mt-1 text-xs text-primary">
                            متن لوگو: {full.logoText}
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        edit(
                          section === "discounts"
                            ? {
                                id,
                                name: full.name || "",
                                logo: full.logo || "",
                                logoText:
                                  full.logoText || "",
                                code: full.code || "",
                                discount:
                                  full.discount || "",
                              }
                            : full
                        )
                      }
                      className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary"
                    >
                      <Pencil size={16} />
                      ویرایش
                    </button>

                    {section === "discounts" && (full.code || full.discount) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeDiscount(id)}
                        className="flex items-center gap-1 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger disabled:opacity-50"
                        aria-label={`حذف کد تخفیف ${title}`}
                      >
                        <Trash2 size={16} />
                        حذف تخفیف
                      </button>
                    )}

                    {section !== "discounts" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          remove(
                            section as
                              | "firms"
                              | "articles",
                            id
                          )
                        }
                        className="rounded-lg bg-danger/10 p-2 text-danger"
                        aria-label={`حذف ${title}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {rows.length === 0 && (
              <p className="rounded-xl border border-border-theme bg-surface p-5 text-sm text-muted">
                موردی پیدا نشد.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
