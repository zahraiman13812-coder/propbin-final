
"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Building2,
  TicketPercent,
  BookOpen,
  MessageSquare,
  Settings,
  Palette,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  LifeBuoy,
  Users,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";

const navigation = [
  {
    title: "داشبورد",
    path: "",
    icon: LayoutDashboard,
  },
  {
    title: "شرکت‌های پراپ",
    path: "/firms",
    icon: Building2,
  },
  {
    title: "کدهای تخفیف",
    path: "/discounts",
    icon: TicketPercent,
  },
  {
    title: "مقالات",
    path: "/articles",
    icon: BookOpen,
  },
  {
    title: "نظرسنجی‌ها",
    path: "/polls",
    icon: MessageSquare,
  },
  { title: "پرسش‌های شرکت‌ها", path: "/firm-questions", icon: MessageSquare },
  { title: "بررسی کامل شرکت‌ها", path: "/firm-details", icon: Building2 },
  { title: "ردیف‌های مقایسه", path: "/compare-rows", icon: Building2 },
  {
    title: "نظرات منتخب",
    path: "/featured",
    icon: ShieldCheck,
  },
  {
    title: "کاربران",
    path: "/users",
    icon: Users,
  },
  {
    title: "قرعه‌کشی مقاله‌ای",
    path: "/lottery",
    icon: TicketPercent,
  },
  {
    title: "پشتیبانی",
    path: "/support",
    icon: LifeBuoy,
  },
  {
    title: "مدیریت ظاهر",
    path: "/appearance",
    icon: Palette,
  },
  {
    title: "تنظیمات سایت",
    path: "/settings",
    icon: Settings,
  },
];

export default function AdminShell({
  children,
  demo = false,
}: {
  children: ReactNode;
  demo?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const base = demo ? "/demo-admin" : "/admin";

  // صفحات اختصاصی و زنده در پیش‌نمایش نمایش داده نمی‌شوند.
  // گردونه شانس نیز از منوی هر دو پنل حذف شده است.
  const visibleNavigation = demo
    ? navigation.filter(
        (item) =>
          ![
            "/users",
            "/support",
            "/wheel",
            "/firm-questions",
            "/compare-rows",
            "/raffle",
          ].includes(item.path)
      )
    : navigation;

  function active(href: string) {
    return href === base
      ? pathname === base
      : pathname === href ||
          pathname.startsWith(`${href}/`);
  }

  const currentPage =
    visibleNavigation.find(({ path }) =>
      active(`${base}${path}`)
    )?.title || "پنل مدیریت";

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [open]);

  async function logout() {
    if (demo) {
      router.push("/demo");
      return;
    }

    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("خروج انجام نشد.");
      }

      router.replace("/admin-login");
      router.refresh();
    } catch {
      alert("خطا در خروج از پنل.");
      setLoggingOut(false);
    }
  }

  return (
    <div
      id="parabin-admin"
      dir="rtl"
      className="admin-shell min-h-screen bg-background text-foreground"
    >
      {open && (
        <button
          type="button"
          aria-label="بستن منوی مدیریت"
          className="admin-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="admin-sidebar"
        aria-label="منوی مدیریت"
        className={`admin-sidebar ${
          open ? "is-open" : ""
        }`}
      >
        <div className="admin-sidebar-brand">
          <Link
            href={base}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3"
          >
            <img
              src="/pb-logo.png"
              alt="لوگوی پراپ‌بین"
              className="h-11 w-11 object-contain"
            />

            <div>
              <strong className="block text-base font-extrabold">
                پراپ‌بین
              </strong>

              <span className="text-[11px] text-muted">
                {demo
                  ? "پنل مدیریت - نمایشی"
                  : "پنل مدیریت"}
              </span>
            </div>
          </Link>

          <button
            type="button"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
            className="admin-icon-button admin-mobile-only"
          >
            <X size={21} />
          </button>
        </div>

        <div className="admin-sidebar-scroll">
          <p className="admin-menu-caption">
            مدیریت وب‌سایت
          </p>

          <div
            role="navigation"
            aria-label="فهرست صفحات مدیریت"
            className="admin-sidebar-nav"
          >
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const href = `${base}${item.path}`;
              const selected = active(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={
                    selected ? "page" : undefined
                  }
                  className={`admin-nav-item ${
                    selected ? "is-active" : ""
                  }`}
                >
                  <Icon size={19} />

                  <span className="flex-1">
                    {item.title}
                  </span>

                  {selected && (
                    <ChevronLeft size={16} />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="admin-menu-divider" />

          <Link
            href="/"
            className="admin-nav-item"
            onClick={() => setOpen(false)}
          >
            <ExternalLink size={19} />
            مشاهده سایت
          </Link>
        </div>

        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <div className="admin-profile-icon">
              <ShieldCheck size={21} />
            </div>

            <div>
              <strong className="block text-sm">
                {demo
                  ? "مدیر نمایشی"
                  : "مدیر اصلی"}
              </strong>

              <span className="text-xs text-muted">
                مدیریت پراپ‌بین
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={logout}
            className="admin-logout"
          >
            <LogOut size={19} />

            {demo
              ? "خروج از پیش‌نمایش"
              : loggingOut
                ? "در حال خروج..."
                : "خروج از حساب"}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="باز کردن منوی مدیریت"
              aria-controls="admin-sidebar"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="admin-icon-button admin-mobile-only"
            >
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <p className="admin-breadcrumb">
                پراپ‌بین / مدیریت
                {demo ? " / پیش‌نمایش" : ""}
              </p>

              <h1 className="admin-topbar-title">
                {currentPage}
              </h1>
            </div>
          </div>

          <div className="admin-topbar-actions">
            <Link
              href="/"
              className="admin-visit-site"
            >
              <ExternalLink size={17} />
              <span>مشاهده سایت</span>
            </Link>

            <ThemeToggle />
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
