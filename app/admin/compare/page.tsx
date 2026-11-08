"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { firmSpecificationFields } from "@/lib/firm-specifications";

type Firm = { id: string; name: string };
type Row = { id: string; label: string; row_key: string | null; position: number; is_visible: boolean; values_json: Record<string, string> };
type Draft = { label: string; values: Record<string, string>; visible: boolean };

const basic = [
  { key: "rating", label: "امتیاز کاربران" },
  { key: "capital", label: "حداکثر سرمایه" },
  { key: "profit", label: "سهم سود" },
  { key: "fee", label: "هزینه شروع" },
  { key: "code", label: "کد تخفیف" },
  { key: "discount", label: "میزان تخفیف" },
  { key: "challenge", label: "نوع چالش" },
  { key: "payout", label: "پرداخت سود" },
];
const standard = [...basic, ...firmSpecificationFields];
const input = "w-full min-w-0 rounded-lg border border-border-theme bg-background p-2.5 text-sm text-foreground outline-none focus:border-primary";

export default function CompareAdmin() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [defaults, setDefaults] = useState<Record<string, Record<string, string>>>({});
  const [newLabel, setNewLabel] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"main" | "special" | "custom">("main");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch("/api/compare-rows", { cache: "no-store" }),
      fetch("/api/firms", { cache: "no-store" }),
    ]);
    const [rowResult, firmResult] = await Promise.all([a.json(), b.json()]);
    if (!a.ok || !b.ok || !firmResult.success) throw new Error(rowResult.error || firmResult.error || "دریافت اطلاعات ناموفق بود");
    const nextRows: Row[] = Array.isArray(rowResult.rows) ? rowResult.rows : [];
    const nextFirms: Firm[] = Array.isArray(firmResult.firms) ? firmResult.firms : [];
    setRows(nextRows);
    setFirms(nextFirms);
    setDefaults(Object.fromEntries(nextFirms.map(f => [f.id, f as unknown as Record<string, string>])));
    setDrafts(Object.fromEntries(nextRows.map(r => [r.row_key || `custom:${r.id}`, { label: r.label, values: r.values_json || {}, visible: r.is_visible }])));
  }, []);

  useEffect(() => { void load().catch(e => setError(e instanceof Error ? e.message : "خطا")); }, [load]);
  const rowMap = useMemo(() => new Map(rows.filter(r => r.row_key).map(r => [r.row_key, r])), [rows]);
  const customRows = rows.filter(r => !r.row_key);

  function draftFor(key: string, label: string, row?: Row): Draft {
    return drafts[key] || { label: row?.label || label, values: row?.values_json || {}, visible: row?.is_visible ?? true };
  }
  function edit(key: string, label: string, row: Row | undefined, patch: Partial<Draft>) {
    setDrafts(prev => ({ ...prev, [key]: { ...draftFor(key, label, row), ...patch } }));
  }

  async function request(method: "POST" | "PATCH" | "DELETE", payload: object) {
    const response = await fetch("/api/admin/compare-rows", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "عملیات ناموفق بود");
    return data;
  }
  async function saveStandard(key: string, label: string, position: number) {
    setBusy(true); setError(""); setMessage("");
    try {
      const previous = rowMap.get(key);
      const draft = draftFor(key, label, previous);
      const id = previous?.id || (await request("POST", { rowKey: key, label: draft.label, position })).id;
      await request("PATCH", { id, label: draft.label, isVisible: draft.visible, values: draft.values });
      await load(); setMessage(`ردیف «${label}» ذخیره شد.`);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در ذخیره"); }
    finally { setBusy(false); }
  }
  async function saveCustom(row: Row) {
    setBusy(true); setError(""); setMessage("");
    try {
      const draft = draftFor(`custom:${row.id}`, row.label, row);
      await request("PATCH", { id: row.id, label: draft.label, isVisible: draft.visible, values: draft.values });
      await load(); setMessage("ردیف اختصاصی ذخیره شد.");
    } catch(e) { setError(e instanceof Error ? e.message : "خطا در ذخیره"); }
    finally { setBusy(false); }
  }
  async function addCustom() {
    const label = newLabel.trim(); if (!label) return;
    setBusy(true); setError(""); setMessage("");
    try { await request("POST", { label, position: 1000 + customRows.length }); await load(); setNewLabel(""); setTab("custom"); setMessage("ردیف جدید ساخته شد. مقدار هر شرکت را وارد و ذخیره کن."); }
    catch(e) { setError(e instanceof Error ? e.message : "خطا در افزودن"); }
    finally { setBusy(false); }
  }
  async function deleteCustom(row: Row) {
    if (!window.confirm(`ردیف «${row.label}» حذف شود؟`)) return;
    setBusy(true); setError("");
    try { await request("DELETE", { id: row.id }); await load(); setMessage("ردیف حذف شد."); }
    catch(e) { setError(e instanceof Error ? e.message : "خطا در حذف"); }
    finally { setBusy(false); }
  }
  function editor(key: string, label: string, row: Row | undefined, position: number, custom = false) {
    const draftKey = custom && row ? `custom:${row.id}` : key;
    const draft = draftFor(draftKey, label, row);
    return (
      <section key={draftKey} className="min-w-0 rounded-2xl border border-border-theme bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input aria-label="عنوان معیار" maxLength={80} value={draft.label} onChange={e => edit(draftKey, label, row, { label: e.target.value })} className={`${input} max-w-md flex-1 font-bold`} />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.visible} onChange={e => edit(draftKey, label, row, { visible: e.target.checked })} /> نمایش در سایت</label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map(f => <label key={f.id} className="min-w-0 text-xs font-semibold"><span className="mb-1 block">{f.name}</span>
            <textarea rows={2} maxLength={300} className={`${input} resize-y`} placeholder={custom ? "مقدار این شرکت" : `پیش‌فرض: ${defaults[f.id]?.[key] || "ثبت نشده"}`} value={draft.values[f.id] ?? ""} onChange={e => edit(draftKey, label, row, { values: { ...draft.values, [f.id]: e.target.value } })} />
          </label>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !draft.label.trim()} onClick={() => custom && row ? void saveCustom(row) : void saveStandard(key, label, position)} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">ذخیره این ردیف</button>
          {custom && row && <button type="button" disabled={busy} onClick={() => void deleteCustom(row)} className="rounded-lg border border-danger/40 px-4 py-2.5 text-xs font-bold text-danger">حذف ردیف</button>}
        </div>
      </section>
    );
  }
  const items = tab === "main" ? basic : tab === "special" ? firmSpecificationFields : [];
  const filtered = items.filter(x => x.label.includes(search) || x.key.includes(search));
  return <main dir="rtl" className="min-w-0 space-y-5 text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">مدیریت مقایسه پراپ‌ها</h1><p className="mt-2 text-sm text-muted">اطلاعات هر شرکت را برای جدول مقایسه وارد کن. مقدارهای ثبت‌شده در اینجا در اولویت نمایش هستند و اطلاعات اصلی شرکت حذف نمی‌شوند.</p></div><Link href="/compare" target="_blank" className="rounded-xl border border-border-theme px-4 py-2 text-sm">مشاهده صفحه مقایسه</Link></div>
    {error && <p role="alert" className="rounded-lg border border-danger/40 p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-border-theme p-3 text-sm">{message}</p>}
    <div className="flex flex-wrap gap-2">{([{id:"main",label:"معیارهای اصلی (۸)"},{id:"special",label:"مشخصات تخصصی (۳۲)"},{id:"custom",label:"ردیف‌های دلخواه"}] as const).map(t=><button key={t.id} type="button" onClick={()=>{setTab(t.id);setSearch("")}} className={`rounded-lg border px-4 py-2 text-sm ${tab===t.id?"border-primary bg-primary text-primary-foreground":"border-border-theme bg-surface"}`}>{t.label}</button>)}</div>
    {tab !== "custom" && <input className={input} value={search} onChange={e=>setSearch(e.target.value)} placeholder="جست‌وجوی معیار..." />}
    {tab === "custom" ? <><section className="rounded-2xl border border-border-theme bg-surface p-4"><h2 className="font-bold">افزودن ردیف دلخواه</h2><div className="mt-3 flex flex-wrap gap-2"><input value={newLabel} maxLength={80} onChange={e=>setNewLabel(e.target.value)} placeholder="مثلاً پشتیبانی فارسی" className={`${input} flex-1`} /><button disabled={busy || !newLabel.trim()} onClick={()=>void addCustom()} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">افزودن ردیف</button></div></section>{customRows.map(r=>editor(`custom:${r.id}`,r.label,r,r.position,true))}{!customRows.length && <p className="text-sm text-muted">هنوز ردیف دلخواهی ثبت نشده است.</p>}</> : filtered.map((field,i) => editor(field.key, field.label, rowMap.get(field.key), (tab === "main" ? 0 : basic.length) + i))}
  </main>;
}
