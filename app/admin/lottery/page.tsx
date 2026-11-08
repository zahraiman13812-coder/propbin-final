
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SubmissionManager from "./SubmissionManager";
type Entry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  code: string;
  period: string;
  createdAt: string;
  selectable?: boolean;
};

type Winner = Entry & {
  selectedAt: string;
};

type Lottery = {
  enabled: boolean;
  title: string;
  description: string;
  articleSlug: string;
  period: string;
  entries: Entry[];
  winners: Winner[];
};

type ArticleOption = {
  slug: string;
  title: string;
};

type LotteryRound = { period: string; title: string; description: string; articleSlug: string; entries: number; submissions: number; winner: string | null; active: boolean };

type ApiData = {
  rounds?: LotteryRound[];
  lottery?: Lottery;
  articles?: ArticleOption[];
  error?: string;
  unlinkedIssuedCount?: number;
};

export default function AdminLotteryPage() {
  const [lottery, setLottery] = useState<Lottery | null>(
    null
  );

  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [rounds, setRounds] = useState<LotteryRound[]>([]);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);
  const [unlinkedIssuedCount, setUnlinkedIssuedCount] = useState(0);
  const [reconciling, setReconciling] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectingWinner, setSelectingWinner] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (selectedPeriod?: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/lottery",
        {
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const data = (await response.json()) as ApiData;

      if (!response.ok || !data.lottery) {
        throw new Error(
          data.error || "دریافت تنظیمات ناموفق بود."
        );
      }

      const availableRounds = Array.isArray(data.rounds) ? data.rounds : [];
      const chosen = availableRounds.find((round) => round.period === selectedPeriod);
      setLottery(chosen ? {
        ...data.lottery,
        enabled: chosen.active,
        title: chosen.title,
        description: chosen.description,
        articleSlug: chosen.articleSlug,
        period: chosen.period,
      } : data.lottery);
      setRounds(availableRounds);
      setUnlinkedIssuedCount(data.unlinkedIssuedCount ?? 0);

      setArticles(
        Array.isArray(data.articles)
          ? data.articles
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت اطلاعات."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof Lottery>(
    key: K,
    value: Lottery[K]
  ) {
    setLottery((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );

    setMessage("");
    setError("");
  }

  async function save() {
    if (!lottery || saving) return;

    if (!lottery.title.trim()) {
      setError("عنوان قرعه‌کشی الزامی است.");
      return;
    }

    if (!lottery.period.trim()) {
      setError("نام دوره الزامی است.");
      return;
    }

    if (
      lottery.enabled &&
      !lottery.articleSlug
    ) {
      setError(
        "برای فعال‌کردن قرعه‌کشی باید یک مقاله منتشرشده انتخاب کنید."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/lottery",
        {
          method: "PUT",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: lottery.enabled,
            title: lottery.title,
            description: lottery.description,
            articleSlug: lottery.articleSlug,
            period: lottery.period,
          }),
        }
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.error || "ذخیره تنظیمات ناموفق بود."
        );
      }

      setEditingPeriod(lottery.period);
      setMessage("تنظیمات قرعه‌کشی با موفقیت ذخیره شد.");
      await load(lottery.period);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره تنظیمات."
      );
    } finally {
      setSaving(false);
    }
  }

  async function selectWinner(entry: Entry) {
    if (!entry.selectable || selectingWinner) return;

    const currentWinner = lottery?.winners.find(
      (winner) => winner.period === entry.period
    );

    if (currentWinner?.id === entry.id) return;

    if (
      currentWinner &&
      !window.confirm(
        `برای دوره «${entry.period}» قبلاً ${currentWinner.name} برنده شده است. برنده را با ${entry.name} جایگزین می‌کنید؟`
      )
    ) {
      return;
    }

    setSelectingWinner(entry.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/lottery", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, period: entry.period }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || "ثبت برنده ناموفق بود.");
      }

      setMessage(`برنده دوره «${entry.period}» با موفقیت ثبت و اعلام شد.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت برنده ناموفق بود.");
    } finally {
      setSelectingWinner(null);
    }
  }

  async function reconcileIssued() {
    if (reconciling) return;
    if (!window.confirm('درخواست‌های دارای کد صادرشده که در فهرست شرکت‌کنندگان نیستند، بدون تغییر کد به فهرست اضافه شوند؟')) return;
    setReconciling(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/lottery/submissions', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await response.json() as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || data.ok !== true) throw new Error(data.error || 'همگام‌سازی ناموفق بود.');
      await load();
      setMessage(data.message || 'همگام‌سازی انجام شد.');
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا در همگام‌سازی.'); }
    finally { setReconciling(false); }
  }

  async function deleteRound(round: LotteryRound) {
    if (deletingPeriod) return;
    const confirmed = window.confirm(
      `هشدار: تمام اطلاعات دوره «${round.period}» شامل شرکت‌کنندگان، درخواست‌های عکس و برنده آن حذف می‌شود. این عملیات قابل بازگشت نیست. ادامه می‌دهید؟`
    );
    if (!confirmed) return;

    setDeletingPeriod(round.period);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/lottery", {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: round.period }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || data.ok !== true) throw new Error(data.error || "حذف دوره ناموفق بود.");
      // Immediately remove a successfully deleted round from the visible list.
      setRounds((current) => current.filter((item) => item.period !== round.period));
      setLottery((current) => current ? {
        ...current,
        entries: current.entries.filter((item) => item.period !== round.period),
        winners: current.winners.filter((item) => item.period !== round.period),
        ...(current.period === round.period ? { enabled: false, period: 'دوره جدید', articleSlug: '' } : {}),
      } : current);
      if (editingPeriod === round.period) setEditingPeriod(null);
      setMessage(data.message || `دوره «${round.period}» حذف شد.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حذف دوره ناموفق بود.");
    } finally {
      setDeletingPeriod(null);
    }
  }

  function addNewRound() {
    if (!lottery) return;
    setEditingPeriod("__new__");
    setLottery({ ...lottery, enabled: false, title: "", description: "", articleSlug: "", period: "" });
    setError(""); setMessage("");
    document.getElementById("lottery-round-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editRound(round: LotteryRound) {
    if (!lottery) return;
    setEditingPeriod(round.period);
    setLottery({ ...lottery, enabled: round.active, title: round.title,
      description: round.description, articleSlug: round.articleSlug, period: round.period });
    setError(""); setMessage("");
    document.getElementById("lottery-round-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const inputClass =
    "w-full min-w-0 rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary";

  return (
    <main
      dir="rtl"
      className="w-full min-w-0 space-y-6 text-foreground"
    >
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold">
            قرعه‌کشی مقاله‌ای
          </h1>

          <p className="mt-2 text-sm leading-7 text-muted">
            مدیریت دوره‌ها، مقاله مرتبط و کدهای
            شرکت‌کنندگان
          </p>
        </div>

        <Link
          href="/lottery"
          className="rounded-xl border border-border-theme bg-surface px-5 py-3 text-center text-sm font-bold"
        >
          مشاهده صفحه عمومی
        </Link>
      </header>
<section className="space-y-4 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">مدیریت دوره‌های قرعه‌کشی</h2>
            <p className="mt-1 text-sm leading-6 text-muted">هر دوره به‌صورت مستقل نمایش داده می‌شود. با حذف دوره، شرکت‌کنندگان، درخواست‌های عکس و نتیجه برنده همان دوره نیز حذف خواهند شد.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-3 py-1 text-xs font-bold text-muted">{rounds.length.toLocaleString("fa-IR")} دوره</span>
            <button type="button" onClick={addNewRound} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">+ افزودن قرعه‌کشی جدید</button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">{message}</p>}
        {rounds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-theme p-5 text-center text-sm text-muted">هنوز دوره‌ای ثبت نشده است.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rounds.map((round) => (
              <article key={round.period} className="min-w-0 space-y-3 rounded-xl border border-border-theme bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h3 className="break-words font-extrabold">{round.period}</h3><p className="mt-1 text-xs text-muted">{round.title}</p><p className="mt-1 text-xs text-muted">مقاله: {articles.find((item) => item.slug === round.articleSlug)?.title || round.articleSlug || "انتخاب نشده"}</p></div>
                  {round.active ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">دوره فعال</span> : <span className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">غیرفعال</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-surface p-3"><p className="text-xs text-muted">شرکت‌کنندگان</p><p className="mt-1 font-extrabold">{round.entries.toLocaleString("fa-IR")}</p></div>
                  <div className="rounded-lg bg-surface p-3"><p className="text-xs text-muted">درخواست عکس</p><p className="mt-1 font-extrabold">{round.submissions.toLocaleString("fa-IR")}</p></div>
                </div>
                {round.winner && <p className="text-sm text-emerald-600">برنده: {round.winner}</p>}
                <button type="button" onClick={() => editRound(round)} className="w-full rounded-lg border border-primary/40 px-3 py-2.5 text-sm font-bold text-primary hover:bg-primary/10">ویرایش این دوره</button>
                <button type="button" onClick={() => void deleteRound(round)} disabled={deletingPeriod !== null} className="w-full rounded-lg border border-red-500/40 px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
                  {deletingPeriod === round.period ? "در حال حذف..." : "حذف کامل این دوره"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <SubmissionManager />
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl bg-green-500/10 p-4 text-sm text-green-600"
        >
          {message}
        </p>
      )}

      {loading && !lottery ? (
        <p className="rounded-2xl border border-border-theme bg-surface p-6 text-sm text-muted">
          در حال دریافت تنظیمات قرعه‌کشی...
        </p>
      ) : lottery ? (
        <>
          <section id="lottery-round-editor" className="space-y-5 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">
                {editingPeriod === "__new__" ? "افزودن قرعه‌کشی جدید" : editingPeriod ? `ویرایش دوره: ${editingPeriod}` : "تنظیمات قرعه‌کشی"}
              </h2>

              <span className="text-xs text-muted">
                {articles.length.toLocaleString(
                  "fa-IR"
                )}{" "}
                مقاله منتشرشده
              </span>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-border-theme bg-background p-4">
              <input
                type="checkbox"
                checked={lottery.enabled}
                onChange={(event) =>
                  update(
                    "enabled",
                    event.target.checked
                  )
                }
                className="h-5 w-5 shrink-0 accent-primary"
              />

              <span className="text-sm font-bold">
                قرعه‌کشی فعال باشد
              </span>
            </label>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="block min-w-0 space-y-2">
                <span className="text-sm font-bold">
                  عنوان قرعه‌کشی
                </span>

                <input
                  type="text"
                  maxLength={120}
                  value={lottery.title}
                  onChange={(event) =>
                    update(
                      "title",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0 space-y-2">
                <span className="text-sm font-bold">
                  نام دوره
                </span>

                <input
                  type="text"
                  maxLength={100}
                  value={lottery.period}
                  readOnly={editingPeriod !== null && editingPeriod !== "__new__"}
                  onChange={(event) =>
                    update(
                      "period",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />

                <span className="block text-xs leading-6 text-muted">
                  برای ساخت دوره دیگر از دکمه «افزودن قرعه‌کشی جدید» استفاده کنید. هر دوره مقاله و شرکت‌کنندگان مستقل دارد.
                </span>
              </label>

              <label className="block min-w-0 space-y-2 md:col-span-2">
                <span className="text-sm font-bold">
                  توضیحات
                </span>

                <textarea
                  rows={3}
                  maxLength={800}
                  value={lottery.description}
                  onChange={(event) =>
                    update(
                      "description",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0 space-y-2 md:col-span-2">
                <span className="text-sm font-bold">
                  مقاله قرعه‌کشی
                </span>

                <select
                  value={lottery.articleSlug}
                  onChange={(event) =>
                    update(
                      "articleSlug",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    انتخاب مقاله منتشرشده
                  </option>

                  {lottery.articleSlug &&
                    !articles.some(
                      (article) =>
                        article.slug ===
                        lottery.articleSlug
                    ) && (
                      <option
                        value={lottery.articleSlug}
                        disabled
                      >
                        مقاله قبلی در فهرست انتشار
                        نیست
                      </option>
                    )}

                  {articles.map((article) => (
                    <option
                      key={article.slug}
                      value={article.slug}
                    >
                      {article.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {articles.length === 0 && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-7">
                هیچ مقاله منتشرشده‌ای
                دریافت نشده است. ابتدا در مدیریت
                مقالات یک مقاله را منتشر کن؛ تا
                آن زمان قرعه‌کشی را فعال نکن.
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={save}
                disabled={
                  saving ||
                  loading ||
                  (lottery.enabled &&
                    !articles.some(
                      (article) =>
                        article.slug ===
                        lottery.articleSlug
                    ))
                }
                className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "در حال ذخیره..."
                  : "ذخیره تنظیمات"}
              </button>

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading || saving}
                className="rounded-xl border border-border-theme px-6 py-3 text-sm font-bold disabled:opacity-50"
              >
                دریافت مجدد اطلاعات
              </button>
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
            <h2 className="mb-2 text-lg font-extrabold">
              شرکت‌کنندگان
            </h2>

            {unlinkedIssuedCount > 0 && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <span>{unlinkedIssuedCount.toLocaleString('fa-IR')} درخواست دارای کد صادرشده هنوز در فهرست اصلی ثبت نشده‌اند.</span>
              <button type="button" disabled={reconciling} onClick={() => void reconcileIssued()} className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">
                {reconciling ? 'در حال همگام‌سازی...' : 'همگام‌سازی شرکت‌کنندگان'}
              </button>
            </div>}
            <p className="mb-5 text-sm text-muted">
              {lottery.entries.length.toLocaleString(
                "fa-IR"
              )}{" "}
              کد ثبت‌شده در تمام دوره‌ها
            </p>

            {lottery.winners.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="font-bold">برندگان اعلام‌شده</h3>
                {lottery.winners.map((winner) => (
                  <div key={winner.period} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="space-y-1">
                        <p className="font-extrabold">{winner.name} <span className="text-xs font-medium text-muted">— {winner.period}</span></p>
                        <p dir="ltr" className="text-left text-sm text-muted">{winner.email}</p>
                        <p dir="ltr" className="font-mono text-xs">{winner.code}</p>
                      </div>
                      <p className="text-xs text-muted">اعلام: {new Date(winner.selectedAt).toLocaleString("fa-IR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[980px] text-right text-sm">
                <thead>
                  <tr className="border-b border-border-theme text-muted">
                    <th className="p-3">نام</th>
                    <th className="p-3">ایمیل</th>
                    <th className="p-3">کد</th>
                    <th className="p-3">دوره</th>
                    <th className="p-3">تاریخ</th>
                    <th className="p-3">وضعیت</th>
                    <th className="p-3">عملیات مدیر</th>
                  </tr>
                </thead>

                <tbody>
                  {lottery.entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border-theme"
                    >
                      <td className="p-3">
                        {entry.name}
                      </td>

                      <td
                        dir="ltr"
                        className="p-3 text-left"
                      >
                        {entry.email}
                      </td>

                      <td
                        dir="ltr"
                        className="p-3 font-mono text-xs"
                      >
                        {entry.code}
                      </td>

                      <td className="p-3">
                        {entry.period}
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {new Date(
                          entry.createdAt
                        ).toLocaleString("fa-IR")}
                      </td>

                      <td className="p-3">
                        {lottery.winners.some((winner) => winner.id === entry.id && winner.period === entry.period) ? (
                          <span className="font-bold text-emerald-600">برنده اعلام‌شده</span>
                        ) : lottery.winners.some((winner) => winner.period === entry.period) ? (
                          <span className="text-muted">برنده این دوره انتخاب شده</span>
                        ) : (
                          <span className="text-muted">در انتظار انتخاب</span>
                        )}
                      </td>

                      <td className="p-3">
                        {entry.selectable ? (
                          lottery.winners.some((winner) => winner.id === entry.id && winner.period === entry.period) ? (
                            <button type="button" disabled className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-600 disabled:opacity-70">برنده فعلی</button>
                          ) : (
                            <button type="button" onClick={() => void selectWinner(entry)} disabled={selectingWinner !== null || loading} className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
                              {selectingWinner === entry.id ? "در حال ثبت..." : "انتخاب و اعلام برنده"}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-muted">کد صادرشده؛ نیازمند همگام‌سازی</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {lottery.entries.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">
                هنوز هیچ کد شرکتی صادر نشده است.
              </p>
            )}
          </section>
        </>
      ) : (
        <p className="text-sm text-muted">
          دریافت اطلاعات امکان‌پذیر نبود.
        </p>
      )}
    </main>
  );
}
