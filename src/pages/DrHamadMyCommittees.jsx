import React, { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { COMMITTEE_FILTERS } from "@/lib/drHamadPersona";
import DrHamadHeader from "@/components/drhamad/DrHamadHeader";
import DrHamadCommitteeCard from "@/components/drhamad/DrHamadCommitteeCard";
import { cn } from "@/lib/utils";

export default function DrHamadMyCommittees() {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let stale = false;
    (async () => {
      const res = await base44.functions.invoke("GetDrHamadPortfolio", {});
      if (!stale) {
        setData(res.data || res);
        setLoading(false);
      }
    })();
    return () => { stale = true; };
  }, []);

  const committees = data?.committees || [];
  const filtered = useMemo(() => {
    switch (filter) {
      case "chair": case "vice_chair": case "member": case "secretary":
        return committees.filter((c) => c.role === filter);
      case "qdb":
        return committees.filter((c) => c.owning_organization?.name_en === "Qatar Development Bank");
      case "national":
        return committees.filter((c) => c.committee_ref === "DEMO-COMM-NATIONAL-SME");
      case "external":
        return committees.filter((c) => c.owning_organization?.name_en === "ELAN Group");
      case "needs_action":
        return committees.filter((c) => c.requires_my_action);
      default:
        return committees;
    }
  }, [committees, filter]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <DrHamadHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("لجاني", "My Committees")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              `${data?.totals?.committees || 0} لجان نشطة · ${data?.totals?.chair || 0} كرئيس · ${data?.totals?.vice_chair || 0} كنائب رئيس · ${data?.totals?.member || 0} كعضو · ${data?.totals?.secretary || 0} كأمين سر`,
              `${data?.totals?.committees || 0} active committees · ${data?.totals?.chair || 0} as Chair · ${data?.totals?.vice_chair || 0} as Vice-Chair · ${data?.totals?.member || 0} as Member · ${data?.totals?.secretary || 0} as Secretary`
            )}
          </p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {COMMITTEE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              )}
            >
              {t(f.ar, f.en)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <DrHamadCommitteeCard key={c.committee_ref} committee={c} />
          ))}
        </div>
      </main>
    </div>
  );
}