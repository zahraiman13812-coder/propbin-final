"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Headphones,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";

import type {
  SupportMessage,
  SupportThread,
} from "@/lib/support-types";

function clock(value: string) {
  try {
    return new Date(value).toLocaleString(
      "fa-IR",
      {
        dateStyle: "short",
        timeStyle: "short",
      }
    );
  } catch {
    return value;
  }
}

function unreadCount(thread: SupportThread) {
  return thread.messages.filter(
    (message) =>
      message.role === "user" &&
      !message.readByAdmin
  ).length;
}

export default function AdminSupportPage() {
  const [threads, setThreads] = useState<
    SupportThread[]
  >([]);
  const [selected, setSelected] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (markThread?: string) => {
      const query = new URLSearchParams({
        all: "1",
      });

      if (markThread) {
        query.set("thread", markThread);
        query.set("markRead", "1");
      }

      const response = await fetch(
        `/api/support?${query.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "دریافت گفتگوها ناموفق بود."
        );
      }

      const list: SupportThread[] =
        Array.isArray(data.threads)
          ? data.threads
          : [];

      setThreads(list);

      setSelected((current) => {
        if (
          current &&
          list.some((thread) => thread.id === current)
        ) {
          return current;
        }

        return list[0]?.id || "";
      });
    },
    []
  );

  useEffect(() => {
    load()
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "خطا در بارگذاری"
        )
      )
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 12000);

    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!selected) return;

    void load(selected);

    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [selected, load]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [threads, selected]);

  const thread = useMemo(
    () =>
      threads.find((item) => item.id === selected) ||
      null,
    [threads, selected]
  );

  async function send() {
    const message = text.trim();

    if (!thread || !message || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: thread.id,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "ارسال پاسخ انجام نشد."
        );
      }

      setText("");
      await load(thread.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ارسال پاسخ"
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeThread() {
    if (!thread || busy) return;
    if (!window.confirm("این گفتگو و تمام پیام‌های آن برای همیشه حذف شوند؟")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/support", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "حذف گفتگو انجام نشد.");
      setSelected("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف گفتگو");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted">
        <Loader2
          size={20}
          className="animate-spin"
        />
        در حال بارگذاری گفتگوها...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-w-0 space-y-5 text-foreground"
    >
      <div>
        <h1 className="text-2xl font-extrabold">
          پشتیبانی کاربران
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted">
          پیام‌های کاربران را ببین و از همین‌جا پاسخ بده.
          پاسخ تو بلافاصله در ویجت پشتیبانی سایت نمایش
          داده می‌شود.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-border-theme bg-surface p-10 text-center text-sm text-muted">
          <Headphones
            size={34}
            className="mx-auto text-muted"
          />
          <p className="mt-4">
            هنوز هیچ کاربری پیامی به پشتیبانی نفرستاده
            است.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[560px] gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border-theme bg-surface p-2">
            {threads.map((item) => {
              const unread = unreadCount(item);
              const last =
                item.messages[item.messages.length - 1];

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={`mb-1 w-full rounded-xl p-3 text-right transition-colors ${
                    selected === item.id
                      ? "bg-primary/10"
                      : "hover:bg-surface-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">
                      {item.name || "کاربر پراپ‌بین"}
                    </span>

                    {unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                        {unread.toLocaleString("fa-IR")}
                      </span>
                    )}
                  </div>

                  <p
                    dir="ltr"
                    className="mt-1 truncate text-right text-[10px] text-muted"
                  >
                    {item.email}
                  </p>

                  <p className="mt-1.5 line-clamp-1 text-[11px] text-muted">
                    {last?.text || "بدون پیام"}
                  </p>
                </button>
              );
            })}
          </aside>

          <section className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border-theme bg-surface">
            {thread ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-border-theme bg-surface-secondary px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {thread.name || "کاربر پراپ‌بین"}
                    </p>
                    <p
                      dir="ltr"
                      className="mt-1 truncate text-right text-[10px] text-muted"
                    >
                      {thread.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[10px] text-muted">{clock(thread.updatedAt)}</span>
                    <button type="button" onClick={() => void removeThread()} disabled={busy}
                      title="حذف گفتگو و پیام‌ها" aria-label="حذف گفتگو"
                      className="inline-flex items-center gap-1 rounded-lg border border-danger/30 px-2 py-1.5 text-xs text-danger disabled:opacity-40">
                      <Trash2 size={15} /> حذف
                    </button>
                  </div>
                </div>

                <div
                  ref={scrollRef}
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-background/40 p-4"
                >
                  {thread.messages.length === 0 && (
                    <p className="py-12 text-center text-xs text-muted">
                      پیامی وجود ندارد.
                    </p>
                  )}

                  {thread.messages.map(
                    (message: SupportMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "admin"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-6 ${
                            message.role === "admin"
                              ? "rounded-tl-sm bg-primary text-primary-foreground"
                              : "rounded-tr-sm border border-border-theme bg-surface text-foreground"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                          <p
                            className={`mt-1 text-[9px] ${
                              message.role === "admin"
                                ? "text-primary-foreground/70"
                                : "text-muted"
                            }`}
                          >
                            {clock(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="border-t border-border-theme p-3">
                  <div className="flex items-end gap-2">
                    <textarea
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
                      placeholder="پاسخ خود را بنویس..."
                      className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-border-theme bg-background px-3 py-2 text-xs leading-6 text-foreground outline-none focus:border-primary"
                    />

                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={busy || !text.trim()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
                      aria-label="ارسال پاسخ"
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
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted">
                یک گفتگو را انتخاب کن.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
