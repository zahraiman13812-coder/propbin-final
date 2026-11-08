import type { Firm } from "@/lib/data";
import { isSafeSiteImage } from "@/lib/site-ui";

const legacyMarks: Record<string, string> = {
  ftmo: "FT",
  "5ers": "5%",
  fundednext: "FN",
  maven: "M",
  alpha: "AC",
};

export function firmLogoUrl(firm: Pick<Firm, "logo">) {
  return firm.logo && isSafeSiteImage(firm.logo)
    ? firm.logo
    : "";
}

export function firmMarkLabel(
  firm: Pick<Firm, "id" | "name" | "logoText">
) {
  return (
    firm.logoText?.trim().slice(0, 12) ||
    legacyMarks[firm.id] ||
    firm.name.trim().slice(0, 2).toUpperCase() ||
    "PB"
  );
}
