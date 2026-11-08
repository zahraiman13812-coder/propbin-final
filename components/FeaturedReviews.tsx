"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquareQuote } from "lucide-react";
import type { Firm, Poll } from "@/lib/content";

type Props = { polls: Poll[]; firms: Firm[]; title?: string };

export default function FeaturedReviews({ firms, polls, title = "امتیازدهی به شرکت‌ها" }: Props) {
  const [selected, setSelected] = useState("");
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const featured = (argumentsPolls: Poll[]) => argumentsPolls.filter(p => p.approved && p.featured && Boolean(p.comment?.trim()));
  const reviews = featured(polls);
  useEffect(() => {
    if (paused || reviews.length < 2) return;
    const timer = window.setInterval(() => setSlide(v => (v+1) % reviews.length), 4500);
    return () => window.clearInterval(timer);
  }, [paused, reviews.length]);
  return (
    <section dir="rtl" aria-label="ثبت نظرسنجی" className="border-t border-border-theme bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-primary"><MessageSquareQuote size={20} /><h2 className="text-2xl font-extrabold text-foreground">{title}</h2></div>
        <div className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-8">
          <label htmlFor="homepage-poll-firm" className="block font-bold">به کدام شرکت می‌خواهید امتیاز بدهید؟</label>
          <p className="mt-2 text-sm text-muted">شرکت را انتخاب کنید؛ سپس برای ثبت امتیاز و نظر به بخش نظرسنجی بروید.</p>
          <select id="homepage-poll-firm" value={selected} onChange={(event) => setSelected(event.target.value)}
            className="mt-5 h-12 w-full rounded-xl border border-border-theme bg-background px-4 text-foreground">
            <option value="">انتخاب شرکت از لیست</option>
            {firms.map((firm) => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
          </select>
          <Link href={selected ? `/polls?firm=${encodeURIComponent(selected)}` : "/polls"}
            onClick={(event) => { if (!selected) event.preventDefault(); }}
            aria-disabled={!selected}
            className={`mt-4 flex h-12 items-center justify-center rounded-xl text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "cursor-not-allowed bg-surface-secondary text-muted"}`}>
            ادامه و ثبت امتیاز و نظر
          </Link>
          {firms.length === 0 && <p className="mt-3 text-sm text-muted">هنوز شرکتی برای نظرسنجی موجود نیست.</p>}
        </div>
        {reviews.length > 0 && <div className="mt-10">
          <h3 className="mb-4 text-xl font-extrabold text-foreground">تریدرها چه می‌گویند؟ · نظرات منتخب</h3>
          <div aria-label="نظرات منتخب کاربران" className="overflow-hidden rounded-xl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
            <div className="flex transition-transform duration-700 ease-in-out" style={{direction:'rtl',transform:`translateX(${slide*100}%)`}}>
              {reviews.map((poll) => <article key={poll.id} className="w-full shrink-0 rounded-xl border border-border-theme bg-surface p-6" aria-hidden={reviews[slide]?.id !== poll.id}>
                <p className="mb-3 text-sm text-muted">{firms.find(f => f.id === poll.firmId)?.name || 'شرکت پراپ'} · {poll.displayName || 'تریدر'}</p>
                <p className="whitespace-pre-wrap text-foreground">{poll.comment}</p>
                <p className="mt-3 text-amber-500">{'★'.repeat(Math.round((poll.trust+poll.support+poll.payout+poll.rules)/4))}</p>
              </article>)}
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-2" aria-label="کنترل نظرات منتخب">
            {reviews.map((poll,index)=><button key={poll.id} aria-label={`نمایش نظر ${index+1}`} aria-current={index===slide} type="button" onClick={()=>setSlide(index)} className={`h-2 w-2 rounded-full ${index===slide?'bg-primary':'bg-surface-secondary'}`}/>)}
          </div>
        </div>}
      </div>
    </section>
  );
}
