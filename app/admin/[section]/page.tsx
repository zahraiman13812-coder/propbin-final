import { notFound } from "next/navigation";

import { getContent } from "@/lib/content";
import { requireAdmin } from "@/lib/admin";
import AdminEditor from "@/components/admin/AdminEditor";
import DiscountManager from "@/components/admin/DiscountManager";

const allowed = [
  "firms",
  "discounts",
  "articles",
  "polls",
  "settings",
] as const;

export const dynamic = "force-dynamic";

export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await requireAdmin();

  const { section } = await params;

  if (!allowed.includes(section as (typeof allowed)[number])) {
    notFound();
  }

  if (section === "discounts") return <DiscountManager />;

  return (
    <AdminEditor
      key={section}
      section={section as (typeof allowed)[number]}
      initial={await getContent()}
    />
  );
}
