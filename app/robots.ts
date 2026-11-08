import { siteOrigin } from "@/lib/site-origin";

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: {
      userAgent: "*",

      allow: "/",

      // HTML private pages use noindex headers; crawlers must see those headers.
      disallow: ["/api/"],
    },

    sitemap: `${origin}/sitemap.xml`,
  };
}
