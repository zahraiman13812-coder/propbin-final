"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, MailCheck, ShieldCheck } from "lucide-react";

type Mode = "login" | "register";
const inputClass = "mt-2 w-full min-w-0 rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/10";
const labelClass = "block text-sm font-medium text-foreground";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  function changeMode(nextMode: Mode) {
    setMode(nextMode); setStep("email"); setCode(""); setError(""); setInfo("");
  }

  async function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setInfo("");
    try {
      const response = await fetch("/api/user/request-code", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email: email.trim().toLowerCase(), ...(mode === "register" ? { name: name.trim() } : {}) }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "ارسال کد ناموفق بود.");
      setStep("code"); setInfo(data.message || "کد به ایمیل ارسال شد."); setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ارسال کد با خطا مواجه شد.");
    } finally { setBusy(false); }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/user/verify-code", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "کد معتبر نیست.");
      router.replace("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "بررسی کد ناموفق بود.");
    } finally { setBusy(false); }
  }

  return <main dir="rtl" className="flex min-h-[75vh] items-center justify-center px-3 py-10 sm:px-6">
    <section className="w-full max-w-[440px] min-w-0 rounded-3xl border border-border-theme bg-surface p-5 text-foreground shadow-xl sm:p-8">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary"><ShieldCheck size={24}/></div>
        <h1 className="text-2xl font-bold">{step === "code" ? "وارد کردن کد ایمیل" : mode === "login" ? "ورود به پراپ‌بین" : "ثبت‌نام در پراپ‌بین"}</h1>
        <p className="mt-2 text-sm leading-7 text-muted">{step === "code" ? "رمز ۶ رقمی ارسال‌شده به ایمیل را وارد کنید و دکمه ورود را بزنید." : "ابتدا اطلاعات را وارد کنید و دکمه ارسال کد را بزنید؛ سپس در مرحله بعد رمز ایمیل را وارد کنید."}</p>
      </div>
      {step === "email" ? <>
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-border-theme bg-background p-1">
          {([ ["login", "ورود"], ["register", "ثبت‌نام"] ] as const).map(([value, title]) =>
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => changeMode(value)}
              className={`min-h-10 rounded-lg px-2 text-sm font-semibold transition ${mode === value ? "bg-surface-secondary text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>{title}</button>)}
        </div>
        <form className="space-y-5" onSubmit={sendCode}>
          {mode === "register" && <label className={labelClass}>نام و نام خانوادگی
            <input className={inputClass} value={name} onChange={e => setName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required placeholder="نام شما" />
          </label>}
          <label className={labelClass}>آدرس ایمیل
            <input className={inputClass} dir="ltr" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254} required placeholder="name@example.com" />
          </label>
          {error && <p role="alert" className="break-words rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال ارسال..." : "ارسال کد"}<ArrowLeft size={17}/></button>
        </form>
      </> : <>
        <div className="mb-4 flex items-center justify-center gap-2 break-all text-center text-sm text-muted" dir="ltr"><MailCheck size={18}/>{email}</div>
        <form onSubmit={verifyCode} className="space-y-5">
          <label className={labelClass}>کد تأیید ۶ رقمی
            <input className={`${inputClass} text-center text-xl tracking-[.35em]`} dir="ltr" value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6} placeholder="000000" />
          </label>
          {info && <p role="status" className="break-words rounded-lg border border-primary/25 bg-primary/10 p-3 text-sm leading-7 text-foreground">{info}</p>}
          {error && <p role="alert" className="break-words rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={busy || code.length !== 6} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال تأیید..." : "ورود"}<ArrowLeft size={17}/></button>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <button type="button" className="inline-flex items-center gap-1 text-primary hover:underline" onClick={() => { setStep("email"); setError(""); setInfo(""); }}><ArrowRight size={15}/> تغییر ایمیل</button>
            <button type="button" disabled={busy} className="text-primary hover:underline disabled:opacity-50" onClick={() => sendCode()}>ارسال مجدد کد</button>
          </div>
        </form>
      </>}
      <p className="mt-6 text-center text-xs leading-6 text-muted">هر کد فقط یک بار قابل استفاده است و ۱۰ دقیقه اعتبار دارد.</p>
    </section>
  </main>;
}
