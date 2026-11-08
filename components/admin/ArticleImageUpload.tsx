"use client";

import { useRef, useState } from "react";

import {
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  endpoint?:
    | "/api/admin/upload"
    | "/api/admin/branding-upload";
  title?: string;
  description?: string;
  alt?: string;
  previewClassName?: string;
  emptyClassName?: string;
};

export default function ArticleImageUpload({
  value,
  onChange,
  endpoint = "/api/admin/upload",
  title = "تصویر شاخص مقاله",
  description = "JPG، PNG یا WebP — حداکثر ۲ مگابایت",
  alt = "پیش‌نمایش تصویر",
  previewClassName = "aspect-video w-full object-contain",
  emptyClassName = "aspect-video",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function upload(
    file: File | undefined
  ) {
    if (!file || uploading) return;

    setError("");

    if (
      file.size === 0 ||
      file.size > 2 * 1024 * 1024
    ) {
      setError(
        "حداکثر حجم مجاز تصویر ۲ مگابایت است."
      );
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      setError(
        "فقط تصاویر JPG، PNG و WebP مجازند."
      );
      return;
    }

    setUploading(true);

    try {
      const form = new FormData();

      form.append("image", file);

      const response = await fetch(endpoint, {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "آپلود عکس انجام نشد."
        );
      }

      if (typeof result.url !== "string") {
        throw new Error(
          "آدرس تصویر از سرور دریافت نشد."
        );
      }

      onChange(result.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطا در آپلود تصویر"
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div
      dir="rtl"
      className="min-w-0 space-y-4"
    >
      <div>
        <p className="text-sm font-bold text-foreground">
          {title}
        </p>

        <p className="mt-2 text-xs text-muted">
          {description}
        </p>
      </div>

      {value ? (
        <div className="overflow-hidden rounded-xl border border-border-theme bg-surface-secondary">
          <img
            src={value}
            alt={alt}
            className={`block h-auto max-h-[65vh] max-w-full ${previewClassName}`}
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-xl border border-dashed border-border-theme bg-surface-secondary ${emptyClassName}`}
        >
          <div className="text-center">
            <ImagePlus
              size={35}
              className="mx-auto text-muted"
            />

            <p className="mt-3 text-xs text-muted">
              هنوز تصویری انتخاب نشده
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={title}
        tabIndex={-1}
        className="hidden"
        onChange={(event) =>
          upload(event.target.files?.[0])
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={uploading}
          onClick={() =>
            inputRef.current?.click()
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto"
        >
          {uploading ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <ImagePlus size={18} />
          )}

          {uploading
            ? "در حال آپلود..."
            : "انتخاب و آپلود عکس"}
        </button>

        {value && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => onChange("")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 px-4 text-sm text-danger sm:w-auto"
          >
            <Trash2 size={17} />
            حذف تصویر
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger/10 p-3 text-xs text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
