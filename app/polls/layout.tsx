import type { Metadata } from "next";
export const metadata: Metadata = { title: "نظرات کاربران", alternates: { canonical: "/polls" } };

import type { ReactNode } from "react";

import "./stars.css";

export default function PollsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
