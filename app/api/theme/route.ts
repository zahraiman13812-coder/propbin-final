import { NextResponse } from "next/server";

import { initialContent } from "@/lib/content";
import { getSiteSettings } from "@/lib/supabase-site-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DARK_DEFAULT = "#008cff";
const LIGHT_DEFAULT = "#0078ed";

function validHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/**
 * The primary colours are editable in the admin panel. Serving them as a
 * tiny stylesheet keeps the root layout static while still making the
 * setting effective (the variables used to be hard-coded in theme.css).
 */
export async function GET() {
  let dark = DARK_DEFAULT;
  let light = LIGHT_DEFAULT;

  try {
    const settings = await getSiteSettings(initialContent.settings);

    if (validHex(settings.primaryDark)) {
      dark = settings.primaryDark;
    }

    if (validHex(settings.primaryLight)) {
      light = settings.primaryLight;
    }
  } catch {
    // Fall back to the defaults when the content store is unavailable.
  }

  /*
   * `:root[data-theme="..."]` is more specific than the selectors in
   * theme.css, so these values win regardless of stylesheet order.
   */
  const css = `
:root[data-theme="dark"] {
  --primary: ${dark};
  --primary-hover: ${dark};
  --primary-hover: color-mix(in srgb, ${dark} 85%, #000);
}
:root[data-theme="light"] {
  --primary: ${light};
  --primary-hover: ${light};
  --primary-hover: color-mix(in srgb, ${light} 85%, #000);
}
`;

  return new NextResponse(css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
