
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  Eye,
  Star,
  Trash2,
  X,
} from "lucide-react";

type Poll = {
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
  displayName?: string;
};

type Firm = {
  id: string;
  name: string;
};

type ResponseData = {
  firms: Firm[];
  polls: Poll[];
};

export default function FeaturedAdminPage() {
  const [data, setData] =
    useState<ResponseData | null>(null);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/content", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("بارگذاری نظرات انجام نشد.");
    }

    const result: ResponseData =
      await response.json();

    setData(result);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "خطا در بارگذاری"
        );
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function updateVote(
    id: string,
    values: {
      approved?: boolean;
      featured?: boolean;
    }
  ) {
    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch("/api/polls", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          ...values,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "ویرایش انجام نشد."
        );
      }

      await load();
      setMessage("تغییرات ذخیره شدند.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "خطا در ذخیره"
      );
    } finally {
      setBusyId("");
    }
  }

  async function deleteVote(id: string) {
    if (
      !window.confirm(
        "این نظر برای همیشه حذف شود؟"
      )
    ) {
      return;
    }

    setBusyId(id);
    setMessage("");

    try {
      const response = await fetch("/api/polls", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || "حذف انجام نشد."
        );
      }

      await load();
      setMessage("نظر حذف شد.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "خطا در حذف"
      );
    } finally {
      setBusyId("");
    }
  }

  const polls = [...(data?.polls || [])].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  const featuredCount = polls.filter(
    (poll) => poll.approved && poll.featured
  ).length;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">
          مدیریت نظرات کاربران
        </h1>

        <p className="mt-3 text-sm leading-7 text-muted">
          نظرات را بررسی کن و موارد مناسب را
          برای نمایش در صفحه اصلی انتخاب کن.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          {
            label: "تمام نظرات",
            value: polls.length,
          },
          {
            label: "تأییدشده",
            value: polls.filter(
              (poll) => poll.approved
            ).length,
          },
          {
            label: "منتخب",
            value: featuredCount,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-xl border border-border-theme bg-surface p-4"
          >
            <p className="text-xs text-muted">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {item.value.toLocaleString("fa-IR")}
            </p>
          </div>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className="rounded-xl border border-border-theme bg-surface-secondary p-4 text-sm text-foreground"
        >
          {message}
        </p>
      )}

      {loading && (
        <p className="text-sm text-muted">
          در حال بارگذاری...
        </p>
      )}

      {!loading && polls.length === 0 && (
        <div className="rounded-xl border border-border-theme bg-surface p-8 text-center text-sm text-muted">
          هنوز نظری برای بررسی ثبت نشده است.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {polls.map((poll) => {
          const firm = data?.firms.find(
            (item) => item.id === poll.firmId
          );

          const average =
            (poll.trust +
              poll.support +
              poll.payout +
              poll.rules) /
            4;

          const busy = busyId === poll.id;

          return (
            <article
              key={poll.id}
              className="min-w-0 rounded-2xl border border-border-theme bg-surface p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold text-foreground">
                    {firm?.name || poll.firmId}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {poll.displayName ||
                      "کاربر سایت"}
                  </p>
                </div>

                <span
                  className={`rounded-lg px-3 py-1 text-xs ${
                    poll.approved
                      ? "bg-success/10 text-success"
                      : "bg-surface-secondary text-muted"
                  }`}
                >
                  {poll.approved
                    ? "تأیید شده"
                    : "در انتظار بررسی"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Star
                  size={19}
                  className="fill-amber-400 text-amber-400"
                />
                <span className="font-bold">
                  {average.toFixed(1)}
                </span>
                <span className="text-xs text-muted">
                  از ۵
                </span>
              </div>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-8 text-foreground">
                {poll.comment || "بدون متن نظر"}
              </p>

              <div className="mt-4 text-xs text-muted">
                {new Date(
                  poll.createdAt
                ).toLocaleDateString("fa-IR")}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-border-theme pt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    updateVote(poll.id, {
                      approved: !poll.approved,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-border-theme bg-surface-secondary px-3 py-2 text-xs text-foreground disabled:opacity-50"
                >
                  {poll.approved ? (
                    <X size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  {poll.approved
                    ? "لغو تأیید"
                    : "تأیید نظر"}
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !poll.approved ||
                    (!poll.featured &&
                      !poll.comment.trim())
                  }
                  onClick={() =>
                    updateVote(poll.id, {
                      featured: !poll.featured,
                    })
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs disabled:opacity-40 ${
                    poll.featured
                      ? "bg-amber-500/15 text-amber-500"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Eye size={16} />
                  {poll.featured
                    ? "حذف از صفحه اصلی"
                    : "نمایش در صفحه اصلی"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    deleteVote(poll.id)
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
