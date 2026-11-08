import type { Metadata } from "next";
import { siteOrigin } from "@/lib/site-origin";
import Link from "next/link";
import { notFound } from "next/navigation";
import FirmLogo from "@/components/FirmLogo";
import FirmQuestionForm from "@/components/FirmQuestionForm";
import { getActivePropFirms } from "@/lib/supabase-firms";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getFirmDetails } from "@/lib/firm-details";
import { emptyDetails } from "@/lib/firm-details-types";
import { firmSpecificationFields } from "@/lib/firm-specifications";
import { getPolls } from "@/lib/supabase-polls";

export const dynamic = "force-dynamic";
type Question = { id: string; display_name: string; question: string; created_at: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const firm = (await getActivePropFirms()).find(item => item.id === id);
  if (!firm) return { title: "شرکت پیدا نشد", robots: { index: false, follow: false } };
  const title = `بررسی ${firm.name}`;
  const description = (firm.description || `بررسی قوانین، پلن‌ها و نظرات کاربران درباره ${firm.name}`).slice(0, 160);
  const url = `${siteOrigin()}/firms/${encodeURIComponent(id)}`;
  return { title, description, alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, locale: "fa_IR" },
    twitter: { card: "summary", title, description } };
}

export default async function FirmFullPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const firms = await getActivePropFirms();
  const firm = firms.find((x) => x.id === id);
  if (!firm) notFound();

  // A missing optional migration must not prevent the public company page from opening.
  const details = await getFirmDetails(id).catch((error) => {
    console.error("Firm detail read failed; showing basic information:", error);
    return { ...emptyDetails };
  });
  const approved = await getPolls()
    .then((polls) => polls.filter((p) => p.firmId === id && p.approved && p.comment.trim()))
    .catch((error) => { console.error("Firm reviews failed:", error); return []; });
  let questions: Question[] = [];
  try {
    const { data, error } = await getSupabaseAdmin().from("firm_questions")
      .select("id,display_name,question,created_at")
      .eq("firm_id", id).eq("approved", true)
      .order("created_at", { ascending: false }).limit(100);
    if (error) console.error("Firm questions unavailable:", error);
    else questions = (data ?? []) as Question[];
  } catch (error) { console.error("Firm questions failed:", error); }

  const summary = [
    ["حداکثر سرمایه", firm.capital], ["سهم سود", firm.profit],
    ["هزینه چالش", firm.fee], ["نوع چالش", firm.challenge],
    ["پرداخت سود", firm.payout], ["امتیاز کاربران", firm.rating],
  ];
  const box = "scroll-mt-24 rounded-2xl border border-border-theme bg-surface p-4 sm:p-7";
  const h2 = "mb-4 text-lg font-extrabold sm:text-2xl";
  const paragraph = "whitespace-pre-line break-words text-sm leading-8 text-muted sm:text-base";
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-6 px-3 py-8 sm:px-6 sm:py-12">
        <section className={box}>
          <div className="flex flex-wrap items-center gap-4">
            <FirmLogo firm={firm} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary">مشاهده کامل شرکت پراپ</p>
              <h1 className="mt-2 break-words text-xl font-extrabold sm:text-3xl">{firm.name}</h1>
              <p className="mt-2 text-sm text-muted">اطلاعات و قوانین ثبت‌شده توسط مدیریت پراپ‌بین</p>
            </div>
          </div>
          {firm.description && <p className={`mt-5 ${paragraph}`}>{firm.description}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/discounts#${encodeURIComponent(id)}`} className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">مشاهده کد تخفیف</Link>
            <Link href={`/compare?firms=${encodeURIComponent(id)}`} className="rounded-lg border border-border-theme px-4 py-3 text-sm font-bold">مقایسه شرکت</Link>
            <Link href="/firms" className="rounded-lg border border-border-theme px-4 py-3 text-sm font-bold">بازگشت به بررسی پراپ‌ها</Link>
          </div>
        </section>
        <nav aria-label="فهرست بخش‌ها" className="flex flex-wrap gap-2 rounded-xl border border-border-theme bg-surface p-3 text-xs sm:text-sm">
          {[["overview","اطلاعات در یک نگاه"],["intro","معرفی و سابقه"],["specs","مشخصات کامل"],["plans","پلن‌ها"],["rules","قوانین و برداشت"],["pros","مزایا و معایب"],["discounts","تخفیف‌ها"],["faqs","سؤالات متداول"],["discussion","گفت‌وگو"]].map(([key,label]) =>
            <a href={`#${key}`} key={key} className="rounded-lg border border-border-theme px-3 py-2 hover:text-primary">{label}</a>)}
        </nav>
        <section id="overview" className={box}>
          <h2 className={h2}>مشخصات در یک نگاه</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...summary, ...(details.facts ?? []).map((x) => [x.label,x.value])].map(([label,value],i) =>
              <div className="min-w-0 rounded-xl border border-border-theme bg-surface-secondary p-4" key={`${label}-${i}`}><p className="text-xs text-muted">{label}</p><p className="mt-2 break-words font-semibold">{value || "ثبت نشده"}</p></div>)}
          </div>
        </section>
        <section id="intro" className={box}>
          <h2 className={h2}>معرفی و بررسی شرکت</h2>
          <p className={paragraph}>{details.introduction || firm.description || "هنوز توضیحی ثبت نشده است."}</p>
          <h3 className="mb-3 mt-7 text-lg font-bold">سابقه و اعتبار شرکت</h3>
          <p className={paragraph}>{details.history || "ثبت نشده"}</p>
        </section>
        <section id="specs" className={box}>
          <h2 className={h2}>مشخصات دقیق و کامل شرکت</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {firmSpecificationFields.map((field) =>
              <div className="min-w-0 rounded-xl border border-border-theme bg-surface-secondary p-4" key={field.key}>
                <p className="text-xs text-muted">{field.label}</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold">{details.specifications?.[field.key] || "ثبت نشده"}</p>
              </div>)}
          </div>
        </section>
        <section id="plans" className={box}>
          <h2 className={h2}>جدول پلن‌ها و قیمت‌ها</h2>
          {(details.plans ?? []).length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right text-sm">
            <thead><tr className="bg-surface-secondary">{["پلن","اندازه حساب","قیمت","هدف سود","افت روزانه","افت کل"].map((x)=><th key={x} className="p-3">{x}</th>)}</tr></thead>
            <tbody>{details.plans.map((p,i)=><tr className="border-t border-border-theme" key={i}>{[p.name,p.size,p.price,p.target,p.dailyLoss,p.maxLoss].map((v,j)=><td className="p-3" key={j}>{v || "—"}</td>)}</tr>)}</tbody>
          </table></div> : <p className={paragraph}>پلنی هنوز ثبت نشده است.</p>}
        </section>
        <section id="rules" className={box}>
          <h2 className={h2}>قوانین معاملاتی و محدودیت‌ها</h2>
          <p className={paragraph}>{details.tradingRules || "ثبت نشده"}</p>
          <h3 className="mb-3 mt-7 text-lg font-bold">قوانین برداشت سود و بازگشت وجه</h3>
          <p className={paragraph}>{details.payoutRules || "ثبت نشده"}</p>
        </section>
        <section id="pros" className="scroll-mt-24 grid gap-3 md:grid-cols-2">
          {([["مزایا",details.pros,"text-green-500"],["معایب",details.cons,"text-red-500"]] as const).map(([label,items,color])=><div className={box} key={label}>
            <h2 className={`${h2} ${color}`}>{label}</h2>
            {items?.length ? <ul className="list-inside list-disc space-y-2 text-sm leading-8 text-muted">{items.map((x,i)=><li key={i}>{x}</li>)}</ul> : <p className={paragraph}>ثبت نشده</p>}
          </div>)}
        </section>
        <section id="discounts" className={box}>
          <h2 className={h2}>کدهای تخفیف</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {firm.code && <div className="rounded-xl border border-border-theme p-4"><p className="text-sm text-muted">{firm.discount || "تخفیف"}</p><code dir="ltr" className="mt-2 inline-block font-bold">{firm.code}</code></div>}
            {(details.discounts ?? []).map((x,i)=><div key={i} className="min-w-0 rounded-xl border border-border-theme p-4"><p className="font-bold text-primary">{x.amount}</p><code dir="ltr" className="mt-2 inline-block break-all">{x.code}</code><p className="mt-3 whitespace-pre-wrap text-sm text-muted">{x.note}</p></div>)}
          </div>
          {!firm.code && !(details.discounts ?? []).length && <p className={paragraph}>کد تخفیفی ثبت نشده است.</p>}
          <Link href={`/discounts#${encodeURIComponent(id)}`} className="mt-4 inline-block rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">مشاهده همه پیشنهادهای تخفیف</Link>
        </section>
        <section id="faqs" className={box}>
          <h2 className={h2}>سؤالات متداول</h2>
          {(details.faqs ?? []).length ? <div className="space-y-3">{details.faqs.map((x,i)=><details key={i} className="rounded-xl border border-border-theme p-4"><summary className="cursor-pointer font-bold">{x.question}</summary><p className={`mt-3 ${paragraph}`}>{x.answer}</p></details>)}</div> : <p className={paragraph}>سؤالی ثبت نشده است.</p>}
        </section>
        <section id="discussion" className={box}>
          <h2 className={h2}>پرسش و گفت‌وگوی کاربران</h2>
          <FirmQuestionForm firmId={id} />
          <Link href={`/polls?firm=${encodeURIComponent(id)}`} className="mt-4 inline-block rounded-lg border border-border-theme px-4 py-3 text-sm font-bold">ثبت امتیاز و تجربه</Link>
          <div className="mt-5 space-y-3">
            {questions.map((q)=><div key={q.id} className="rounded-xl bg-surface-secondary p-4"><p className="font-bold">{q.display_name || "کاربر سایت"}</p><p className={`mt-2 ${paragraph}`}>{q.question}</p></div>)}
            {approved.map((p)=><div key={p.id} className="rounded-xl bg-surface-secondary p-4"><p className="font-bold">{p.displayName || "کاربر سایت"}</p><p className={`mt-2 ${paragraph}`}>{p.comment}</p></div>)}
            {!questions.length && !approved.length && <p className={paragraph}>هنوز نظری تأیید نشده است.</p>}
          </div>
        </section>
        <p className="pb-4 text-xs leading-7 text-muted">اطلاعات نمایش‌داده‌شده از پنل مدیریت سایت دریافت می‌شود. پیش از تصمیم‌گیری، قوانین رسمی شرکت را بررسی کنید.</p>
      </div>
    </main>
  );
}
