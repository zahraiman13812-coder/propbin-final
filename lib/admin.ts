import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/auth";

/**
 * Server-side guard for admin pages.
 *
 * The redirect in `app/admin/layout.tsx` is not enough on its own: Next.js can
 * render a page in parallel with its layout, so an unauthenticated request to
 * `/admin/...` could still stream the page's data (including unapproved
 * reviews and user ids) in the RSC payload before the browser followed the
 * redirect. Every server page under `/admin` must call this before reading
 * content.
 */
export async function requireAdmin() {
  if (!(await isAdmin())) {
    redirect("/admin-login");
  }
}
