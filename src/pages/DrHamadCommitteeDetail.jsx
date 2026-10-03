import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { ROLE_LABELS } from "@/lib/drHamadPersona";
import DrHamadHeader from "@/components/drhamad/DrHamadHeader";

export default function DrHamadCommitteeDetail() {
  const { committeeRef } = useParams();
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("GetDrHamadCommitteeContext", { committee_ref: committeeRef });
        if (!stale) setData(res.data || res);
      } catch (e) {
        if (!stale) setError(e?.response?.data?.error || t("تعذر الوصول إلى هذه اللجنة", "Could not access this committee"));
      }
      if (!stale) setLoading(false);
    })();
    return () => { stale = true; };
  }, [committeeRef]);

  if (loading) {
    return <div className="fixed inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
        <DrHamadHeader />
        <div className="max-w-md mx-auto mt-16 text-center p-6">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[data.authority.role]?.[lang] || data.authority.role;
  const contextLine = lang === "ar"
    ? `${data.committee.name_ar} — دورك الحالي: ${roleLabel}${data.authority.classification === "synthetic_demonstration" ? " — تجريبي" : ""}`
    : `${data.committee.name_en} — Your current role: ${roleLabel}${data.authority.classification === "synthetic_demonstration" ? " (synthetic)" : ""}`;

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <DrHamadHeader contextLine={contextLine} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">{lang === "ar" ? data.committee.name_ar : data.committee.name_en}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("الجهة المالكة للجنة", "Owning org")}: {lang === "ar" ? data.committee.owning_organization?.name_ar : data.committee.owning_organization?.name_en}
            {" · "}
            {t("الجهة الأساسية", "Primary org")}: {lang === "ar" ? data.primary_organization.name_ar : data.primary_organization.name_en}
          </p>
        </div>

        {data.authority.chair_actions_blocked && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            {t(
              "صلاحيات رئيس اللجنة غير مفعّلة لهذا السياق — تتطلب تفويضًا نشطًا ومحددًا من رئيس اللجنة.",
              "Chair actions are not active in this context — they require an active, scoped delegation from the Chair."
            )}
          </div>
        )}

        <div className="raqeem-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t("الإجراءات المسموح بها في هذا السياق", "Actions permitted in this context")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.authority.permitted_actions.map((a) => (
              <span key={a} className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-secondary-foreground">{a}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SectionList title={t("جدول الأعمال", "Agenda")} items={data.agendaItems} field="title_ar" fieldEn="title" />
          <SectionList title={t("القرارات", "Decisions")} items={data.decisions} field="title_ar" fieldEn="title" statusField="status" />
          <SectionList title={t("الإجراءات", "Actions")} items={data.actions} field="title_ar" fieldEn="title" statusField="status" />
          <SectionList title={t("المستندات", "Documents")} items={data.documents} field="title_ar" fieldEn="title" statusField="status" />
        </div>
      </main>
    </div>
  );
}

function SectionList({ title, items, field, fieldEn, statusField }) {
  const { lang } = useLanguage();
  return (
    <div className="raqeem-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {(!items || items.length === 0) ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="text-sm text-foreground flex items-center justify-between gap-2">
              <span className="truncate">{lang === "ar" ? item[field] : (item[fieldEn] || item[field])}</span>
              {statusField && <span className="text-[10px] text-muted-foreground shrink-0">{item[statusField]}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}