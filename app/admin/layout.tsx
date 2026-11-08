
import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import {
  isAdmin,
} from "@/lib/auth";

import AdminShell from "@/components/admin/AdminShell";

import "./admin-responsive.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  description: "پنل مدیریت وب‌سایت پراپ‌بین",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authorized = await isAdmin();

  if (!authorized) {
    redirect("/admin-login");
  }

  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
