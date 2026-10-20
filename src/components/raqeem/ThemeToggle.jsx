import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * ThemeToggle — the ONE control for the platform's two themes.
 * Light and dark are the only modes; the choice is remembered between sessions and
 * applied by index.html before first paint, so a page never flashes the other theme.
 */

const STORAGE_KEY = "lijan_theme";

export function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? "#191417" : "#8A1538");
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (e) {
    /* a closed storage must never stop the theme from applying */
  }
}

function currentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle({ variant = "plain", collapsed = false, className }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState(currentTheme);

  // Another surface (or the stored preference) may have set the theme already.
  useEffect(() => {
    setMode(currentTheme());
  }, []);

  const next = mode === "dark" ? "light" : "dark";
  const label = next === "dark" ? t("الوضع الداكن", "Dark mode") : t("الوضع الفاتح", "Light mode");

  const toggle = () => {
    applyTheme(next);
    setMode(next);
  };

  const Icon = mode === "dark" ? Sun : Moon;

  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        aria-pressed={mode === "dark"}
        className={cn(
          "inline-flex items-center rounded-control transition-colors sovereign-focus",
          "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/[0.06]",
          collapsed
            ? "justify-center w-9 h-9"
            : "gap-2 min-h-[36px] px-2 text-[12px]",
          className
        )}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        {!collapsed && <span>{label}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={mode === "dark"}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-control border border-border",
        "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary",
        "transition-colors sovereign-focus touch-target",
        className
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}