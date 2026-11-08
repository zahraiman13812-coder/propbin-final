
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  firmId: string;
  firmName: string;
  isActive: boolean;
};

type DeleteResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export default function DeleteFirmButton({
  firmId,
  firmName,
  isActive,
}: Props) {
  const router = useRouter();

  const [confirmId, setConfirmId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (isActive) {
    return (
      <span
        title="برای حذف شرکت، ابتدا آن را غیرفعال کنید."
        className="text-xs text-muted"
      >
        حذف غیرفعال است
      </span>
    );
  }

  function closeConfirm() {
    if (deleting) return;

    setShowConfirm(false);
    setConfirmId("");
    setError("");
  }

  async function deleteFirm() {
    if (deleting || confirmId !== firmId) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/firms/${encodeURIComponent(firmId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmId,
          }),
        }
      );

      const result =
        (await response.json()) as DeleteResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "حذف شرکت ناموفق بود."
        );
      }

      setShowConfirm(false);
      setConfirmId("");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در حذف شرکت"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirmId("");
          setError("");
          setShowConfirm(true);
        }}
        className="rounded-lg border border-red-500/30 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-500/10"
      >
        حذف
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          dir="rtl"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-firm-title-${firmId}`}
            className="w-full max-w-md rounded-2xl border border-border-theme bg-surface p-6 shadow-2xl"
          >
            <h2
              id={`delete-firm-title-${firmId}`}
              className="text-xl font-extrabold"
            >
              حذف دائمی شرکت
            </h2>

            <p className="mt-4 text-sm leading-7 text-muted">
              آیا از حذف شرکت{" "}
              <strong>{firmName}</strong>{" "}
              مطمئنی؟
            </p>

            <p className="mt-3 text-sm leading-7 text-red-500">
              این عملیات دائمی است و امکان بازگردانی
              خودکار اطلاعات حذف‌شده وجود ندارد.
            </p>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-bold">
                برای تأیید، شناسه زیر را دقیق وارد کن:
              </span>

              <span
                dir="ltr"
                className="block rounded-lg bg-background px-3 py-2 text-left font-mono text-sm"
              >
                {firmId}
              </span>

              <input
                type="text"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                value={confirmId}
                onChange={(event) =>
                  setConfirmId(event.target.value)
                }
                placeholder="شناسه شرکت"
                className="w-full rounded-xl border border-border-theme bg-background px-4 py-3 text-sm outline-none focus:border-red-500"
              />
            </label>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={
                  deleting || confirmId !== firmId
                }
                onClick={deleteFirm}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "در حال حذف..."
                  : "تأیید و حذف دائمی"}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={closeConfirm}
                className="rounded-xl border border-border-theme px-5 py-3 text-sm font-bold"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
