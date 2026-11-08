/** One canonical origin for metadata, feeds, sitemap and local image URLs. */
export function siteOrigin(): string {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://propbin.com");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without credentials");
  }
  return url.origin;
}
