"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";

type LotteryInfo = {
  enabled: boolean; title: string; description: string; period: string;
  articleSlug: string; signedIn: boolean;
  rounds: Array<{ title: string; description: string; articleSlug: string; period: string }>;
};
type Submission = {
  id: string; period: string; status: "pending" | "approved" | "rejected" | "issued";
  issued_code: string | null; admin_note: string | null; created_at: string;
};
const statusLabels: Record<Submission["status"], string> = {
  pending: "در انتظار بررسی مدیر", approved: "تأیید شده؛ در انتظار صدور کد",
  rejected: "رد شده", issued: "کد صادر شد",
};
const MAX_FILES = 5;
async function readJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`پاسخ سرور معتبر نیست (HTTP ${response.status}). لطفاً نسخه منتشرشده و لاگ‌ها را بررسی کنید.`);
  }
  return response.json();
}
async function shrinkImage(file: File): Promise<string> {
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("فقط تصویر JPG، PNG یا WEBP قابل ارسال است.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("آماده‌سازی تصویر ناموفق بود.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/jpeg", 0.72);
    if (result.length > 1_350_000) result = canvas.toDataURL("image/jpeg", 0.45);
    if (result.length > 1_350_000) throw new Error("حجم تصویر زیاد است؛ عکس کوچک‌تری انتخاب کنید.");
    return result;
  } finally { bitmap.close(); }
}
export default function LotteryPage() {
  const [info, setInfo] = useState<LotteryInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const selectedRound = info?.rounds?.find((round) => round.period === selectedPeriod) ?? info?.rounds?.[0];
  const submission = submissions.find((item) => item.period === selectedRound?.period) ?? null;
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/lottery", { cache: "no-store" });
        if (!response.ok) throw new Error("دریافت اطلاعات قرعه‌کشی ناموفق بود.");
        const data = (await readJson(response)) as LotteryInfo;
        if (!active) return;
        setInfo(data);
        const requested = new URLSearchParams(window.location.search).get("period");
        setSelectedPeriod(data.rounds?.find((round) => round.period === requested)?.period || data.rounds?.[0]?.period || "");
        if (data.signedIn) {
          const subResponse = await fetch("/api/lottery/submission", { cache: "no-store" });
          const subData = await readJson(subResponse);
          if (!subResponse.ok) throw new Error(subData.error || "دریافت درخواست ناموفق بود.");
          if (active) setSubmissions(Array.isArray(subData.submissions) ? subData.submissions : []);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "خطا در بارگذاری");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  async function chooseImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (images.length + files.length > MAX_FILES) { setError("حداکثر ۵ تصویر انتخاب کنید."); return; }
    setBusy(true); setError("");
    try {
      const converted = await Promise.all(files.map(shrinkImage));
      const all = [...images, ...converted];
      if (JSON.stringify(all).length > 3_800_000) throw new Error("حجم مجموع تصاویر زیاد است؛ تعداد یا اندازه عکس‌ها را کم کنید.");
      setImages(all);
    } catch (err) { setError(err instanceof Error ? err.message : "پردازش تصویر ناموفق بود."); }
    finally { setBusy(false); }
  }

  async function submitImages() {
    if (!images.length || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/lottery/submission", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, period: selectedRound?.period }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.error || "ارسال تصاویر ناموفق بود.");
      setSubmissions((previous) => [ { ...data.submission, period: data.period }, ...previous ]); setImages([]);
    } catch (err) { setError(err instanceof Error ? err.message : "ارسال ناموفق بود."); }
    finally { setBusy(false); }
  }

  return <main dir="rtl" className="mx-auto max-w-3xl px-4 py-12 sm:py-20">
    <section className="space-y-5 rounded-3xl border border-border-theme bg-surface p-5 shadow-xl sm:p-10">
      <h1 className="text-center text-2xl font-extrabold">{"قرعه‌کشی مقاله‌ای"}</h1>
      {loading && <p className="text-center text-muted">در حال بارگذاری...</p>}
      {info && !info.enabled && <p className="text-center text-muted">این قرعه‌کشی فعلاً فعال نیست.</p>}
      {info?.enabled && <>
        <div className="grid gap-2 sm:grid-cols-2">
          {info.rounds.map((round) => <button key={round.period} type="button"
            onClick={() => { setSelectedPeriod(round.period); setImages([]); setError(""); }}
            className={`rounded-xl border p-4 text-right ${selectedRound?.period === round.period ? "border-primary bg-primary/10" : "border-border-theme"}`}>
            <span className="block font-bold">{round.title}</span>
            <span className="mt-1 block text-xs text-muted">{round.period}</span>
          </button>)}
        </div>
        <p className="text-sm leading-8 text-muted">{selectedRound?.description}</p>
        <p className="text-sm text-muted">دوره: {selectedRound?.period}</p>
        {selectedRound?.articleSlug && <Link href={`/articles/${encodeURIComponent(selectedRound.articleSlug)}`} className="inline-block text-primary underline">مطالعه مقاله قرعه‌کشی</Link>}
        {!info.signedIn ? <div className="rounded-xl border border-border-theme p-5 text-center">
          <p className="mb-4">برای ارسال عکس‌ها ابتدا وارد حساب خود شوید.</p>
          <Link className="inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground" href="/login?next=%2Flottery">ورود / ثبت‌نام</Link>
          <p className="mt-3 text-xs text-muted">پس از ورود، دوباره صفحه قرعه‌کشی را باز کنید.</p>
        </div> : submission ? <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="font-bold">وضعیت درخواست: {statusLabels[submission.status]}</p>
          <p className="text-xs text-muted">تاریخ ارسال: {new Date(submission.created_at).toLocaleString("fa-IR")}</p>
          {submission.admin_note && <p className="text-sm">توضیح مدیر: {submission.admin_note}</p>}
          {submission.status === "issued" && submission.issued_code && <div className="rounded-xl bg-surface p-4">
            <p className="mb-2 font-semibold">کد اختصاصی شما</p>
            <p dir="ltr" className="break-all text-center font-mono text-lg font-extrabold">{submission.issued_code}</p>
            <Link className="mt-3 inline-block text-primary underline" href="/account">مشاهده در پنل کاربری</Link>
          </div>}
          {submission.status !== "issued" && <p className="text-sm text-muted">بعد از بررسی تصاویر، مدیر نتیجه را اعلام می‌کند.</p>}
        </div> : <div className="space-y-4">
          <h2 className="font-bold">ارسال تصاویر برای بررسی مدیر</h2>
          <p className="text-sm leading-7 text-muted">۱ تا ۵ تصویر JPG، PNG یا WEBP انتخاب کنید. پس از ارسال، مدیر آن‌ها را بررسی می‌کند و کد را برای پنل کاربری شما صادر می‌کند.</p>
          <label className="inline-block cursor-pointer rounded-xl border border-primary px-5 py-3 font-bold text-primary">
            انتخاب عکس‌ها
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={chooseImages}/>
          </label>
          {images.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((src, index) => <div key={index} className="rounded-xl border border-border-theme p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`تصویر ${index + 1}`} className="h-28 w-full rounded-lg object-contain"/>
              <button type="button" disabled={busy} onClick={() => setImages(previous => previous.filter((_, i) => i !== index))} className="mt-2 w-full text-xs text-red-500">حذف</button>
            </div>)}
          </div>}
          <button type="button" disabled={!images.length || busy} onClick={submitImages} className="block w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? "در حال پردازش..." : "ارسال تصاویر برای مدیر"}</button>
        </div>}
      </>}
      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
    </section>
  </main>;
}
