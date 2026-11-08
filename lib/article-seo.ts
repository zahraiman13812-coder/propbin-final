import { siteOrigin } from "@/lib/site-origin";

import type { Metadata } from "next";

import {
  getContent,
  type Article,
} from "@/lib/content";

import {
  getPublishedArticle,
  getPublishedArticleCanonical,
} from "@/lib/supabase-articles";

const SITE_NAME = "پراپ‌بین";
const DEFAULT_AUTHOR = "تیم پراپ‌بین";

function absoluteImage(
  image: string | undefined,
  origin: string
) {
  if (!image) {
    return `${origin}/pb-logo.png`;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  return `${origin}/${image.replace(/^\/+/, "")}`;
}

function articleKeywords(article: Article) {
  const fromAdmin = (article.keywords || "")
    .split(/[,،]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  if (fromAdmin.length > 0) {
    return fromAdmin.slice(0, 12);
  }

  return [
    article.category,
    article.title,
    "پراپ",
    "شرکت پراپ",
    "چالش پراپ",
  ].filter(Boolean);
}

function validDate(value: string | undefined) {
  if (!value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

export async function getArticleMetadata(
  slug: string
): Promise<Metadata> {

  const [
  { settings },
  article,
  customCanonical,
] = await Promise.all([
  getContent(),
  getPublishedArticle(slug),
  getPublishedArticleCanonical(slug),
]);

  if (!article) {
    return {
      title: "مقاله پیدا نشد",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const origin = siteOrigin();

  const defaultCanonical =
  `${origin}/articles/${encodeURIComponent(article.slug)}`;

let canonicalUrl = defaultCanonical;

if (customCanonical) {
  try {
    const candidate = new URL(customCanonical);
    const siteUrl = new URL(origin);

    if (
      candidate.protocol === siteUrl.protocol &&
      candidate.host === siteUrl.host &&
      !candidate.search &&
      !candidate.hash
    ) {
      canonicalUrl = candidate.toString();
    }
  } catch {
    console.warn("Invalid canonical URL:", customCanonical);
  }
}

  const title =
    article.seoTitle?.trim() ||
    article.title;

  const description = (
    article.seoDescription?.trim() ||
    article.excerpt ||
    ""
  ).slice(0, 160);

  const image = absoluteImage(
    article.image,
    origin
  );

  const keywords = articleKeywords(article);

  const published = validDate(
    article.publishedAt
  );

  const modified = validDate(
    article.updatedAt
  );

  return {
    title,
    description,
    keywords,

    authors: [
      {
        name:
          article.author?.trim() ||
          DEFAULT_AUTHOR,
      },
    ],

    alternates: {
      canonical: canonicalUrl,
      types: {
        "application/rss+xml":
          `${origin}/articles/feed.xml`,
      },
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    openGraph: {
      type: "article",
      title,
      description,
      url: canonicalUrl,
      siteName:
        settings.name || SITE_NAME,
      locale: "fa_IR",
      images: [
        {
          url: image,
          alt: article.title,
        },
      ],
      publishedTime: published,
      modifiedTime: modified,
      authors: [
        article.author?.trim() ||
        DEFAULT_AUTHOR,
      ],
      section: article.category,
      tags: keywords,
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function getArticleJsonLd(
  article: Article,
  siteName: string
) {
  const origin = siteOrigin();

  const url =
    `${origin}/articles/${encodeURIComponent(article.slug)}`;

  const image = absoluteImage(
    article.image,
    origin
  );

  const published = validDate(
    article.publishedAt
  );

  const modified =
    validDate(article.updatedAt) ||
    published;

  return {
    "@context": "https://schema.org",
    "@type": "Article",

    headline:
      article.seoTitle?.trim() ||
      article.title,

    description:
      article.seoDescription?.trim() ||
      article.excerpt,

    image: [image],

    datePublished: published,
    dateModified: modified,

    author: {
      "@type": "Person",
      name:
        article.author?.trim() ||
        DEFAULT_AUTHOR,
    },

    publisher: {
      "@type": "Organization",
      name: siteName || SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${origin}/pb-logo.png`,
      },
    },

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },

    articleSection: article.category,

    keywords:
      articleKeywords(article).join(", "),

    inLanguage: "fa-IR",

    isAccessibleForFree: true,

    url,
  };
}

export function getBreadcrumbJsonLd(
  article: Article
) {
  const origin = siteOrigin();

  const articleUrl =
    `${origin}/articles/${encodeURIComponent(article.slug)}`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",

    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "صفحه اصلی",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "مقالات",
        item: `${origin}/articles`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: articleUrl,
      },
    ],
  };
}

export function jsonLdString(value: unknown) {
  return JSON.stringify(value).replace(
    /</g,
    "\\u003c"
  );
}
