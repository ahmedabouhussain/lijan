import React from "react";
import { ArrowLeft, ArrowRight, Crown, ClipboardList, UserCircle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

// Role lenses are entry points into the SAME governed exploration session.
// Each one opens the committee where the persona actually holds that role.
const LENS_ICONS = {
  chair: Crown,
  secretary: ClipboardList,
  member: UserCircle,
};

export default function RoleLensSection({ items, onSelect }) {
  const { t, lang } = useLanguage();
  if (!items || items.length === 0) return null;

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="mt-8 pt-6 border-t border-border">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t("أدخل بمنظور الدور", "Enter through a role lens")}
      </span>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
        {t(
          "نفس الجلسة ونفس البيانات المعزولة — يفتح كل منظور اللجنة التي يُشغل فيها هذا الدور فعلاً.",
          "Same session, same isolated data — each lens opens the committee where the role is actually held."
        )}
      </p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(({ lens }) => {
          const Icon = LENS_ICONS[lens.key] || UserCircle;
          return (
            <button
              key={lens.key}
              onClick={() => onSelect(lens)}
              className="raqeem-card-interactive p-4 text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {t(lens.titleAr, lens.titleEn)}
                </span>
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                {t(lens.summaryAr, lens.summaryEn)}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                {t("افتح المنظور", "Open the lens")}
                <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}