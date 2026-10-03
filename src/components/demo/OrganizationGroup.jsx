// An institutional organization holding its own committees — collapsed until opened.
import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import CommitteeRow from "@/components/demo/CommitteeRow";
import { cn } from "@/lib/utils";

export default function OrganizationGroup({ section, committees, onOpen, defaultOpen = false }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const [open, setOpen] = useState(defaultOpen);
  const badge = (section.badges || [])[0] || null;

  return (
    <div className="raqeem-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-start hover:bg-secondary/20 transition-colors"
      >
        <OrganizationIdentity org={section.owning_org} size="header" showName={false} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground leading-tight">
            {isAr ? section.title_ar : section.title_en}
          </span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">
            {t(`${committees.length} لجان`, `${committees.length} committees`)}
            {badge && ` · ${t(badge.ar, badge.en)}`}
          </span>
        </span>
        <ChevronDown
          className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <div className="divide-y divide-border border-t border-border">
            {committees.map((c) => (
              <CommitteeRow key={c.public_id} committee={c} onOpen={onOpen} />
            ))}
          </div>
          {section.notice_ar && (
            <p className="px-4 py-2 text-[11px] text-accent bg-secondary/20 border-t border-border">
              {t(section.notice_ar, section.notice_en)}
            </p>
          )}
        </>
      )}
    </div>
  );
}