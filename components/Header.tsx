
"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Menu,
  X,
  UserRound,
} from "lucide-react";

import ThemeToggle from "./ThemeToggle";
import GlobalSearchBar from "./GlobalSearchBar";

import {
  defaultNavigation,
  parseNavigation,
  type NavigationItem,
} from "@/lib/site-ui";

type HeaderSettings = {
  name: string;
  tagline: string;
  logoUrl: string;
  navigationJson: string;
};

const defaults: HeaderSettings = {
  name: "پراپ‌بین",
  tagline: "مرجع بررسی پراپ",
  logoUrl: "/pb-logo.png",
  navigationJson: JSON.stringify(defaultNavigation),
};

export default function Header() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  const [open, setOpen] = useState(false);
  const [settings, setSettings] =
    useState<HeaderSettings>(defaults);

  useEffect(() => {
    let active = true;

    fetch("/api/content", {
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load navigation");
        }

        return response.json();
      })
      .then((data) => {
        if (active && data.settings) {
          setSettings({
            ...defaults,
            ...data.settings,
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function onOutside(event: PointerEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      onOutside
    );
    window.addEventListener(
      "keydown",
      onEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onOutside
      );
      window.removeEventListener(
        "keydown",
        onEscape
      );
    };
  }, [open]);

  const links: NavigationItem[] = parseNavigation(
    settings.navigationJson
  ).filter((item) => item.visible && item.href !== "/polls");
  if (!links.some(item => item.href === "/cooperation")) links.push({ id: "cooperation", href: "/cooperation", label: "همکاری با ما", visible: true });
  const cooperation = links.find(item=>item.href==="/cooperation");
  if (cooperation) { const at=links.indexOf(cooperation); links.splice(at,1); const articles=links.findIndex(item=>item.href==="/articles"); links.splice(articles>=0?articles+1:links.length,0,cooperation); }

  function active(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href ||
          pathname.startsWith(`${href}/`);
  }

  return (
    <header
      ref={headerRef}
      dir="rtl"
      className="sticky top-0 z-[100] w-full border-b border-border-theme bg-background/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[74px] max-w-[1300px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex shrink-0 items-center gap-2"
        >
          <img
            src={settings.logoUrl}
            alt={`لوگوی ${settings.name}`}
            className="h-11 w-11 shrink-0 object-contain"
          />

          <div className="hidden flex-col sm:flex">
            <strong className="text-lg font-extrabold text-foreground">
              {settings.name}
            </strong>

            <span className="max-w-[135px] truncate text-[10px] text-muted">
              {settings.tagline}
            </span>
          </div>
        </Link>

        <div
          role="navigation"
          aria-label="منوی اصلی"
          className="hidden min-w-0 items-center gap-1 xl:flex"
        >
          {links.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={
                active(item.href) ? "page" : undefined
              }
              className={`whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors ${
                active(item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-secondary hover:text-foreground"
              }`}
            >
              <span className={item.href === "/cooperation" ? "underline underline-offset-4 decoration-primary" : ""}>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearchBar />

          <ThemeToggle />

          <Link
            href="/account"
            aria-label="حساب کاربری"
            title="حساب کاربری"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-theme bg-surface text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <UserRound size={21} />
          </Link>

          <button
            type="button"
            aria-label={
              open ? "بستن منو" : "باز کردن منو"
            }
            aria-controls="parabin-mobile-menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-theme bg-surface-secondary text-foreground xl:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="parabin-mobile-menu"
          role="navigation"
          aria-label="منوی موبایل"
          className="absolute inset-x-0 top-full z-[110] max-h-[calc(100dvh-74px)] overflow-y-auto border-b border-border-theme bg-surface p-4 shadow-2xl xl:hidden"
        >
          <div className="mx-auto flex max-w-[1300px] flex-col gap-1">
            {links.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm ${
                  active(item.href)
                    ? "bg-primary/10 font-bold text-primary"
                    : "text-foreground hover:bg-surface-secondary"
                }`}
              >
                <span className={item.href === "/cooperation" ? "underline underline-offset-4 decoration-primary" : ""}>{item.label}</span>
              </Link>
            ))}

            <div className="my-2 h-px bg-border-theme" />

            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-foreground"
            >
              <UserRound size={19} />
              حساب کاربری
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
