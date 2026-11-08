"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Headphones,
  Loader2,
  LogIn,
  Send,
  X,
} from "lucide-react";

import type { SupportThread } from "@/lib/support-types";

type Session = {
  id: string;
  name: string;
  email: string;
};

function clock(value: string) {
  try {
    return new Date(value).toLocaleTimeString(
      "fa-IR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "";
  }
}

export default function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<Session | null>(
    null
  );
  const [sessionReady, setSessionReady] =
    useState(false);
  const [thread, setThread] =
    useState<SupportThread | null>(null);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function load(markRead = false, showLoading = false) {
    if (showLoading) setLoading(true);

    try {
      const response = await fetch(
        `/api/support${
          markRead ? "?markRead=1" : ""
        }`,
        { cache: "no-store" }
      );

      if (response.status === 401) {
        setUser(null);
        setThread(null);
        setUnread(0);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "دریافت پشتیبانی ناموفق بود."
        );
      }

      setThread(data.thread || null);
      setUnread(data.unread || 0);
      if (data.user) setUser(data.user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در دریافت پشتیبانی"
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/user/session", {
      cache: "no-store",
    })
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then((data) => {
        if (!active) return;
        setUser(data?.user || null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!sessionReady || !user) return;

    void load(false);

    const timer = window.setInterval(() => {
      if (!open) void load(false);
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [sessionReady, user, open]);

  useEffect(() => {
    if (!open) return;

    void load(true, true);

    const timer = window.setInterval(() => {
      void load(true);
    }, 8000);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [open, thread?.messages.length]);

  async function send() {
    const message = text.trim();

    if (!message || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "ارسال پیام انجام نشد."
        );
      }

      setThread(data.thread || null);
      setText("");
      setUnread(0);
      await load(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ارسال پیام"
      );
    } finally {
      setBusy(false);
    }
  }

  const messages = thread?.messages || [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          open ? "بستن پشتیبانی" : "باز کردن پشتیبانی"
        }
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform hover:-translate-y-1"
      >
        {open ? (
          <X size={24} />
        ) : (
          <Headphones size={24} />
        )}

        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-danger px-1 text-[10px] font-bold text-white">
            {unread.toLocaleString("fa-IR")}
          </span>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="پشتیبانی پراپ‌بین"
          className="fixed bottom-24 right-5 z-[95] flex max-h-[min(640px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border-theme bg-surface text-foreground shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-theme bg-surface-secondary px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Headphones size={19} />
              </span>

              <div>
                <p className="text-sm font-bold">
                  پشتیبانی پراپ‌بین
                </p>
                <p className="mt-0.5 text-[10px] text-muted">
                  پاسخگوی سؤالات شما هستیم
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن پشتیبانی"
              className="rounded-lg p-2 text-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="min-h-40 flex-1 space-y-3 overflow-y-auto bg-background/40 p-4"
          >
            {!sessionReady ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                در حال بارگذاری...
              </div>
            ) : !user ? (
              <div className="rounded-xl border border-border-theme bg-surface p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <LogIn
                    size={18}
                    className="text-primary"
                  />
                  برای گفتگو وارد شو
                </div>
                <p className="mt-3 text-xs leading-7 text-muted">
                  پشتیبانی برای کاربران واردشده فعال است.
                  با ایمیل خود وارد شو و پیامت را بفرست.
                </p>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-4 flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
                >
                  ورود / ثبت‌نام
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-theme bg-surface p-4 text-center text-xs leading-7 text-muted">
                سلام! هر سؤالی درباره پراپ، تخفیف‌ها یا
                حساب کاربری داری همین‌جا بنویس.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-6 ${
                      message.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm border border-border-theme bg-surface text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.text}
                    </p>
                    <p
                      className={`mt-1 text-[9px] ${
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted"
                      }`}
                    >
                      {clock(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}

            {loading && messages.length > 0 && (
              <p className="text-center text-[10px] text-muted">
                در حال به‌روزرسانی...
              </p>
            )}
          </div>

          {user && (
            <div className="border-t border-border-theme p-3">
              {error && (
                <p
                  role="alert"
                  className="mb-2 rounded-lg bg-danger/10 p-2 text-[10px] text-danger"
                >
                  {error}
                </p>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={2}
                  maxLength={2000}
                  value={text}
                  onChange={(event) =>
                    setText(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="پیام خود را بنویس..."
                  className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-border-theme bg-background px-3 py-2 text-xs leading-6 text-foreground outline-none focus:border-primary"
                />

                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy || !text.trim()}
                  aria-label="ارسال پیام"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
