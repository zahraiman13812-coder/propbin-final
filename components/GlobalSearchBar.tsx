
"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  GitCompareArrows,
  Search,
  TicketPercent,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

const quickLinks = [
  {
    title: "بررسی پراپ‌ها",
    href: "/firms",
    icon: Building2,
  },
  {
    title: "مقایسه شرکت‌ها",
    href: "/compare",
    icon: GitCompareArrows,
  },
  {
    title: "کدهای تخفیف",
    href: "/discounts",
    icon: TicketPercent,
  },
  {
    title: "مقالات",
    href: "/articles",
    icon: BookOpen,
  },
];

export default function GlobalSearchBar() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);

      document.body.style.overflow =
        originalOverflow;

      triggerRef.current?.focus();
    };
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = query.trim();

    if (!value) return;

    close();

    router.push(
      `/search?q=${encodeURIComponent(value)}`
    );
  }

  const dialog = (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/65 p-4 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        ref={dialogRef}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]'
          ) ?? []).filter(item => !item.hidden && item.getClientRects().length > 0);
          const first = items[0], last = items[items.length - 1];
          if (!first || !last) return;
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="جست‌وجو در پراپ‌بین"
        className="my-auto w-full max-w-[590px] overflow-hidden rounded-2xl border border-border-theme bg-surface text-foreground shadow-2xl"
      >
        <form
          onSubmit={submit}
          role="search"
          className="flex items-center gap-3 border-b border-border-theme px-4 py-4 sm:px-5"
        >
          <Search
            size={22}
            className="shrink-0 text-primary"
          />

          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            maxLength={100}
            placeholder="نام پراپ، مقاله یا کد تخفیف..."
            aria-label="عبارت جست‌وجو"
            autoComplete="off"
            className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted sm:text-base [&::-webkit-search-cancel-button]:hidden"
          />

          {/* تنها دکمه ضربدر */}
          <button
            type="button"
            onClick={close}
            aria-label="بستن جست‌وجو"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted transition-colors hover:text-foreground"
          >
            <X size={18} />
          </button>
        </form>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted">
              دسترسی سریع
            </span>

            <span className="hidden text-[10px] text-muted sm:block">
              برای خروج ESC را بزنید
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="group flex items-center gap-3 rounded-xl border border-border-theme bg-background p-3 transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} />
                  </div>

                  <span className="min-w-0 flex-1 text-xs font-semibold">
                    {item.title}
                  </span>

                  <ArrowLeft
                    size={15}
                    className="text-muted transition-transform group-hover:-translate-x-1 group-hover:text-primary"
                  />
                </Link>
              );
            })}
          </div>

          {query.trim() && (
            <button
              type="button"
              onClick={() => {
                const value = query.trim();
                close();
                router.push(
                  `/search?q=${encodeURIComponent(value)}`
                );
              }}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3 text-right text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <span className="truncate">
                جست‌وجوی «{query.trim()}»
              </span>

              <ArrowLeft size={18} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-theme bg-surface-secondary px-4 py-3 text-[10px] text-muted sm:px-5">
          <span>جست‌وجوی سریع در پراپ‌بین</span>
          <span className="hidden sm:inline">
            ENTER برای جست‌وجو
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="باز کردن جست‌وجو"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border-theme bg-surface px-3 text-foreground transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Search
          size={19}
          className="transition-transform group-hover:scale-110"
        />

        <span className="hidden text-xs font-medium text-muted lg:inline">
          جست‌وجو
        </span>

        <span className="hidden rounded-md border border-border-theme px-1.5 py-0.5 text-[10px] text-muted xl:inline">
          Ctrl K
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(dialog, document.body)}
    </>
  );
}
