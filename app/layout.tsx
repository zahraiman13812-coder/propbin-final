import { siteOrigin } from "@/lib/site-origin";

import type { Metadata } from "next";

import "./globals.css";
import "./theme.css";

import { ThemeProvider } from "@/components/ThemeProvider";
import SiteChrome from "@/components/SiteChrome";
import { initialContent } from "@/lib/content";
import { getSiteSettings } from "@/lib/supabase-site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = siteOrigin();

  let settings = initialContent.settings;
  try {
    settings = await getSiteSettings(initialContent.settings);
  } catch (error) {
    console.error("Failed to load metadata site settings:", error);
  }

  const siteName = settings.name.trim() || "پراپ‌بین";
  const description = settings.tagline.trim() ||
    "پراپ‌بین، مرجع بررسی و مقایسه شرکت‌های پراپ، کدهای تخفیف، نظرسنجی کاربران و مقالات آموزشی ترید.";
  const logo = settings.logoUrl || "/pb-logo.png";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteName} | بررسی و مقایسه شرکت‌های پراپ`,
      template: `%s | ${siteName}`,
    },
    description,
    applicationName: siteName,
    alternates: {
      types: {
        "application/rss+xml": "/articles/feed.xml",
      },
    },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      siteName,
      title: `${siteName} | مرجع بررسی و مقایسه پراپ`,
      description,
      url: siteUrl,
      images: [{ url: logo, alt: `لوگوی ${siteName}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      images: [logo],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem("propin-theme");
    var theme =
      saved === "light" ? "light" : "dark";

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );
  } catch (error) {
    document.documentElement.setAttribute(
      "data-theme",
      "dark"
    );
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />

        {/* Editable primary colours are served from the current site settings. */}
        <link
          rel="stylesheet"
          href="/api/theme"
        />
      </head>

      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <SiteChrome>
            {children}
          </SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
