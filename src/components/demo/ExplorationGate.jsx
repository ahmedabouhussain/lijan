import React, { useState } from "react";
import { Compass, ShieldCheck, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

// ExplorationGate — the ONE answer a real account receives when it opens a link to a demonstration
// record. The real session is never widened: the server mints an isolated exploration session, and
// the SAME record is re-opened inside it. This surface offers no persona picker and sends no
// authority — it names the target path and nothing else. The persona, the dataset and the committee
// scope are the server's decision.
export default function ExplorationGate() {
  const { t, dir } = useLanguage();
  const { adoptDemoSession, exitDemo, isDemoMode } = useEffectiveActor();
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  const open = async () => {
    setWorking(true);
    setFailed(false);
    try {
      const res = await base44.functions.invoke("EnterExploration", {
        target_path: `${window.location.pathname}${window.location.search}`,
      });
      const issued = res?.data || res;
      if (!issued?.showcase_token) throw new Error("issuance_unavailable");
      // A previous exploration session must not merge with this one — it is revoked, then replaced.
      if (isDemoMode) exitDemo();
      const adopted = adoptDemoSession(issued);
      if (!adopted) throw new Error("persona_unresolved");
      // The surface reloads under the exploration principal and reopens this same record.
    } catch {
      setFailed(true);
      setWorking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-app gap-3 px-4" dir={dir}>
      <div className="w-16 h-16 rounded-2xl bg-accent/8 ring-1 ring-accent/15 flex items-center justify-center">
        <Compass className="w-7 h-7 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground max-w-md text-center">
        {t("هذا السجل متاح ضمن تجربة الاستكشاف", "This record is available in the exploration experience")}
      </p>
      <p className="text-xs text-muted-foreground max-w-md text-center">
        {t(
          "سجلات العرض الاصطناعية لا تُقرأ من الحساب المؤسسي الحقيقي. تُنشأ جلسة استكشاف معزولة من الخادم، ويُعاد فتح السجل نفسه داخلها دون أي تغيير في حسابك أو صلاحياتك.",
          "Synthetic demonstration records are never read through a real institutional account. An isolated exploration session is created by the server, and the same record reopens inside it — your account and permissions are unchanged."
        )}
      </p>
      <p className="text-xs text-muted-foreground max-w-md text-center flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {t(
          "جلسة قصيرة العمر، مقيدة بمجموعة العرض، وبلا صلاحية كتابة.",
          "A short-lived session, limited to the demonstration scope, with no write authority."
        )}
      </p>

      <button
        type="button"
        onClick={open}
        disabled={working}
        className="mt-1 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium sovereign-focus disabled:opacity-60"
      >
        <Compass className="w-4 h-4" aria-hidden="true" />
        {working
          ? t("جارٍ فتح تجربة الاستكشاف…", "Opening the exploration experience…")
          : t("فتح تجربة الاستكشاف", "Open exploration experience")}
      </button>

      {failed && (
        <div className="flex flex-col items-center gap-1.5 mt-1">
          <p className="text-xs text-destructive max-w-md text-center flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {t(
              "تعذّر إنشاء جلسة الاستكشاف لهذا السجل. أعد المحاولة، أو ادخل من بوابة الاستكشاف.",
              "An exploration session could not be created for this record. Retry, or enter from the exploration gateway."
            )}
          </p>
          <a href="/explore" className="text-primary hover:underline text-sm font-medium">
            {t("بوابة الاستكشاف", "Exploration gateway")}
          </a>
        </div>
      )}
    </div>
  );
}