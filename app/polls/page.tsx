"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Headphones, LogIn, MessageSquare, ShieldCheck, Star, Wallet, Scale } from "lucide-react";

type Firm = { id: string; name: string };
type Vote = { firmId: string };
type Scores = { trust: number; support: number; payout: number; rules: number };
const blankScores: Scores = { trust: 0, support: 0, payout: 0, rules: 0 };
const criteria = [
  { key: "trust", title: "اعتبار شرکت", icon: ShieldCheck },
  { key: "support", title: "پشتیبانی", icon: Headphones },
  { key: "payout", title: "برداشت سود", icon: Wallet },
  { key: "rules", title: "قوانین شرکت", icon: Scale },
] as const;

function Stars({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div role="group" aria-label="انتخاب امتیاز" className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((number) => (
        <button key={number} type="button" aria-label={`${number} ستاره`} aria-pressed={value === number}
          onClick={() => onChange(number)}
          className="rounded p-1 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary">
          <Star size={26} className={number <= value ? "fill-amber-400 text-amber-400" : "text-muted"} />
        </button>
      ))}
    </div>
  );
}

export default function PollsPage() {
  const router = useRouter();
  const [firms, setFirms] = useState<Firm[]>([]);
  const [selected, setSelected] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [myVotes, setMyVotes] = useState<Vote[]>([]);
  const [scores, setScores] = useState<Scores>({ ...blankScores });
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [contentResponse, sessionResponse] = await Promise.all([
      fetch("/api/firms", { cache: "no-store" }),
      fetch("/api/user/session", { cache: "no-store" }),
    ]);
    if (!contentResponse.ok || !sessionResponse.ok) throw new Error("دریافت اطلاعات نظرسنجی ناموفق بود.");
    const content = await contentResponse.json();
    const session = await sessionResponse.json();
    const available: Firm[] = content.firms || [];
    setFirms(available);
    const requested = new URLSearchParams(window.location.search).get("firm");
    if (requested && available.some((firm) => firm.id === requested)) setSelected(requested);
    setSignedIn(Boolean(session.user));
    if (session.user) {
      const response = await fetch("/api/polls?mine=1", { cache: "no-store" });
      if (response.ok) {
        const result = await response.json();
        setMyVotes(result.polls || []);
      }
    } else {
      setMyVotes([]);
      if (requested && available.some((firm) => firm.id === requested)) {
        router.replace(`/login?next=${encodeURIComponent(`/polls?firm=${requested}`)}`);
      }
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "خطا در بارگذاری"))
      .finally(() => setLoading(false));
    // Run on initial page visit; selection changes are handled locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseFirm(id: string) {
    setSelected(id);
    setScores({ ...blankScores });
    setComment("");
    setError("");
    setMessage("");
    const url = id ? `/polls?firm=${encodeURIComponent(id)}` : "/polls";
    window.history.replaceState(null, "", url);
  }

  async function submitVote() {
    if (!selected || saving) return;
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/polls?firm=${selected}`)}`);
      return;
    }
    if (Object.values(scores).some((value) => value < 1 || value > 5)) {
      setError("لطفاً به هر چهار معیار امتیاز بده.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmId: selected, ...scores, comment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ثبت نظر انجام نشد.");
      const mine = await fetch("/api/polls?mine=1", { cache: "no-store" });
      if (mine.ok) {
        const mineResult = await mine.json();
        setMyVotes(mineResult.polls || []);
      }
      setScores({ ...blankScores });
      setComment("");
      setMessage(result.message || "نظر شما ثبت شد و پس از بررسی مدیر منتشر می‌شود.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت نظر");
    } finally {
      setSaving(false);
    }
  }

  const alreadyVoted = myVotes.some((vote) => vote.firmId === selected);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border-theme bg-surface px-4 py-12 text-center sm:py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
            <MessageSquare size={16} /> تجربه تریدرها
          </div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">ثبت امتیاز و نظر <span className="text-primary">شرکت‌های پراپ</span></h1>
          <p className="mt-4 text-sm leading-8 text-muted">شرکت موردنظر را انتخاب کنید و تجربه خودتان را ثبت کنید.</p>
        </div>
      </section>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-8">
          <label htmlFor="firm-select" className="block text-base font-bold">انتخاب شرکت پراپ</label>
          <p className="mt-2 text-sm text-muted">نام شرکت‌ها از شرکت‌های ثبت‌شده در سایت دریافت می‌شود.</p>
          {loading ? <p className="mt-5 text-muted">در حال دریافت شرکت‌ها...</p> : (
            <select id="firm-select" value={selected} onChange={(e) => chooseFirm(e.target.value)}
              className="mt-4 h-12 w-full rounded-xl border border-border-theme bg-background px-4 text-foreground">
              <option value="">یک شرکت انتخاب کنید</option>
              {firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
            </select>
          )}
          {!loading && firms.length === 0 && <p className="mt-4 text-sm text-muted">هنوز شرکتی ثبت نشده است.</p>}

          {selected && !signedIn && !loading && (
            <div className="mt-6 rounded-xl bg-background p-5 text-center">
              <p className="mb-4 text-sm text-muted">برای ثبت امتیاز و نظر ابتدا وارد حساب خود شوید.</p>
              <Link className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
                href={`/login?next=${encodeURIComponent(`/polls?firm=${selected}`)}`}>
                <LogIn size={18} /> ورود و ادامه نظرسنجی
              </Link>
            </div>
          )}

          {selected && signedIn && alreadyVoted && (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm text-success">
              <CheckCircle2 size={18} /> نظر شما برای این شرکت قبلاً ثبت شده است.
            </div>
          )}

          {selected && signedIn && !alreadyVoted && (
            <div className="mt-7 space-y-6 border-t border-border-theme pt-6">
              <h2 className="font-bold">امتیازدهی به شرکت انتخاب‌شده</h2>
              {criteria.map(({ key, title, icon: Icon }) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Icon size={18} className="text-primary" />{title}</span>
                  <Stars value={scores[key]} onChange={(value) => setScores((prev) => ({ ...prev, [key]: value }))} />
                </div>
              ))}
              <div>
                <label htmlFor="poll-comment" className="mb-2 block text-sm font-bold">نظر شما (اختیاری)</label>
                <textarea id="poll-comment" rows={4} maxLength={500} value={comment}
                  onChange={(event) => setComment(event.target.value)} placeholder="تجربه خود را بنویسید..."
                  className="w-full rounded-xl border border-border-theme bg-background p-3 text-sm text-foreground outline-none focus:border-primary" />
                <p className="mt-1 text-left text-xs text-muted">{comment.length}/500</p>
              </div>
              <button type="button" disabled={saving} onClick={submitVote}
                className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-50">
                {saving ? "در حال ثبت..." : "ثبت نهایی امتیاز و نظر"}
              </button>
            </div>
          )}
        </div>
        {message && <p role="status" className="mt-5 rounded-xl bg-success/10 p-4 text-sm text-success">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-xl bg-danger/10 p-4 text-sm text-danger">{error}</p>}
        <p className="mt-6 text-xs leading-7 text-muted">نظرها پس از بررسی مدیر منتشر می‌شوند و به معنی تضمین عملکرد شرکت‌ها نیستند.</p>
      </main>
    </div>
  );
}
