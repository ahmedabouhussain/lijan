// LIJAN™ — Organization Assets Registry (administration).
//
// The central register of institutional identity assets. Every mark is imported from an official
// publisher, quality-checked and stored in the app's own storage; nothing renders until it is
// approved and activated here. Platform administration only — never a committee power.

import React, { useState, useEffect, useCallback } from "react";
import { Shield, Building2, RefreshCw, Check, X, Power, ExternalLink, Loader2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import PageHeader from "@/components/raqeem/PageHeader";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { OFFICIAL_ORG_SOURCES, GOVERNMENT_BRAND_ASSETS_URL, ASSET_VERIFICATION_LABELS } from "@/lib/officialOrgSources";
import { L } from "@/lib/l10n";

export default function OrganizationAssetsAdmin() {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";

  const [user, setUser] = useState(undefined);
  const [orgs, setOrgs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => setUser(u || null)).catch(() => setUser(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, a] = await Promise.all([
        base44.entities.Organization.list("-created_date", 200),
        base44.entities.OrganizationAsset.list("-created_date", 300),
      ]);
      setOrgs(o || []);
      setAssets(a || []);
    } catch {
      setOrgs([]); setAssets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user?.role === "admin") load(); }, [user, load]);

  if (user === undefined) return <TableSkeleton rows={4} />;

  if (user?.role !== "admin") {
    return (
      <div className="raqeem-card p-8 text-center">
        <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          {t("سجل الأصول المؤسسية متاح لمسؤولي المنصة فقط.", "The institutional asset registry is available to platform administrators only.")}
        </p>
      </div>
    );
  }

  const activeFor = (orgId) =>
    assets.filter((a) => a.organization_id === orgId && a.is_active && a.verification_status === "approved")[0] || null;
  const historyFor = (orgId) =>
    assets.filter((a) => a.organization_id === orgId).sort((a, b) => (b.version || 0) - (a.version || 0));

  const act = async (asset, patch, description) => {
    setBusy(asset.id); setError(""); setNotice("");
    try {
      // Only one mark per organization may be the resolved one.
      if (patch.is_active === true) {
        const siblings = assets.filter((a) => a.organization_id === asset.organization_id && a.id !== asset.id && a.is_active);
        for (const s of siblings) await base44.entities.OrganizationAsset.update(s.id, { is_active: false });
      }
      await base44.entities.OrganizationAsset.update(asset.id, patch);
      if (patch.is_active === true) {
        // The organization record points at the approved asset, so every surface resolves it.
        await base44.entities.Organization.update(asset.organization_id, { logo_url: asset.stored_path });
      }
      await base44.entities.AuditEvent.create({
        organization_id: asset.organization_id,
        actor_user_id: user.id, actor_name: user.full_name || user.email, actor_email: user.email,
        action: "update", entity_type: "OrganizationAsset", entity_id: asset.id,
        entity_title: asset.filename, description,
        old_value: asset.verification_status, new_value: patch.verification_status || asset.verification_status,
      }).catch(() => {});
      setNotice(description);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر تنفيذ الإجراء.", "The action could not be completed."));
    }
    setBusy(null);
  };

  const importAsset = async () => {
    if (!selectedOrg || !sourceUrl) return;
    setBusy("import"); setError(""); setNotice("");
    try {
      const res = await base44.functions.invoke("ImportOrganizationAsset", {
        organization_id: selectedOrg,
        source_url: sourceUrl,
      });
      if (res.data?.error) {
        setError(`${res.data.error}${res.data.reason ? ` (${res.data.reason})` : ""}`);
      } else {
        setNotice(t("تم الاستيراد بنجاح — الأصل بانتظار الاعتماد.", "Imported successfully — the asset is awaiting approval."));
        setSourceUrl("");
        await load();
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر الاستيراد.", "The import failed."));
    }
    setBusy(null);
  };

  // Organizations that already carry a mark (from the registry or their own record).
  const covered = orgs.filter((o) => historyFor(o.id).length > 0 || o.logo_url);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Shield}
        title={t("سجل الأصول المؤسسية", "Organization Assets Registry")}
        subtitle={t(
          "المصدر المركزي الوحيد للشعارات المؤسسية: الاستيراد من المصادر الرسمية، الفحص، الاعتماد، والإصدارات.",
          "The single central source of institutional marks: official import, quality gates, approval and versioning."
        )}
        badge={<span className="text-sm text-muted-foreground arabic-figures">({assets.length})</span>}
      />

      <div className="raqeem-card p-4 border-l-4 border-l-accent">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
            <p>
              {t(
                "تُنزَّل الشعارات عند الاستيراد فقط وتُخزَّن داخل المنصة، فلا يتم أي ربط مباشر بالمواقع الرسمية وقت فتح الصفحات.",
                "Marks are downloaded at import time and stored inside the platform, so no page ever hotlinks an official website."
              )}
            </p>
            <p>
              {t("بوابة أصول الهوية الحكومية الرسمية:", "Official government brand assets portal:")}{" "}
              <a href={GOVERNMENT_BRAND_ASSETS_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                gba.gco.gov.qa <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Import */}
      <section className="raqeem-card p-4">
        <h2 className="text-sm font-semibold mb-3">{t("استيراد أصل رسمي", "Import an official asset")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="asset-org">{t("الجهة", "Institution")}</Label>
            <select
              id="asset-org"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">{t("اختر الجهة…", "Select an institution…")}</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{isAr ? o.name_ar : o.name_en}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="asset-url">{t("رابط الأصل من الموقع الرسمي", "Asset URL from the official website")}</Label>
            <Input
              id="asset-url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.example.gov.qa/logo.svg"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={importAsset} disabled={!selectedOrg || !sourceUrl || busy === "import"}>
            {busy === "import" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
            {t("استيراد", "Import")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("يُقبل SVG رسمي، أو PNG شفاف لا يقل عن 1024 بكسل.", "Accepts an official SVG, or a transparent PNG of at least 1024px.")}
          </span>
        </div>
      </section>

      {notice && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">{notice}</p>}
      {error && <p role="alert" className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">{error}</p>}

      {/* Registry */}
      <section className="raqeem-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Building2 className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          {t("الأصول المسجّلة", "Registered assets")}
        </h2>

        {loading ? (
          <TableSkeleton rows={4} />
        ) : covered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t("لا توجد أصول مسجّلة", "No registered assets")}
            description={t("ابدأ باستيراد الشعار الرسمي للجهة من موقعها الرسمي.", "Start by importing an institution's official mark from its official website.")}
          />
        ) : (
          <ul className="divide-y divide-border -mx-4">
            {covered.map((org) => {
              const active = activeFor(org.id);
              const history = historyFor(org.id);
              const current = active || history[0] || null;
              return (
                <li key={org.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <OrganizationMark org={org} logoUrl={active?.stored_path} size="card" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{isAr ? org.name_ar : org.name_en}</p>
                      <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        {current?.source_domain && <span>{current.source_domain}</span>}
                        {current?.version && <span className="arabic-figures">{t(`الإصدار ${current.version}`, `Version ${current.version}`)}</span>}
                        {current?.sha256 && <span className="font-mono">{current.sha256.slice(0, 12)}…</span>}
                        {current?.retrieved_at && <span className="arabic-figures">{L.date(current.retrieved_at)}</span>}
                      </div>
                      {current && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusBadge
                            label={L.label(ASSET_VERIFICATION_LABELS, current.verification_status, current.verification_status)}
                            colorClass={ASSET_VERIFICATION_LABELS[current.verification_status]?.color}
                          />
                          {current.is_active && <StatusBadge label={t("مُفعّل", "Active")} colorClass="text-primary bg-primary/10" />}
                        </div>
                      )}
                    </div>
                  </div>

                  {current && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {current.verification_status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => act(current, { verification_status: "approved", approved_by: user.full_name || user.email, approved_at: new Date().toISOString() }, t("تم اعتماد الأصل.", "Asset approved."))}
                          disabled={busy === current.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" aria-hidden="true" />{t("اعتماد", "Approve")}
                        </button>
                      )}
                      {current.verification_status === "approved" && !current.is_active && (
                        <button
                          type="button"
                          onClick={() => act(current, { is_active: true }, t("تم تفعيل الأصل وربطه بالجهة.", "Asset activated and linked to the institution."))}
                          disabled={busy === current.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-primary/5 disabled:opacity-50"
                        >
                          <Power className="w-3 h-3" aria-hidden="true" />{t("تفعيل", "Activate")}
                        </button>
                      )}
                      {current.is_active && (
                        <button
                          type="button"
                          onClick={() => act(current, { is_active: false, verification_status: "inactive" }, t("تم تعطيل الأصل.", "Asset deactivated."))}
                          disabled={busy === current.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary/50 disabled:opacity-50"
                        >
                          <Power className="w-3 h-3" aria-hidden="true" />{t("تعطيل", "Deactivate")}
                        </button>
                      )}
                      {current.verification_status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => act(current, { verification_status: "rejected", is_active: false, rejection_reason: t("غير مطابق لقواعد الهوية", "Fails the identity rules") }, t("تم رفض الأصل.", "Asset rejected."))}
                          disabled={busy === current.id}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-destructive/5 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />{t("رفض", "Reject")}
                        </button>
                      )}
                      {current.source_url && (
                        <a
                          href={current.source_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-secondary/50"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />{t("المصدر", "Source")}
                        </a>
                      )}
                      {history.length > 1 && (
                        <span className="text-xs text-muted-foreground arabic-figures">
                          {t(`${history.length} إصدارات محفوظة`, `${history.length} versions retained`)}
                        </span>
                      )}
                    </div>
                  )}
                  {busy === current?.id && <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />{t("جارٍ التنفيذ…", "Working…")}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Sanctioned sources */}
      <section className="raqeem-card p-4">
        <h2 className="text-sm font-semibold mb-1">{t("سجل المصادر الرسمية", "Register of official sources")}</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t(
            "يُقبل الاستيراد من هذه الجهات فقط. لا تُستخدم الصحف أو الشبكات الاجتماعية أو مواقع تجميع الشعارات.",
            "Imports are accepted from these publishers only. Press, social networks and logo aggregators are never used."
          )}
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {OFFICIAL_ORG_SOURCES.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-2 text-xs border border-border rounded-md px-2.5 py-2">
              <span className="truncate">{isAr ? s.name_ar : s.name_en}</span>
              <a href={s.site} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 shrink-0">
                {t("الموقع", "Site")} <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}