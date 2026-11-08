
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import LotterySubmissionStatus from "./LotterySubmissionStatus";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  LogOut,
  MessageSquare,
  Save,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type Vote = {
  id: string;
  firmId: string;
  trust: number;
  support: number;
  payout: number;
  rules: number;
  comment: string;
  approved: boolean;
  featured: boolean;
  createdAt: string;
};

type Firm = {
  id: string;
  name: string;
};

type LotteryEntry = {
  code: string;
  createdAt: string;
  period: string;
};

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");

  const [votes, setVotes] = useState<Vote[]>([]);
  const [firms, setFirms] = useState<Firm[]>([]);

  const [lotteryEntry, setLotteryEntry] =
    useState<LotteryEntry | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const session = await fetch(
      "/api/user/session",
      {
        cache: "no-store",
        credentials: "same-origin",
      }
    );

    if (!session.ok) {
      throw new Error(
        "دریافت حساب ناموفق بود."
      );
    }

    const result = await session.json();

    if (!result.user) {
      router.replace("/login");
      return;
    }

    setUser(result.user);
    setName(result.user.name);

    const [reviews, content] = await Promise.all([
      fetch("/api/polls?mine=1", {
        cache: "no-store",
        credentials: "same-origin",
      }),
      fetch("/api/content", {
        cache: "no-store",
        credentials: "same-origin",
      }),
    ]);

    if (!reviews.ok || !content.ok) {
      throw new Error(
        "دریافت نظرات انجام نشد."
      );
    }

    const reviewData = await reviews.json();
    const contentData = await content.json();

    setVotes(reviewData.polls || []);
    setFirms(contentData.firms || []);

    // قرعه‌کشی مقاله‌ای مستقل از گردونه شانس است.
    const lotteryResponse = await fetch(
      "/api/lottery",
      {
        cache: "no-store",
        credentials: "same-origin",
      }
    );

    if (lotteryResponse.ok) {
      const lottery = await lotteryResponse.json();

      if (lottery.entry) {
        setLotteryEntry({
          ...lottery.entry,
          period: lottery.period,
        });
      } else {
        setLotteryEntry(null);
      }
    }
  }

  useEffect(() => {
    load()
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "خطا در بارگذاری"
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/user/session",
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "ذخیره انجام نشد."
        );
      }

      setUser(result.user);
      setName(result.user.name);

      setMessage(
        "نام نمایشی ذخیره شد."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ذخیره"
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteReview(id: string) {
    if (
      deleting ||
      !window.confirm(
        "این نظر حذف شود؟ پس از حذف می‌توانید دوباره برای شرکت امتیاز ثبت کنید."
      )
    ) {
      return;
    }

    setDeleting(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/polls",
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        }
      );

      if (!response.ok) {
        const result = await response.json();

        throw new Error(
          result.error ||
            "حذف انجام نشد."
        );
      }

      setVotes((current) =>
        current.filter(
          (vote) => vote.id !== id
        )
      );

      setMessage(
        "نظر با موفقیت حذف شد."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در حذف نظر"
      );
    } finally {
      setDeleting("");
    }
  }

  async function logout() {
    setBusy(true);

    try {
      const response = await fetch(
        "/api/user/session",
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(
          "خروج ناموفق بود."
        );
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError(
        "خروج از حساب انجام نشد."
      );
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-background px-4 py-20 text-center text-muted">
        در حال بارگذاری حساب...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] bg-background px-4 py-20 text-center">
        <p className="text-sm text-danger">
          {error ||
            "وارد حساب نشده‌اید."}
        </p>

        <Link
          href="/login"
          className="mt-4 inline-block text-primary"
        >
          ورود به حساب
        </Link>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12"
    >
      <div className="mx-auto max-w-[1050px] space-y-6">
        <LotterySubmissionStatus />
        {/* اطلاعات کلی حساب */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound size={29} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-extrabold sm:text-2xl">
                حساب کاربری پراپ‌بین
              </h1>

              <p
                dir="ltr"
                className="mt-2 break-all text-right text-sm text-muted"
              >
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger disabled:opacity-50"
          >
            <LogOut size={18} />
            خروج
          </button>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 p-4 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-xl bg-success/10 p-4 text-sm text-success"
          >
            {message}
          </p>
        )}

        {/* قرعه‌کشی مقاله‌ای حفظ شده است */}
        <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
          <h2 className="text-lg font-extrabold">
            🎟️ کد قرعه‌کشی مقاله‌ای من
          </h2>

          {lotteryEntry ? (
            <div className="mt-4">
              <p className="text-sm text-muted">
                دوره: {lotteryEntry.period}
              </p>

              <p
                className="mt-3 break-all font-mono font-bold text-primary"
                dir="ltr"
              >
                {lotteryEntry.code}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-7 text-muted">
              برای این دوره هنوز کد قرعه‌کشی
              دریافت نکرده‌ای.{" "}
              <Link
                href="/lottery"
                className="font-bold text-primary"
              >
                شرکت در قرعه‌کشی ←
              </Link>
            </p>
          )}
        </section>

        {/* اطلاعات پروفایل */}
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7 lg:col-span-2">
            <h2 className="text-lg font-bold">
              اطلاعات حساب
            </h2>

            <form
              onSubmit={saveProfile}
              className="mt-6 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  نام نمایشی
                </span>

                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="h-12 w-full rounded-xl border border-border-theme bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto"
              >
                <Save size={17} />
                ذخیره اطلاعات
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-border-theme bg-surface p-5">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 size={21} />

              <h2 className="font-bold text-foreground">
                ایمیل تأییدشده
              </h2>
            </div>

            <p className="mt-4 break-all text-sm leading-7 text-muted">
              {user.email}
            </p>

            <p className="mt-5 text-xs text-muted">
              تاریخ عضویت:{" "}
              {new Date(
                user.createdAt
              ).toLocaleDateString("fa-IR")}
            </p>
          </section>
        </div>

        {/* نظرات کاربر */}
        <section className="rounded-2xl border border-border-theme bg-surface p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare
                  size={21}
                  className="text-primary"
                />

                <h2 className="text-lg font-bold">
                  نظرات من
                </h2>
              </div>

              <p className="mt-2 text-xs text-muted">
                {votes.length.toLocaleString(
                  "fa-IR"
                )}{" "}
                نظر ثبت‌شده
              </p>
            </div>

            <Link
              href="/polls"
              className="rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-primary-foreground"
            >
              ثبت نظر جدید
            </Link>
          </div>

          {votes.length === 0 ? (
            <div className="rounded-xl bg-surface-secondary px-4 py-12 text-center">
              <MessageSquare
                size={35}
                className="mx-auto text-muted"
              />

              <p className="mt-4 text-sm text-muted">
                هنوز نظری ثبت نکرده‌ای.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {votes.map((vote) => {
                const firm = firms.find(
                  (item) =>
                    item.id === vote.firmId
                );

                const average =
                  (vote.trust +
                    vote.support +
                    vote.payout +
                    vote.rules) /
                  4;

                return (
                  <article
                    key={vote.id}
                    className="min-w-0 rounded-xl border border-border-theme bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-bold">
                        {firm?.name ||
                          vote.firmId}
                      </h3>

                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                          vote.approved
                            ? "bg-success/10 text-success"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {vote.approved ? (
                          <CheckCircle2
                            size={14}
                          />
                        ) : (
                          <Clock3
                            size={14}
                          />
                        )}

                        {vote.approved
                          ? "تأییدشده"
                          : "در انتظار بررسی"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Star
                        size={18}
                        className="fill-amber-400 text-amber-400"
                      />

                      <span className="text-sm font-bold">
                        {average.toLocaleString(
                          "fa-IR",
                          {
                            maximumFractionDigits: 1,
                          }
                        )}
                        /۵
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8 text-muted">
                      {vote.comment ||
                        "بدون متن نظر"}
                    </p>

                    {vote.featured &&
                      vote.approved && (
                        <p className="mt-3 text-xs font-semibold text-primary">
                          منتخب صفحه اصلی
                        </p>
                      )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-theme pt-4">
                      <span className="text-xs text-muted">
                        {new Date(
                          vote.createdAt
                        ).toLocaleDateString(
                          "fa-IR"
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={
                          deleting === vote.id
                        }
                        onClick={() =>
                          deleteReview(vote.id)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-50"
                      >
                        <Trash2 size={16} />

                        {deleting === vote.id
                          ? "در حال حذف..."
                          : "حذف نظر"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
