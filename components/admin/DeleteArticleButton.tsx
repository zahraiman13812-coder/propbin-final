
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  articleId: string;
  title: string;
};

type DeleteResponse = {
  success: boolean;
  error?: string;
};

export default function DeleteArticleButton({
  articleId,
  title,
}: Props) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (deleting) return;

    const confirmed = window.confirm(
      `آیا از حذف دائمی مقاله «${title}» مطمئنی؟\n\nاین عملیات قابل بازگشت نیست.`
    );

    if (!confirmed) return;

    const typedTitle = window.prompt(
      "برای تأیید نهایی، عنوان مقاله را دقیق وارد کن:",
      ""
    );

    if (typedTitle !== title) {
      if (typedTitle !== null) {
        setError("عنوان مقاله مطابقت ندارد؛ حذف انجام نشد.");
      }

      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/articles/${encodeURIComponent(articleId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result =
        (await response.json()) as DeleteResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "حذف مقاله ناموفق بود."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در ارتباط با سرور"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={deleting}
        className="inline-flex items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
      >
        {deleting ? "در حال حذف..." : "حذف مقاله"}
      </button>

      {error && (
        <p
          role="alert"
          className="max-w-48 text-xs leading-6 text-red-500"
        >
          {error}
        </p>
      )}
    </div>
  );
}
