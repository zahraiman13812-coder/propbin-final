/** Validate a full HTTP(S) origin, including scheme and port; never trust forwarded host. */
export function validOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    if (!["http:", "https:"].includes(source.protocol) || source.username || source.password ||
        source.pathname !== "/" || source.search || source.hash) return false;
    const target = new URL(request.url);
    const host = request.headers.get("host") || target.host;
    // When TLS terminates at a proxy, the configured public scheme is authoritative.
    const configured = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;
    const protocol = configured && configured.host === host ? configured.protocol : target.protocol;
    return source.origin === new URL(`${protocol}//${host}`).origin;
  } catch { return false; }
}
