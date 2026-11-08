
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

type UploadResponse = {
  success: boolean;
  url?: string;
  error?: string;
};

const MAX_SIZE = 3 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function ArticleImageUploader({
  value,
  onChange,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selected = event.target.files?.[0];

    setError("");
    setMessage("");

    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("فقط JPG، PNG و WebP مجاز هستند.");
      event.target.value = "";
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError("حجم تصویر نباید بیشتر از ۳ مگابایت باشد.");
      event.target.value = "";
      return;
    }

    setFile(selected);
    event.target.value = "";
  }

  async function uploadImage() {
    if (!file || uploading) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/admin/upload/article-image",
        {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        }
      );

      const result =
        (await response.json()) as UploadResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.url
      ) {
        throw new Error(
          result.error || "آپلود تصویر ناموفق بود."
        );
      }

      onChange(result.url);
      setFile(null);
      setMessage("تصویر آپلود شد. حالا مقاله را ذخیره کنید.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در آپلود تصویر"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4 overflow-hidden rounded-2xl border border-border-theme bg-surface p-3 sm:p-5">
      <h3 className="font-bold text-foreground">
        تصویر شاخص مقاله
      </h3>

      <p className="text-xs leading-6 text-muted">
        تصویر JPG، PNG یا WebP با حداکثر حجم ۳ مگابایت
        انتخاب کنید.
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={selectFile}
        disabled={uploading}
        aria-label="انتخاب تصویر مقاله"
        className="block min-w-0 w-full max-w-full text-xs text-foreground file:mr-2 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary sm:text-sm"
      />

      {(preview || value) && (
        <div className="overflow-hidden rounded-xl border border-border-theme">
          <img
            src={preview || value}
            alt="پیش‌نمایش تصویر شاخص مقاله"
            className="block aspect-video h-auto max-h-[65vh] w-full max-w-full object-contain"
          />
        </div>
      )}

      {file && (
        <p className="text-xs text-muted">
          فایل انتخاب‌شده: {file.name}
        </p>
      )}

      <button
        type="button"
        disabled={!file || uploading}
        onClick={uploadImage}
        className="min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {uploading
          ? "در حال آپلود..."
          : "آپلود تصویر"}
      </button>

      {value && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            آدرس تصویر ذخیره‌شده:
          </p>

          <input
            readOnly
            dir="ltr"
            value={value}
            className="min-w-0 w-full rounded-lg border border-border-theme bg-background p-3 text-xs"
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              onChange("");
              setFile(null);
              setMessage(
                "تصویر از فرم حذف شد. برای ثبت تغییرات، مقاله را ذخیره کنید."
              );
            }}
            className="text-xs font-bold text-red-500"
          >
            حذف تصویر از مقاله
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="text-sm text-green-500">
          {message}
        </p>
      )}
    </div>
  );
}
