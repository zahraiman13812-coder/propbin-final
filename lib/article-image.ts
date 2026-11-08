export function isValidArticleImage(
  image: string | null | undefined
): boolean {
  if (!image) return false;

  const localPattern =
    /^\/(?:uploads\/articles|articles)\/[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i;

  if (localPattern.test(image)) return true;
  // Persistent local storage used by the PostgreSQL-backed deployment.
  if (/^\/uploads\/article-images\/covers\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i.test(image)) return true;

  try {
    const url = new URL(image);
    if (url.protocol !== "https:" || url.username || url.password) {
      return false;
    }

    // Public URLs served by this installation's persistent uploads route.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://propbin.com";
    const site = new URL(siteUrl);
    if (url.origin === site.origin &&
        /^\/uploads\/article-images\/covers\/[a-zA-Z0-9._-]+\.(?:jpg|jpeg|png|webp)$/i.test(url.pathname)) {
      return true;
    }

    // Public Vercel Blob URLs use a unique store subdomain.
    if (/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)) {
      return true;
    }

    // Support previously uploaded images still stored in Supabase.
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return false;
    const projectUrl = new URL(supabaseUrl);

    return (
      url.origin === projectUrl.origin &&
      url.pathname.startsWith(
        "/storage/v1/object/public/article-images/"
      )
    );
  } catch {
    return false;
  }
}
