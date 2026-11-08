
"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import SupportWidget from "@/components/SupportWidget";

export default function SiteChrome({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const isAdminLayout =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/admin-login" ||
    pathname === "/demo-admin" ||
    pathname.startsWith("/demo-admin/");

  if (isAdminLayout) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />

      <main className="min-h-[60vh]">
        {children}
      </main>

      <Footer />
      <BackToTop />
      <SupportWidget />
    </>
  );
}
