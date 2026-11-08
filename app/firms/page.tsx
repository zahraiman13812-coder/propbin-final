
import type { Metadata } from "next";

import { getActivePropFirms } from "@/lib/supabase-firms";
import FirmsDirectory from "@/components/FirmsDirectory";
import FeaturedReviews from "@/components/FeaturedReviews";
import { getContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/firms" },
  title: "بررسی پراپ‌ها",
  description:
    "بررسی و مقایسه شرکت‌های پراپ در پراپ‌بین؛ مشاهده امتیاز، سرمایه، سهم سود، هزینه چالش و قوانین شرکت‌ها.",
};

export default async function FirmsPage() {
  // دریافت فقط شرکت‌های فعال از Supabase
  const firms = await getActivePropFirms();

  const { polls, settings } = await getContent();
  return <><FirmsDirectory firms={firms} /><section className="mx-auto max-w-[1200px] px-4 py-12"><FeaturedReviews polls={polls} firms={firms} title={settings.reviewsTitle} /></section></>;
}
