
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      dir="rtl"
      role="status"
      aria-live="polite"
      className="flex min-h-[65vh] flex-col items-center justify-center gap-4 bg-background px-4 text-foreground"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Loader2
          size={32}
          className="animate-spin text-primary"
        />
      </div>

      <p className="text-sm font-semibold">
        در حال بارگذاری پراپ‌بین...
      </p>

      <p className="text-xs text-muted">
        لطفاً چند لحظه صبر کنید.
      </p>
    </div>
  );
}
