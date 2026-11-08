"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Submission = {
  id: string;
  period: string;
  status: "pending" | "approved" | "rejected" | "issued";
  issued_code: string | null;
  admin_note: string | null;
  created_at: string;
  result: { status: "won" | "lost"; period: string; announcedAt: string | null } | null;
};
const labels: Record<Submission["status"], string> = {
  pending: "در انتظار بررسی مدیر", approved: "تأیید شده؛ در انتظار دریافت کد",
  rejected: "رد شده", issued: "کد صادر شده",
};
export default function LotterySubmissionStatus() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await fetch("/api/lottery/submission", { cache: "no-store" });
        if (!(s.headers.get("content-type") || "").includes("application/json")) {
          throw new Error(`پاسخ سرور معتبر نیست (HTTP ${s.status}).`);
        }
        const sr = await s.json();
        if (!s.ok) throw new Error(sr.error || "دریافت وضعیت ناموفق بود.");
        if (active) {
          setSubmissions(Array.isArray(sr.submissions)
            ? sr.submissions
            : sr.submission ? [sr.submission] : []);
        }
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "خطا در دریافت وضعیت"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);
  return <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
    <h2 className="text-lg font-extrabold">🎟️ درخواست قرعه‌کشی مقاله‌ای من</h2>
    {loading ? <p className="mt-3 text-sm text-muted">در حال بررسی...</p> : error ? <p className="mt-3 text-sm text-red-500">{error}</p> : <div className="mt-4 space-y-3">
      {submissions.length > 0 ? <div className="space-y-4">
        {submissions.map((submission) => <article key={submission.id} className="space-y-3 rounded-xl border border-border-theme p-4">
          <p className="font-bold">دوره: {submission.period}</p>
          <p className="font-semibold">وضعیت درخواست: {labels[submission.status]}</p>
          <p className="text-xs text-muted">تاریخ درخواست: {new Date(submission.created_at).toLocaleString("fa-IR")}</p>
          {submission.admin_note && <p className="text-sm">توضیح مدیر: {submission.admin_note}</p>}
          {submission.result?.status === "won" && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="font-extrabold text-emerald-700 dark:text-emerald-300">🏆 تبریک! شما برنده قرعه‌کشی شدید.</p>
            <p className="mt-1 text-sm">شما در دوره «{submission.result.period}» به‌عنوان برنده انتخاب شده‌اید.</p>
            {submission.result.announcedAt && <p className="mt-2 text-xs text-muted">تاریخ اعلام نتیجه: {new Date(submission.result.announcedAt).toLocaleString("fa-IR")}</p>}
          </div>}
          {submission.result?.status === "lost" && <div role="status" className="rounded-xl border border-border-theme bg-surface-secondary p-4">
            <p className="font-extrabold">این بار برنده نشدید.</p>
            <p className="mt-1 text-sm text-muted">از شرکت شما در قرعه‌کشی دوره «{submission.result.period}» سپاسگزاریم. امیدواریم در دوره‌های بعدی برنده شوید.</p>
            {submission.result.announcedAt && <p className="mt-2 text-xs text-muted">تاریخ اعلام نتیجه: {new Date(submission.result.announcedAt).toLocaleString("fa-IR")}</p>}
          </div>}
          {submission.status === "issued" && !submission.result && <p className="rounded-xl border border-border-theme bg-surface-secondary p-3 text-sm text-muted">نتیجه قرعه‌کشی این دوره هنوز اعلام نشده است.</p>}
          {submission.status === "issued" && submission.issued_code && <div className="rounded-xl bg-primary/10 p-4">
            <p className="mb-2 font-bold">کد اختصاصی شما</p>
            <p dir="ltr" className="break-all text-center font-mono text-lg font-extrabold text-primary">{submission.issued_code}</p>
          </div>}
        </article>)}
      </div> : <p className="text-sm text-muted">هنوز درخواستی برای قرعه‌کشی مقاله‌ای ثبت نکرده‌اید.</p>}
      <Link href="/lottery" className="inline-block font-bold text-primary underline">مشاهده صفحه قرعه‌کشی</Link>
    </div>}
  </section>;
}
