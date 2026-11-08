
import type {
  Metadata,
} from "next";

import type {
  ReactNode,
} from "react";

import AdminShell from "@/components/admin/AdminShell";

import "../admin/admin-responsive.css";

export const metadata: Metadata = {
  title: "پیش‌نمایش پنل مدیریت",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DemoAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminShell demo>
      {children}
    </AdminShell>
  );
}
