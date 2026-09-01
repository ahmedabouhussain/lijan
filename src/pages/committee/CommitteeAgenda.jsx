import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { ClipboardList } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const READINESS = {
  ready: { ar: "جاهز", en: "Ready", color: "bg-emerald-100 text-emerald-700" },
  needs_attention: { ar: "يحتاج اهتمام", en: "Needs Attention", color: "bg-amber-100 text-amber-700" },
  not_ready: { ar: "غير جاهز", en: "Not Ready", color: "bg-red-100 text-red-700" },
};

const STATUS = {
  pending: { ar: "معلق", en: "Pending", color: "bg-secondary text-muted-foreground" },
  in_discussion: { ar: "قيد المناقشة", en: "In Discussion", color: "bg-blue-100 text-blue-700" },
  decided: { ar: "تم القرار", en: "Decided", color: "bg-emerald-100 text-emerald-700" },
  deferred: { ar: "مؤجل", en: "Deferred", color: "bg-amber-100 text-amber-700" },
  withdrawn: { ar: "مسحب", en: "Withdrawn", color: "bg-red-100 text-red-700" },
};

export default function CommitteeAgenda() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.committee?.id) return;
    const meetingIds = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])].map((m) => m.id);
    if (meetingIds.length === 0) { setItems([]); setLoading(false); return; }
    // Fetch all agenda items and filter client-side by meeting IDs
    base44.entities.AgendaItem.list()
      .then((all) => {
        const filtered = (all || []).filter((a) => meetingIds.includes(a.meeting_id));
        filtered.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        setItems(filtered);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [data?.committee?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("جدول الأعمال", "Agenda")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t("لا توجد بنود", "No Agenda Items")} description={t("لم يتم إضافة بنود لجدول أعمال أي اجتماع.", "No agenda items added for any meeting.")} />
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const ri = READINESS[a.readiness] || READINESS.not_ready;
            const si = STATUS[a.status] || STATUS.pending;
            return (
              <div key={a.id} className="raqeem-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{a.sequence}</span>
                    <span className="text-sm font-medium">{a.title_ar || a.title}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <StatusBadge label={t(ri.ar, ri.en)} colorClass={ri.color} />
                    <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
                  </div>
                </div>
                {a.objective && <p className="text-xs text-muted-foreground">{a.objective}</p>}
                {a.presenter && <p className="text-xs text-muted-foreground mt-1">{t("المقدم", "Presenter")}: {a.presenter}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}