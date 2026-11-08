"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Firm } from "@/lib/data";
import FirmCard from "@/components/FirmCard";

const INTERVAL_MS = 5500;

export default function HomeFirmCarousel({ firms }: { firms: Firm[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const activeIndex = useRef(0);
  const interacting = useRef(false);
  const [index, setIndex] = useState(0);

  const visibleCount = useCallback(() => {
    if (typeof window === "undefined") return 3;
    return window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
  }, []);

  const move = useCallback((direction: number) => {
    const container = rail.current;
    if (!container || firms.length <= 1) return;
    const maxIndex = Math.max(0, firms.length - visibleCount());
    const next = activeIndex.current + direction;
    const target = next > maxIndex ? 0 : next < 0 ? maxIndex : next;
    activeIndex.current = target;
    setIndex(target);
    const card = container.firstElementChild as HTMLElement | null;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(container).columnGap || "16") || 16;
    // In RTL scroll containers, the horizontal scroll offset is negative.
    container.scrollTo({ left: -(card.getBoundingClientRect().width + gap) * target, behavior: "smooth" });
  }, [firms.length, visibleCount]);

  useEffect(() => {
    if (firms.length <= 1) return;
    const timer = window.setInterval(() => {
      if (interacting.current || document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      move(1);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [firms.length, move]);

  useEffect(() => {
    const adjust = () => {
      const max = Math.max(0, firms.length - visibleCount());
      if (activeIndex.current > max) {
        activeIndex.current = max;
        setIndex(max);
      }
      const container = rail.current;
      const card = container?.firstElementChild as HTMLElement | undefined;
      if (container && card) {
        const gap = parseFloat(getComputedStyle(container).columnGap || "16") || 16;
        container.scrollLeft = -(card.getBoundingClientRect().width + gap) * activeIndex.current;
      }
    };
    window.addEventListener("resize", adjust);
    return () => window.removeEventListener("resize", adjust);
  }, [firms.length, visibleCount]);

  if (firms.length === 0) return <p className="text-sm text-muted">هنوز شرکتی ثبت نشده است.</p>;

  return (
    <div dir="rtl" className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">شرکت‌ها را با دکمه‌ها یا کشیدن کارت‌ها جابه‌جا کن</span>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" aria-label="شرکت قبلی" onClick={() => move(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-theme bg-surface text-foreground hover:border-primary">
            <ChevronRight size={19} />
          </button>
          <button type="button" aria-label="شرکت بعدی" onClick={() => move(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-theme bg-surface text-foreground hover:border-primary">
            <ChevronLeft size={19} />
          </button>
        </div>
      </div>
      <div ref={rail}
        aria-label="شرکت‌های پراپ"
        onMouseEnter={() => { interacting.current = true; }}
        onMouseLeave={() => { interacting.current = false; }}
        onFocusCapture={() => { interacting.current = true; }}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) interacting.current = false; }}
        onTouchStart={() => { interacting.current = true; }}
        onTouchEnd={() => { interacting.current = false; }}
        onPointerDown={() => { interacting.current = true; }}
        onPointerUp={() => { interacting.current = false; }}
        className="grid auto-cols-[100%] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-2 sm:auto-cols-[calc((100%-1rem)/2)] lg:auto-cols-[calc((100%-2rem)/3)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollBehavior: "smooth" }}>
        {firms.map(firm => (
          <div key={firm.id} className="min-w-0 snap-start h-full"><FirmCard firm={firm} /></div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted" aria-live="off">
        {Math.min(index + 1, firms.length).toLocaleString("fa-IR")} از {firms.length.toLocaleString("fa-IR")}
      </p>
    </div>
  );
}
