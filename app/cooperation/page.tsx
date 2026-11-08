import { initialContent } from "@/lib/content";
import { getSiteSettings } from "@/lib/supabase-site-settings";
export const dynamic = "force-dynamic";
export const metadata = { title: "همکاری با ما" };
export default async function CooperationPage() {
  const settings = await getSiteSettings(initialContent.settings);
  const raw = settings.cooperationTelegram.trim();
  const handle = raw.replace(/^@/, "");
  const link = /^https:\/\/(t\.me|telegram\.me)\//i.test(raw) ? raw : /^[A-Za-z0-9_]{5,32}$/.test(handle) ? `https://t.me/${handle}` : "";
  return <main dir="rtl" className="page-shell"><div className="container mx-auto max-w-3xl py-16"><div className="rounded-3xl border border-border-theme bg-surface p-8 sm:p-12"><h1 className="text-3xl font-extrabold text-foreground underline underline-offset-8 decoration-primary">همکاری با ما</h1><p className="mt-8 leading-8 text-muted">برای همکاری، پیشنهادهای تجاری و ارتباط با تیم پراپ‌بین از طریق تلگرام پیام دهید.</p>{link ? <a href={link} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">ارتباط از طریق تلگرام: {raw}</a> : <p className="mt-6 text-muted">راه ارتباطی به‌زودی توسط مدیر سایت ثبت می‌شود.</p>}</div></div></main>;
}
