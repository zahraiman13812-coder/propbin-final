import type { CSSProperties } from "react";

import type { Firm } from "@/lib/data";
import {
  firmLogoUrl,
  firmMarkLabel,
} from "@/lib/firm";

type Props = {
  firm: Pick<
    Firm,
    "id" | "name" | "logo" | "logoText"
  >;
  className?: string;
  imageClassName?: string;
  style?: CSSProperties;
};

/**
 * A firm logo with a text fallback. The fallback is used when no uploaded
 * image exists (or when the stored path is not a safe local image).
 */
export default function FirmLogo({
  firm,
  className = "",
  imageClassName = "h-full w-full object-contain p-1.5",
  style,
}: Props) {
  const src = firmLogoUrl(firm);

  return (
    <span className={className} style={style}>
      {src ? (
        <img
          src={src}
          alt={`لوگوی ${firm.name}`}
          loading="lazy"
          className={imageClassName}
        />
      ) : (
        <span aria-hidden="true">
          {firmMarkLabel(firm)}
        </span>
      )}
    </span>
  );
}
