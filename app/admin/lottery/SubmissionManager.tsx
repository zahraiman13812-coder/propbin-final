"use client";

import { useCallback, useEffect, useState } from "react";

type Submission = {
  id: string; name: string; email: string; period: string; images: string[];
  status: "pending" | "approved" | "rejected" | "issued";
  issued_code: string | null; admin_note: string | null; created_at: string;
};
const labels: Record<Submission["status"], string> = {
  pending: "در انتظار بررسی", approved: "تأیید شده؛ در انتظار صدور کد",
  rejected: "رد شده", issued: "کد صادرشده",
};
export default function SubmissionManager() {
  const [items, setItems] = useState<Submission[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Submission["status"]>("all");

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLocaleLowerCase("fa");
    const matchesSearch = !query || [item.name, item.email, item.period, item.issued_code || ""]
      .some((value) => value.toLocaleLowerCase("fa").includes(query));
    return matchesSearch && (statusFilter === "all" || item.status === statusFilter);
  });

  const statusCounts = {
    pending: items.filter((item) => item.status === "pending").length,
    approved: items.filter((item) => item.status === "approved").length,
    rejected: items.filter((item) => item.status === "rejected").length,
    issued: items.filter((item) => item.status === "issued").length,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/lottery/submissions", { cache: "no-store", credentials: "same-origin" });
      if (!(response.headers.get("content-type") || "").includes("application/json"))
        throw new Error(`پاسخ سرور معتبر نیست (HTTP ${response.status}).`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "دریافت درخواست‌ها ناموفق بود.");
      setItems(Array.isArray(data.submissions) ? data.submissions : []);
    } catch (err) { setError(err instanceof Error ? err.message : "خطا در بارگذاری"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function act(item: Submission, action: "approve" | "reject" | "issue") {
    if (busy) return;
    if (action === "issue" && !(codes[item.id] || "").trim()) {
      setError("کد اختصاصی را وارد کنید."); return;
    }
    if (action === "reject" && !window.confirm("این درخواست رد شود؟")) return;
    setBusy(item.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/lottery/submissions", {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action, code: codes[item.id] || "", note: notes[item.id] || "" }),
      });
      if (!(response.headers.get("content-type") || "").includes("application/json"))
        throw new Error(`پاسخ سرور معتبر نیست (HTTP ${response.status}).`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "عملیات ناموفق بود.");
      setMessage(data.message || "انجام شد.");
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "خطای سرور"); }
    finally { setBusy(""); }
  }

  return <section className="space-y-5 rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-extrabold">درخواست‌های ارسال عکس قرعه‌کشی</h2>
        <p className="mt-2 text-sm text-muted">تصاویر فقط برای مدیر نمایش داده می‌شوند. صدور کد پس از تأیید امکان‌پذیر است.</p></div>
      <div className="flex items-center gap-3"><a href="/api/admin/lottery/diagnostics" target="_blank" rel="noreferrer" className="text-sm text-primary underline">عیب‌یابی اتصال دیتابیس</a>
      <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-border-theme px-4 py-2 text-sm disabled:opacity-50">به‌روزرسانی</button></div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">{message}</p>}
    {loading && <p className="text-sm text-muted">در حال دریافت درخواست‌ها...</p>}
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="جست‌وجو بر اساس نام، ایمیل، دوره یا کد..."
        aria-label="جست‌وجوی شرکت‌کنندگان قرعه‌کشی"
        className="min-w-0 rounded-xl border border-border-theme bg-background px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
        aria-label="فیلتر وضعیت درخواست"
        className="rounded-xl border border-border-theme bg-background px-4 py-3 text-sm"
      >
        <option value="all">همه وضعیت‌ها ({items.length})</option>
        <option value="pending">در انتظار بررسی ({statusCounts.pending})</option>
        <option value="approved">تأیید شده ({statusCounts.approved})</option>
        <option value="issued">کد صادر شده ({statusCounts.issued})</option>
        <option value="rejected">رد شده ({statusCounts.rejected})</option>
      </select>
    </div>
    {!loading && !items.length && <p className="text-sm text-muted">هنوز درخواستی ثبت نشده است.</p>}
    {!loading && items.length > 0 && filteredItems.length === 0 && <p className="text-sm text-muted">درخواستی با این جست‌وجو یا فیلتر پیدا نشد.</p>}
    <div className="grid gap-5">
      {filteredItems.map(item => <article key={item.id} className="space-y-4 rounded-xl border border-border-theme bg-background p-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div><h3 className="font-bold">{item.name}</h3><p dir="ltr" className="break-all text-left text-sm text-muted">{item.email}</p>
            <p className="mt-1 text-xs text-muted">دوره: {item.period} | {new Date(item.created_at).toLocaleString("fa-IR")}</p></div>
          <p className="text-sm font-bold text-primary">{labels[item.status]}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Array.isArray(item.images) ? item.images : []).map((src, index) => <a key={index} href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-border-theme" title="مشاهده عکس در اندازه کامل">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`مدرک شماره ${index + 1} از ${item.name}`} className="h-32 w-full object-contain" />
          </a>)}
        </div>
        {item.admin_note && <p className="text-sm text-muted">یادداشت قبلی مدیر: {item.admin_note}</p>}
        {item.issued_code && <p dir="ltr" className="break-all rounded-lg bg-surface p-3 font-mono font-bold">{item.issued_code}</p>}
        {item.status !== "issued" && <>
          <label className="block text-sm">یادداشت مدیر (اختیاری)
            <textarea value={notes[item.id] || ""} onChange={e => setNotes(old => ({...old, [item.id]: e.target.value}))} maxLength={500} rows={2} className="mt-2 w-full rounded-lg border border-border-theme bg-surface p-3"/>
          </label>
          {item.status === "approved" && <label className="block text-sm">کد اختصاصی کاربر
            <input type="text" dir="ltr" value={codes[item.id] || ""} maxLength={60} onChange={e => setCodes(old => ({...old, [item.id]: e.target.value}))} placeholder="PB-..." className="mt-2 w-full rounded-lg border border-border-theme bg-surface p-3"/>
          </label>}
          <div className="flex flex-wrap gap-2">
            {item.status !== "approved" && <button type="button" disabled={!!busy} onClick={() => void act(item, "approve")} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">تأیید درخواست</button>}
            {item.status === "approved" && <button type="button" disabled={!!busy} onClick={() => void act(item, "issue")} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">ارسال کد به پنل کاربر</button>}
            {item.status !== "rejected" && <button type="button" disabled={!!busy} onClick={() => void act(item, "reject")} className="rounded-lg border border-red-500 px-4 py-2 text-sm text-red-500 disabled:opacity-50">رد درخواست</button>}
          </div>
        </>}
      </article>)}
    </div>
  </section>;
}
