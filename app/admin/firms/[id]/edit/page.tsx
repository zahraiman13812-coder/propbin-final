
import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import FirmEditForm from "@/components/admin/FirmEditForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditFirmPage({
  params,
}: Props) {
  await requireAdmin();

  const { id } = await params;

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
            ← بازگشت به مدیریت شرکت‌ها
          </Link>

          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">
            ویرایش اطلاعات شرکت
          </h1>

          <p className="mt-3 text-sm leading-7 text-muted">
            اطلاعات شرکت را تغییر بده و برای ذخیره
            روی دکمه ذخیره تغییرات کلیک کن.
          </p>
        </div>

        <FirmEditForm firmId={id} />
      </div>
    </main>
  );
}
