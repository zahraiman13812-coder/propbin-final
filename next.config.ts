import path from "node:path";
import type { NextConfig } from "next";

const configuredSite = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://propbin.com");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const privatePages = ["admin", "admin-login", "account", "login", "forgot-password", "demo", "demo-account", "demo-admin", "search"];
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ] },
      ...privatePages.map(page => ({ source: `/${page}/:path*`, headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ] })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: configuredSite.protocol.slice(0, -1) as "http" | "https",
        hostname: configuredSite.hostname,
        port: configuredSite.port,
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: new URL(process.env.SUPABASE_URL || "https://zonoonbgqixsythpqoxq.supabase.co").hostname,
        pathname: "/storage/v1/object/public/article-images/**",
      },
    ],
  },
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
