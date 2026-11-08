
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  defaultNavigation,
  parseNavigation,
  type NavigationItem,
} from "@/lib/site-ui";

type FooterSettings = {
  name: string;
  logoUrl: string;
  footerDescription: string;
  contactEmail: string;
  navigationJson: string;
};

const initial: FooterSettings = {
  name: "پراپ‌بین",
  logoUrl: "/pb-logo.png",
  footerDescription:
    "مرجع بررسی و مقایسه شرکت‌های پراپ.",
  contactEmail: "",
  navigationJson: JSON.stringify(defaultNavigation),
};

export default function Footer() {
  const [settings, setSettings] =
    useState<FooterSettings>(initial);

  useEffect(() => {
    let active = true;

    fetch("/api/content", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (active && data.settings) {
          setSettings({
            ...initial,
            ...data.settings,
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const links: NavigationItem[] = parseNavigation(
    settings.navigationJson
  ).filter((item) => item.visible && item.href !== "/polls");
  if (!links.some(item=>item.href==="/cooperation")) links.push({id:"cooperation",href:"/cooperation",label:"همکاری با ما",visible:true});

  return (
    <footer
      dir="rtl"
      className="border-t border-border-theme bg-surface text-foreground"
    >
      <div className="mx-auto grid max-w-[1200px] gap-9 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-3"
          >
            <img
              src={settings.logoUrl}
              alt={`لوگوی ${settings.name}`}
              className="h-12 w-12 object-contain"
            />

            <strong className="text-lg font-extrabold">
              {settings.name}
            </strong>
          </Link>

          <p className="mt-4 max-w-lg text-xs leading-8 text-muted">
            {settings.footerDescription}
          </p>

          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="mt-4 inline-block text-xs text-primary"
            >
              {settings.contactEmail}
            </a>
          )}
        </div>

        <div>
          <h2 className="mb-5 text-sm font-bold">
            دسترسی سریع
          </h2>

          <div
            role="navigation"
            aria-label="پیوندهای فوتر"
            className="grid grid-cols-2 gap-x-4 gap-y-4"
          >
            {links.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="text-xs text-muted transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border-theme px-4 py-5 text-center text-[11px] text-muted">
        © {new Date().getFullYear()} {settings.name} —
        تمامی حقوق محفوظ است.
      </div>
    </footer>
  );
}
