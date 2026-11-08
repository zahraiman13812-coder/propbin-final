"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <button type="button" onClick={toggleTheme}
      aria-label={mounted && theme === "dark" ? "فعال کردن حالت روشن" : "فعال کردن حالت تاریک"}
      title="تغییر حالت نمایش"
      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border-theme bg-surface-secondary text-foreground transition-colors hover:border-primary hover:text-primary">
      {!mounted || theme === "light" ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
    </button>
  );
}
