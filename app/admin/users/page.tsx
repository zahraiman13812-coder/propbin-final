"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  Search,
  Users,
} from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  reviews: number;
  spins: number;
  lastReviewAt: string | null;
  lastSpinAt: string | null;
};

function faDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(
      "fa-IR"
    );
  } catch {
    return value;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    fetch("/api/admin/users", {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "دریافت کاربران ناموفق بود."
          );
        }

        if (active) {
          setUsers(
            Array.isArray(data.users) ? data.users : []
          );
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "خطا در دریافت کاربران"
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      `${user.name} ${user.email}`
        .toLocaleLowerCase()
        .includes(query)
    );
  }, [users, search]);

  return (
    <div
      dir="rtl"
      className="min-w-0 space-y-6 text-foreground"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">
            کاربران سایت
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            هر کاربری که در سایت ثبت‌نام می‌کند، با نام و
            ایمیل در این بخش نمایش داده می‌شود.
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border-theme bg-surface p-4">
          <p className="text-xs text-muted">کل کاربران</p>
          <p className="mt-2 text-2xl font-extrabold">
            {users.length.toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="rounded-xl border border-border-theme bg-surface p-4">
          <p className="text-xs text-muted">
            کاربران دارای نظر
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {users
              .filter((user) => user.reviews > 0)
              .length.toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="rounded-xl border border-border-theme bg-surface p-4">
          <p className="text-xs text-muted">
            شرکت‌کنندگان قرعه‌کشی
          </p>
          <p className="mt-2 text-2xl font-extrabold">
            {users
              .filter((user) => user.spins > 0)
              .length.toLocaleString("fa-IR")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-theme bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <h2 className="font-bold">فهرست کاربران</h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              size={17}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="جست‌وجوی نام یا ایمیل..."
              className="h-11 w-full rounded-xl border border-border-theme bg-background pr-9 pl-3 text-sm text-foreground"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2
              size={19}
              className="animate-spin"
            />
            در حال بارگذاری...
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl bg-surface-secondary p-8 text-center text-sm text-muted">
            کاربری پیدا نشد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead className="bg-surface-secondary text-muted">
                <tr>
                  <th className="p-3">نام</th>
                  <th className="p-3">ایمیل</th>
                  <th className="p-3">تاریخ عضویت</th>
                  <th className="p-3">نظرات</th>
                  <th className="p-3">قرعه‌کشی</th>
                  <th className="p-3">آخرین فعالیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-border-theme"
                  >
                    <td className="p-3 font-semibold">
                      {user.name || "—"}
                    </td>
                    <td
                      dir="ltr"
                      className="p-3 text-right text-muted"
                    >
                      {user.email}
                    </td>
                    <td className="p-3 text-muted">
                      {faDate(user.createdAt)}
                    </td>
                    <td className="p-3">
                      {user.reviews.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-3">
                      {user.spins.toLocaleString("fa-IR")}
                    </td>
                    <td className="p-3 text-muted">
                      {faDate(
                        [user.lastSpinAt, user.lastReviewAt]
                          .filter((value): value is string => Boolean(value))
                          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
