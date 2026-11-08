"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type ApiReply = { ok?: boolean; message?: string; error?: string };

export default function FirmQuestionForm({ firmId }: { firmId: string }) {
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || question.trim().length < 5) return;
    setBusy(true);
    setError(false);
    setStatus("");
    try {
      const response = await fetch("/api/firm-questions", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmId, question: question.trim() }),
      });
      const result = (await response.json()) as ApiReply;
      if (!response.ok || !result.ok) {
        setError(true);
        setStatus(result.error || "ثبت پرسش ناموفق بود.");
        return;
      }
      setQuestion("");
      setStatus(result.message || "پرسش ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.");
    } catch {
      setError(true);
      setStatus("ارتباط با سرور برقرار نشد. دوباره امتحان کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 min-w-0 space-y-4 rounded-xl border border-border-theme bg-surface-secondary p-3 sm:p-5">
      <div className="space-y-1">
        <label htmlFor="firm-question" className="block text-sm font-extrabold sm:text-base">پرسش خود را بنویسید</label>
        <p className="text-xs leading-6 text-muted">برای ثبت پرسش باید وارد حساب کاربری شده باشید. پرسش‌ها پس از تأیید مدیر برای همه قابل مشاهده هستند.</p>
      </div>
      <textarea
        id="firm-question"
        value={question}
        onChange={(event) => { setQuestion(event.target.value); if (status) setStatus(""); }}
        minLength={5}
        maxLength={1500}
        required
        rows={4}
        disabled={busy}
        dir="rtl"
        className="block min-h-28 w-full min-w-0 resize-y rounded-xl border border-border-theme bg-background p-3 text-sm leading-7 text-foreground outline-none placeholder:text-muted focus:border-primary disabled:opacity-60 sm:p-4"
        placeholder="پرسش درباره قوانین، شرایط برداشت سود یا تجربه همکاری با این شرکت..."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted">{question.length.toLocaleString("fa-IR")} از ۱۵۰۰ کاراکتر</span>
        <button type="submit" disabled={busy || question.trim().length < 5} className="min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {busy ? "در حال ارسال..." : "ارسال"}
        </button>
      </div>
      {status && (
        <div role={error ? "alert" : "status"} aria-live="polite" className={`break-words rounded-lg border p-3 text-sm leading-7 ${error ? "border-red-500/30 text-red-500" : "border-emerald-500/30 text-foreground"}`}>
          {status}
          {error && status.includes("وارد حساب") && <Link href="/login" className="mr-2 font-bold text-primary underline">ورود به حساب</Link>}
        </div>
      )}
    </form>
  );
}
