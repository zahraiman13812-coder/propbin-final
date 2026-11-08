"use client";
import { useEffect, useState } from "react";

type Firm = { id: string; name: string; discount_intro: string };
type Discount = { id: string; firm_id: string; code: string; amount: string; description: string; sort_order: number };
const input = "min-w-0 w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm text-foreground";

export default function DiscountManager() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [items, setItems] = useState<Discount[]>([]);
  const [firmId, setFirmId] = useState("");
  const [intro, setIntro] = useState("");
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch("/api/admin/discount-items", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "خطا در دریافت تخفیف‌ها");
    setFirms(Array.isArray(d.firms) ? d.firms : []);
    setItems(Array.isArray(d.discounts) ? d.discounts : []);
  }
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, []);
  const current = firms.find(f => f.id === firmId);
  const currentCodes = items.filter(x => x.firm_id === firmId);

  function resetEditor() { setEditing(""); setCode(""); setAmount(""); setDescription(""); }
  function choose(id: string) { setFirmId(id); setIntro(firms.find(f => f.id === id)?.discount_intro || ""); resetEditor(); setMessage(""); }
  async function request(method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>) {
    const r = await fetch("/api/admin/discount-items", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "عملیات ناموفق بود");
    await load();
  }
  async function save(payload: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try { await request("POST", payload); setMessage("ذخیره شد."); return true; }
    catch (e) { setMessage(e instanceof Error ? e.message : "خطا در ذخیره"); return false; }
    finally { setBusy(false); }
  }
  async function del(id: string) {
    if (!window.confirm("این کد تخفیف حذف شود؟")) return;
    setBusy(true); setMessage("");
    try { await request("DELETE", { id }); setMessage("کد حذف شد."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "خطا در حذف"); }
    finally { setBusy(false); }
  }
  async function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (busy || next < 0 || next >= currentCodes.length) return;
    const reordered = [...currentCodes];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setBusy(true); setMessage("");
    try { await request("PATCH", { firmId, orderedIds: reordered.map(x => x.id) }); setMessage("ترتیب کدها ذخیره شد."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "خطا در جابه‌جایی کدها"); }
    finally { setBusy(false); }
  }

  return <main dir="rtl" className="mx-auto w-full min-w-0 max-w-5xl space-y-6 px-3 py-4 text-foreground sm:p-6 lg:p-8">
    <div><h1 className="text-xl font-extrabold sm:text-2xl">مدیریت تخفیف‌ها</h1><p className="mt-2 text-sm leading-7 text-muted">ترتیب شرکت‌ها مطابق «مدیریت شرکت‌های پراپ» است. با دکمه‌های بالا و پایین، ترتیب کدهای هر شرکت را تغییر بده.</p></div>
    <section className="rounded-2xl border border-border-theme bg-surface p-4 sm:p-5"><label htmlFor="discount-firm" className="mb-2 block text-sm">انتخاب شرکت</label><select id="discount-firm" className={input} value={firmId} onChange={e => choose(e.target.value)}><option value="">یک شرکت انتخاب کن</option>{firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></section>
    {current && <>
      <section className="space-y-3 rounded-2xl border border-border-theme bg-surface p-4 sm:p-5"><h2 className="font-bold">توضیحات زیر نام {current.name}</h2><textarea rows={3} maxLength={1000} className={input} value={intro} onChange={e => setIntro(e.target.value)} /><button type="button" disabled={busy} className="w-full rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50 sm:w-auto" onClick={() => void save({ action: "intro", firmId, intro })}>ذخیره توضیحات</button></section>
      <form className="space-y-3 rounded-2xl border border-border-theme bg-surface p-4 sm:p-5" onSubmit={async e => { e.preventDefault(); if (await save({ firmId, id: editing || undefined, code, amount, description })) resetEditor(); }}>
        <h2 className="font-bold">{editing ? "ویرایش کد تخفیف" : "افزودن کد تخفیف جدید"}</h2>
        <div className="grid gap-3 sm:grid-cols-2"><input required maxLength={100} placeholder="کد تخفیف" className={input} value={code} onChange={e => setCode(e.target.value)} /><input required maxLength={100} placeholder="میزان تخفیف (مثلاً ۲۰٪)" className={input} value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <textarea rows={2} maxLength={1000} placeholder="توضیح و شرایط استفاده از کد" className={input} value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex flex-col gap-2 sm:flex-row"><button disabled={busy} className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{editing ? "ذخیره ویرایش" : "افزودن کد"}</button>{editing && <button type="button" className="rounded-xl border border-border-theme px-5 py-3" onClick={resetEditor}>انصراف</button>}</div>
      </form>
      <section className="space-y-3"><h2 className="font-bold">کدهای ثبت‌شده</h2>{currentCodes.map((x, i) => <article key={x.id} className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-border-theme bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="min-w-0"><b dir="ltr" className="block break-all text-right text-sm sm:text-base">{x.code} — {x.amount}</b><p className="mt-1 whitespace-pre-wrap break-words text-xs leading-7 text-muted sm:text-sm">{x.description || "بدون توضیحات"}</p></div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <button type="button" disabled={busy || i === 0} aria-label={`انتقال ${x.code} به بالا`} onClick={() => void move(i, -1)} className="min-h-10 rounded-lg border border-border-theme px-3 py-2 text-sm disabled:opacity-40">↑ بالا</button>
          <button type="button" disabled={busy || i === currentCodes.length - 1} aria-label={`انتقال ${x.code} به پایین`} onClick={() => void move(i, 1)} className="min-h-10 rounded-lg border border-border-theme px-3 py-2 text-sm disabled:opacity-40">↓ پایین</button>
          <button type="button" disabled={busy} onClick={() => { setEditing(x.id); setCode(x.code); setAmount(x.amount); setDescription(x.description); }} className="min-h-10 rounded-lg border border-border-theme px-3 py-2 text-sm disabled:opacity-50">ویرایش</button>
          <button type="button" disabled={busy} onClick={() => void del(x.id)} className="min-h-10 rounded-lg border border-danger/30 px-3 py-2 text-sm text-danger disabled:opacity-50">حذف</button>
        </div>
      </article>)}{!currentCodes.length && <p className="text-sm text-muted">هنوز کدی ثبت نشده است.</p>}</section>
    </>}
    {message && <p role="status" className="break-words rounded-xl border border-border-theme p-4 text-sm">{message}</p>}
  </main>;
}
