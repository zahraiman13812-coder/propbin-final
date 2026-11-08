"use client";
import { firmSpecificationFields } from "@/lib/firm-specifications";

import { useEffect, useState } from "react";
import type { FirmDetailsData } from "@/lib/firm-details-types";
import { emptyDetails } from "@/lib/firm-details-types";
const inputs=[ ["introduction","معرفی و بررسی شرکت"],["history","سابقه و اعتبار شرکت"],["tradingRules","قوانین معاملاتی و محدودیت‌ها"],["payoutRules","قوانین برداشت سود و بازگشت وجه"] ] as const;
const arrayFields=[ ["facts","مشخصات در یک نگاه",["label","value"]],["plans","جدول پلن‌ها و قیمت‌ها",["name","size","price","target","dailyLoss","maxLoss"]],["discounts","کدهای تخفیف",["code","amount","note"]],["faqs","سوالات متداول",["question","answer"]] ] as const;
type FieldKey="facts"|"plans"|"discounts"|"faqs";
export default function FirmDetailsAdmin() {
const [firms,setFirms]=useState<{id:string;name:string}[]>([]),[id,setId]=useState(""),[details,setDetails]=useState<FirmDetailsData>({...emptyDetails}),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[loadedId,setLoadedId]=useState("");
useEffect(() => {
  let active = true;
  fetch("/api/admin/firm-details", { cache: "no-store" })
    .then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error || "دریافت فهرست ناموفق بود"); return data; })
    .then(data => { if (!active) return; const items = Array.isArray(data.firms) ? data.firms : []; setFirms(items); if (items[0]) setId(items[0].id); })
    .catch(error => { if (active) setMessage(error.message); });
  return () => { active = false; };
}, []);
useEffect(() => {
  let active = true;
  const controller = new AbortController();
  setLoadedId("");
  if (!id) return () => { active = false; controller.abort(); };
  setBusy(true);
  fetch(`/api/admin/firm-details?id=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
    .then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error || "دریافت اطلاعات ناموفق بود"); return data; })
    .then(data => { if (active) { setDetails({ ...emptyDetails, ...data.details }); setLoadedId(id); setMessage(""); } })
    .catch(error => { if (active && error.name !== "AbortError") setMessage(error.message); })
    .finally(() => { if (active) setBusy(false); });
  return () => { active = false; controller.abort(); };
}, [id]);
function change(k:keyof FirmDetailsData,v:any){setDetails(d=>({...d,[k]:v}))}
async function save(){if(!id || loadedId!==id || busy)return;setBusy(true);setMessage("");try{const r=await fetch("/api/admin/firm-details",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,details})});const j=await r.json();if(!r.ok)throw Error(j.error);setMessage("اطلاعات بررسی شرکت ذخیره شد.")}catch(e){setMessage(e instanceof Error?e.message:"خطا در ذخیره")}finally{setBusy(false)}}
return <main dir="rtl" className="space-y-7 text-foreground"><h1 className="text-2xl font-extrabold">مدیریت بررسی کامل شرکت‌ها</h1><p className="text-sm text-muted">اطلاعات هر شرکت به‌صورت جداگانه در دیتابیس ذخیره می‌شود و در صفحه «مشاهده بیشتر» نمایش داده خواهد شد.</p><select disabled={busy} aria-label="انتخاب شرکت" className="w-full rounded-xl border border-border-theme bg-surface p-3" value={id} onChange={e=>setId(e.target.value)}><option value="">انتخاب شرکت</option>{firms.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select>{message&&<p role="status" className="rounded-xl border border-border-theme p-3">{message}</p>}{id && loadedId===id && <><section className="grid gap-4">{inputs.map(([key,label])=><label key={key} className="block rounded-xl border border-border-theme bg-surface p-4"><strong>{label}</strong><textarea className="mt-3 min-h-28 w-full rounded-lg border border-border-theme bg-background p-3" value={details[key]||""} onChange={e=>change(key,e.target.value)}/></label>)}</section><section className="rounded-xl border border-border-theme bg-surface p-4"><h2 className="mb-4 text-lg font-bold">مشخصات دقیق برای بررسی و مقایسه</h2><div className="grid gap-4 sm:grid-cols-2">{firmSpecificationFields.map(field=><label key={field.key} className="block text-sm"><span className="font-semibold">{field.label}</span><input className="mt-2 w-full rounded-lg border border-border-theme bg-background p-3 text-foreground" maxLength={500} value={details.specifications?.[field.key]||""} onChange={e=>change("specifications",{...details.specifications,[field.key]:e.target.value})} placeholder="ثبت نشده"/></label>)}</div></section>{([ ["pros","مزایا"],["cons","معایب"] ] as const).map(([key,label])=><section key={key} className="rounded-xl border border-border-theme bg-surface p-4"><h2 className="font-bold">{label}</h2><p className="text-xs text-muted">هر مورد در یک خط نوشته شود</p><textarea className="mt-2 min-h-24 w-full rounded-lg border border-border-theme bg-background p-3" value={(details[key]||[]).join("\n")} onChange={e=>change(key,e.target.value.split("\n").map(s=>s.trim()).filter(Boolean))}/></section>)}{arrayFields.map(([key,title,fields])=><section key={key} className="rounded-xl border border-border-theme bg-surface p-4"><h2 className="mb-4 text-lg font-bold">{title}</h2>{(details[key]||[]).map((item,i)=><div key={i} className="mb-3 flex flex-wrap gap-2 rounded-lg border border-border-theme p-3">{fields.map(field=><label key={field} className="min-w-32 flex-1 text-xs text-muted">{({label:"عنوان",value:"مقدار",name:"نام پلن",size:"اندازه حساب",price:"قیمت",target:"هدف سود",dailyLoss:"افت روزانه",maxLoss:"افت کل",code:"کد",amount:"مقدار تخفیف",note:"شرایط تخفیف",question:"سوال",answer:"پاسخ"} as Record<string,string>)[field]}<input className="mt-1 w-full rounded-lg border border-border-theme bg-background p-2 text-foreground" value={(item as unknown as Record<string,string>)[field]||""} onChange={e=>change(key,details[key].map((r,j)=>j===i?{...r,[field]:e.target.value}:r))}/></label>)}<button type="button" className="rounded-lg border border-danger px-3 text-danger" onClick={()=>change(key,details[key].filter((_,j)=>i!==j))}>حذف</button></div>)}<button type="button" className="rounded-lg border border-border-theme px-4 py-2" onClick={()=>change(key,[...(details[key]||[]),Object.fromEntries(fields.map(f=>[f,""]))])}>افزودن مورد</button></section>)}<button type="button" disabled={busy || loadedId!==id} onClick={save} className="rounded-xl bg-primary px-7 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy?"در حال ذخیره...":"ذخیره اطلاعات شرکت"}</button></>}</main>
}
