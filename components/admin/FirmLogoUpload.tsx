"use client";

import { useState } from "react";

export default function FirmLogoUpload({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [error, setError] = useState("");
  async function select(file?: File) {
    if (!file) return;
    setError("");
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type)) || file.size > 100 * 1024) {
      setError("فقط PNG، JPG یا WEBP با حجم حداکثر ۱۰۰ کیلوبایت مجاز است.");
      return;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPng = bytes.length > 8 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
    const isJpg = bytes.length > 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const isWebp = bytes.length > 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
    if (!(file.type === "image/png" && isPng || file.type === "image/jpeg" && isJpg || file.type === "image/webp" && isWebp)) {
      setError("محتوای فایل با فرمت تصویر مطابقت ندارد."); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.onerror = () => setError("خواندن تصویر ناموفق بود.");
    reader.readAsDataURL(file);
  }
  return <div className="rounded-2xl border border-border-theme bg-surface p-5 space-y-3">
    <p className="text-sm font-bold">لوگوی شرکت (اختیاری)</p>
    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void select(e.target.files?.[0])} className="block w-full text-sm text-foreground" />
    <p className="text-xs text-muted">تصویر PNG، JPG یا WEBP تا ۱۰۰ کیلوبایت. در دیتابیس ذخیره می‌شود و در بررسی پراپ‌ها و تخفیف‌ها نمایش داده می‌شود.</p>
    {value && <div className="flex items-center gap-3"><img src={value} alt="پیش‌نمایش لوگو" className="h-16 w-16 rounded-xl object-contain" /><button type="button" onClick={()=>onChange("")} className="text-sm text-danger">حذف لوگو</button></div>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
