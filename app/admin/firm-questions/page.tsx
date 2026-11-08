"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Question = {
  id: string;
  firm_id: string;
  display_name: string;
  question: string;
  approved: boolean;
  created_at: string;
};
type Firm = { id: string; name: string };

type QuestionResponse = { questions?: Question[]; error?: string };
type FirmResponse = { firms?: Firm[]; error?: string };

export default function QuestionsAdmin() {
  const [items, setItems] = useState<Question[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const refresh = useCallback(async () => {
    try {
      const [questionsResponse, firmsResponse] = await Promise.all([
        fetch("/api/admin/firm-questions", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/admin/firm-details", { cache: "no-store", credentials: "same-origin" }),
      ]);
      const questions = (await questionsResponse.json()) as QuestionResponse;
      if (!questionsResponse.ok) throw new Error(questions.error || "دریافت پرسش‌ها ناموفق بود.");
      setItems(Array.isArray(questions.questions) ? questions.questions : []);
      if (firmsResponse.ok) {
        const firmData = (await firmsResponse.json()) as FirmResponse;
        setFirms(Array.isArray(firmData.firms) ? firmData.firms : []);
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت پرسش‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const shown = useMemo(() => items.filter((q) => filter === "all" || (filter === "pending" ? !q.approved : q.approved)), [items, filter]);
  const names = useMemo(() => new Map(firms.map((firm) => [firm.id, firm.name])), [firms]);
  const pendingCount = items.filter((q) => !q.approved).length;

  async function action(id: string, method: "PATCH" | "DELETE", approved?: boolean) {
    if (busy) return;
    if (method === "DELETE" && !window.confirm("این پرسش برای همیشه حذف شود؟")) return;
    setBusy(id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/firm-questions", {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, approved }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "ذخیره تغییرات ناموفق بود.");
      await refresh();
      setNotice(method === "DELETE" ? "پرسش حذف شد." : approved ? "پرسش تأیید و منتشر شد." : "تأیید پرسش لغو شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در ذخیره");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold sm:text-2xl">مدیریت پرسش و گفت‌وگوی کاربران</h1>
          <p className="mt-2 text-xs leading-7 text-muted sm:text-sm">پرسش‌های تأییدشده در صفحه بررسی کامل همان شرکت نمایش داده می‌شوند.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="min-h-10 rounded-lg border border-border-theme px-4 py-2 text-sm font-bold sm:shrink-0">بارگذاری مجدد</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { id: "pending", text: `در انتظار تأیید (${pendingCount.toLocaleString("fa-IR")})` },
          { id: "approved", text: "تأییدشده" },
          { id: "all", text: "همه پرسش‌ها" },
        ].map((tab) => <button type="button" key={tab.id} onClick={() => setFilter(tab.id)} aria-pressed={filter === tab.id} className={`rounded-lg border px-3 py-2 text-xs font-bold sm:text-sm ${filter === tab.id ? "border-primary bg-primary text-primary-foreground" : "border-border-theme bg-surface text-foreground"}`}>{tab.text}</button>)}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-500/30 p-3 text-sm text-red-500">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-border-theme p-3 text-sm">{notice}</p>}
      {loading ? <p className="text-sm text-muted">در حال دریافت پرسش‌ها...</p> : shown.length === 0 ? <p className="rounded-xl border border-border-theme bg-surface p-5 text-sm text-muted">پرسشی در این وضعیت وجود ندارد.</p> : (
        <div className="space-y-3">
          {shown.map((q) => (
            <article key={q.id} className="min-w-0 rounded-xl border border-border-theme bg-surface p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <strong className="block break-words text-sm sm:text-base">{q.display_name || "کاربر سایت"}</strong>
                  <p className="mt-1 text-xs text-muted">شرکت: {names.get(q.firm_id) || "شرکت نامشخص"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg border border-border-theme px-2 py-1">{q.approved ? "تأییدشده" : "در انتظار تأیید"}</span>
                  <time className="text-muted" dateTime={q.created_at}>{q.created_at ? new Date(q.created_at).toLocaleDateString("fa-IR") : ""}</time>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8 text-foreground [overflow-wrap:anywhere]">{q.question}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button type="button" disabled={!!busy} onClick={() => void action(q.id, "PATCH", !q.approved)} className="min-h-10 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:text-sm">{busy === q.id ? "در حال انجام..." : q.approved ? "لغو تأیید" : "تأیید و انتشار"}</button>
                <button type="button" disabled={!!busy} onClick={() => void action(q.id, "DELETE")} className="min-h-10 rounded-lg border border-red-500/30 px-4 py-2 text-xs font-bold text-red-500 disabled:opacity-50 sm:text-sm">حذف پرسش</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
