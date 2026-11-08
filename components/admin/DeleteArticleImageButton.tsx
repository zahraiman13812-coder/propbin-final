
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  path: string;
  disabled?: boolean;
};

type DeleteResult = {
  success: boolean;
  error?: string;
  deletedPath?: string;
};

export default function DeleteArticleImageButton({
  path,
  disabled = false,
}: Props) {
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (disabled || deleting) return;

    setError("");

    const filename = path.split("/").pop() ?? "";

    const confirmed = window.confirm(
      `آیا مطمئنی تصویر زیر در هیچ جای سایت استفاده نمی‌شود؟\n\n${path}\n\nحذف این تصویر دائمی است.`
    );

    if (!confirmed) return;

    const entered = window.prompt(
      "برای تأیید نهایی، نام کامل فایل را وارد کن:",
      ""
    );

    if (entered !== filename) {
      if (entered !== null) {
        setError("نام فایل صحیح وارد نشده است.");
      }
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(
        "/api/admin/article-images/delete",
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            confirmFilename: filename,
            confirmUnused: true,
          }),
        }
      );

      const result =
        (await response.json()) as DeleteResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "حذف تصویر ناموفق بود."
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
        disabled={disabled || deleting}
        className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deleting
          ? "در حال حذف..."
          : "حذف دائمی تصویر"}
      </button>

      {error && (
        <p
          role="alert"
          className="text-xs leading-6 text-red-500"
        >
          {error}
        </p>
      )}
    </div>
  );
}
