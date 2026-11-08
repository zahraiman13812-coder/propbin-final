
import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import FirmCreateForm from "@/components/admin/FirmCreateForm";

export const dynamic = "force-dynamic";

export default async function NewFirmPage() {
  await requireAdmin();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/admin/firms"
            className="text-sm font-bold text-primary hover:underline"
          >
            ← بازگشت به فهرست شرکت‌ها
          </Link>

          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
            افزودن شرکت پراپ جدید
          </h1>

          <p className="mt-3 text-sm leading-7 text-muted">
            اطلاعات شرکت را وارد کن. شرکت ابتدا
            به‌صورت غیرفعال ذخیره می‌شود
            و تا زمان فعال‌سازی در بخش‌های عمومی
            پراپ‌بین نمایش داده نخواهد شد.
          </p>
        </div>

        <FirmCreateForm />
      </div>
    </main>
  );
}
