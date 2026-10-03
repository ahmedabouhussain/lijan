// Compact role filter bar — orders the committees by the member's role in each one.
import React from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

const ROLE_ORDER = ["chair", "vice_chair", "secretary", "member"];

export default function RoleFilterBar({ committees, roleLabels, value, onChange }) {
  const { t, lang } = useLanguage();
  const list = committees || [];

  const chip = (key, label, count) => (
    <button
      key={key}
      type="button"
      onClick={() => onChange(key)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors",
        value === key
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
      )}
    >
      {label}
      <span className={cn("text-[10px]", value === key ? "text-primary-foreground/70" : "text-muted-foreground")}>
        ({count})
      </span>
    </button>
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[11px] text-muted-foreground shrink-0">{t("ترتيب حسب الدور", "Filter by role")}</span>
      {chip("all", t("الكل", "All"), list.length)}
      {ROLE_ORDER.map((role) => {
        const label = roleLabels?.[role] ? (lang === "ar" ? roleLabels[role].ar : roleLabels[role].en) : role;
        return chip(role, label, list.filter((c) => c.role === role).length);
      })}
    </div>
  );
}