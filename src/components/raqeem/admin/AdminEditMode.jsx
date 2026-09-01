import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Save, Eye, History, Send, AlertTriangle, Check, RotateCcw, Building2 } from "lucide-react";
import AdminEditForm from "./AdminEditForm";
import AdminVersionHistory from "./AdminVersionHistory";

// AdminEditMode — full-screen page configuration editor.
// Appears when an authorized user clicks "Edit Page".
// Supports AR/EN editing, autosave drafts, preview, publish with reason,
// version history, and restore.
export default function AdminEditMode({ pageKey, committeeId, onClose }) {
  const { t, lang } = useLanguage();
  const { canPublish, canRestore } = useCommitteeAdmin();

  const [tab, setTab] = useState(lang || "ar");
  const [view, setView] = useState("edit");
  const [config, setConfig] = useState(null);
  const [originalConfig, setOriginalConfig] = useState(null);
  const [draftVersion, setDraftVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [conflict, setConflict] = useState(null);
  const [toast, setToast] = useState("");
  const [isInherited, setIsInherited] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("GetEffectivePageConfiguration", {
        committee_id: committeeId,
        page_key: pageKey,
        include_versions: true,
      });
      const d = res.data || res;
      const cfg = d.draft || d.config || { page_key: pageKey, sections: [], labels: {}, visible: true, sidebar_visible: true };
      setConfig(cfg);
      setOriginalConfig(d.config || cfg);
      setVersions(d.versions || []);
      setDraftVersion(d.draft?.draft_version || 1);
      setDirty(!!d.draft);
      // Inheritance: if the effective config's committee_id doesn't match, it's inherited from org or system default
      const effConfig = d.config || {};
      setIsInherited(!effConfig.committee_id || effConfig.committee_id !== committeeId);
    } catch (e) {
      setConfig({ page_key: pageKey, sections: [], labels: {}, visible: true, sidebar_visible: true });
    }
  }, [committeeId, pageKey]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Autosave (debounced 2s)
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => saveDraft(true), 2000);
    return () => clearTimeout(timer);
  }, [dirty, config]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveDraft = async (auto = false) => {
    if (!dirty && !auto) return;
    setSaving(true);
    setConflict(null);
    try {
      const res = await base44.functions.invoke("SavePageConfigurationDraft", {
        committee_id: committeeId,
        page_key: pageKey,
        configuration: config,
        expected_draft_version: draftVersion,
      });
      const d = res.data || res;
      if (d.conflict) {
        setConflict(d);
      } else {
        setDraftVersion(d.draft?.draft_version || draftVersion + 1);
        setDirty(false);
        if (!auto) setToast(t("تم حفظ المسودة", "Draft saved"));
      }
    } catch (e) {
      setToast(t("خطأ في الحفظ", "Save error"));
    }
    setSaving(false);
  };

  const publish = async () => {
    setPublishing(true);
    setConflict(null);
    try {
      const res = await base44.functions.invoke("PublishPageConfiguration", {
        committee_id: committeeId,
        page_key: pageKey,
        change_reason: changeReason,
        effective_from: effectiveFrom || undefined,
        expected_draft_version: draftVersion,
      });
      const d = res.data || res;
      if (d.conflict) {
        setConflict(d);
      } else {
        setToast(t("تم النشر بنجاح", "Published successfully"));
        setShowPublishDialog(false);
        setChangeReason("");
        setEffectiveFrom("");
        await loadConfig();
      }
    } catch (e) {
      setToast(t("خطأ في النشر", "Publish error"));
    }
    setPublishing(false);
  };

  const restore = async (versionNumber, reason) => {
    try {
      await base44.functions.invoke("RestorePageConfigurationVersion", {
        committee_id: committeeId,
        page_key: pageKey,
        version_number: versionNumber,
        change_reason: reason,
      });
      setToast(t("تم استعادة الإصدار", "Version restored"));
      await loadConfig();
    } catch (e) {
      setToast(t("خطأ في الاستعادة", "Restore error"));
    }
  };

  const resetToOrgDefault = async () => {
    setResetting(true);
    try {
      await base44.functions.invoke("ResetPageConfigurationToOrganization", {
        committee_id: committeeId,
        page_key: pageKey,
        reason: resetReason,
      });
      setToast(t("تم إعادة التعيين", "Reset to org default"));
      setShowResetDialog(false);
      setResetReason("");
      await loadConfig();
    } catch (e) {
      setToast(t("خطأ في إعادة التعيين", "Reset error"));
    }
    setResetting(false);
  };

  const handleConfigChange = (newConfig) => {
    setConfig(newConfig);
    setDirty(true);
  };

  const handleClose = () => {
    if (dirty) {
      if (!window.confirm(t("هناك تغييرات غير محفوظة. هل تريد المغادرة؟", "You have unsaved changes. Leave anyway?"))) return;
    }
    onClose();
  };

  // Compute diff for before/after comparison
  const diffFields = [];
  if (originalConfig && config) {
    const fields = ["title_ar", "title_en", "description_ar", "description_en", "guidance_ar", "guidance_en", "empty_state_ar", "empty_state_en", "visible", "sidebar_visible", "sidebar_order"];
    fields.forEach((f) => {
      const oldVal = originalConfig[f];
      const newVal = config[f];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diffFields.push({ field: f, old: oldVal, new: newVal });
      }
    });
  }

  if (!config) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Admin Edit Mode Banner */}
      <div className="px-4 py-2 bg-primary text-primary-foreground flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="px-2 py-0.5 rounded bg-primary-foreground/20 text-xs">{t("وضع تحرير المدير", "Admin Edit Mode")}</span>
          <span className="hidden sm:inline text-primary-foreground/70 text-xs">{pageKey}</span>
          {dirty && <span className="text-primary-foreground/60 text-xs">· {t("غير محفوظ", "Unsaved")}</span>}
          {saving && <span className="text-primary-foreground/60 text-xs">· {t("جارٍ الحفظ...", "Saving...")}</span>}
        </div>
        <button onClick={handleClose} className="p-1.5 hover:bg-primary-foreground/10 rounded" aria-label={t("إغلاق", "Close")}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs: Edit / Preview / History + AR/EN */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => setView("edit")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            <Save className="w-3.5 h-3.5" /> {t("تحرير", "Edit")}
          </button>
          <button onClick={() => setView("preview")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            <Eye className="w-3.5 h-3.5" /> {t("معاينة", "Preview")}
          </button>
          <button onClick={() => setView("history")} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${view === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
            <History className="w-3.5 h-3.5" /> {t("السجل", "History")}
          </button>
        </div>
        {view === "edit" && (
          <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
            <button onClick={() => setTab("ar")} className={`px-3 py-1 rounded text-sm ${tab === "ar" ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>عربي</button>
            <button onClick={() => setTab("en")} className={`px-3 py-1 rounded text-sm ${tab === "en" ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}>EN</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Inheritance Indicator */}
          {view === "edit" && isInherited && !dirty && (
            <div className="mb-3 p-3 rounded-md bg-secondary/60 border border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-4 h-4 shrink-0 text-primary" />
              <span className="flex-1">{t("هذا التكوين موروث من مستوى المنظمة. أي تعديل سينشئ تجاوزاً خاصاً باللجنة.", "This configuration is inherited from organization level. Any edit will create a committee-specific override.")}</span>
            </div>
          )}
          {view === "edit" && !isInherited && !dirty && (
            <div className="mb-3 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
              <Check className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t("هذا التكوين خاص بهذه اللجنة (تجاوز).", "This configuration is committee-specific (override).")}</span>
            </div>
          )}
          {view === "edit" && <AdminEditForm config={config} onChange={handleConfigChange} tab={tab} />}
          {view === "preview" && (
            <div className="space-y-4">
              <div className="raqeem-card p-5">
                <h1 className="text-lg font-bold">{tab === "ar" ? config.title_ar || pageKey : config.title_en || pageKey}</h1>
                {(config.description_ar || config.description_en) && (
                  <p className="text-sm text-muted-foreground mt-1">{tab === "ar" ? config.description_ar : config.description_en}</p>
                )}
                {(config.guidance_ar || config.guidance_en) && (
                  <div className="mt-3 p-3 rounded-md bg-secondary/60 text-xs text-muted-foreground">
                    {tab === "ar" ? config.guidance_ar : config.guidance_en}
                  </div>
                )}
                <div className="mt-4 p-4 rounded-md bg-secondary/30 text-center text-sm text-muted-foreground">
                  {tab === "ar" ? config.empty_state_ar || "لا توجد بيانات" : config.empty_state_en || "No data"}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {t("الأقسام الظاهرة", "Visible Sections")}: {(config.sections || []).filter((s) => s.visible !== false).length} / {(config.sections || []).length}
                </div>
              </div>
            </div>
          )}
          {view === "history" && <AdminVersionHistory versions={versions} canRestore={canRestore} onRestore={restore} />}
        </div>
      </div>

      {/* Footer Actions */}
      {view === "edit" && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-2 bg-card">
          <div className="text-xs text-muted-foreground">
            {dirty ? t("تغييرات غير محفوظة", "Unsaved changes") : t("محفوظ", "Saved")}
          </div>
          <div className="flex items-center gap-2">
            {canRestore && !isInherited && (
              <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(true)} disabled={dirty || resetting} className="min-h-[44px] text-destructive">
                <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{t("إعادة لتكوين المنظمة", "Reset to Org")}</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => saveDraft(false)} disabled={!dirty || saving} className="min-h-[44px]">
              <Save className="w-3.5 h-3.5" /> {t("حفظ المسودة", "Save Draft")}
            </Button>
            {canPublish && (
              <Button size="sm" onClick={() => setShowPublishDialog(true)} disabled={dirty || publishing} className="min-h-[44px]">
                <Send className="w-3.5 h-3.5" /> {t("نشر", "Publish")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Publish Dialog */}
      {showPublishDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPublishDialog(false)}>
          <div className="bg-card rounded-lg p-5 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold">{t("نشر التكوين", "Publish Configuration")}</h3>
            {diffFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{t("التغييرات", "Changes")} ({diffFields.length})</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {diffFields.map((d) => (
                    <div key={d.field} className="text-xs flex items-start gap-2 p-2 rounded bg-secondary/30">
                      <span className="font-medium text-muted-foreground shrink-0">{d.field}</span>
                      <span className="text-red-600 line-through flex-1">{String(d.old || "—").slice(0, 50)}</span>
                      <span className="text-emerald-700 flex-1">{String(d.new || "—").slice(0, 50)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">{t("سبب النشر", "Publish Reason")} *</Label>
              <Textarea value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder={t("مثال: تحديث عنوان الصفحة وتعديل ترتيب الأقسام", "e.g., Update page title and reorder sections")} rows={2} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("تاريخ السريان", "Effective From")}</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowPublishDialog(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button size="sm" onClick={publish} disabled={!changeReason.trim() || publishing} className="min-h-[44px]">
                {publishing ? t("جارٍ النشر...", "Publishing...") : t("نشر", "Publish")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset to Org Default Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowResetDialog(false)}>
          <div className="bg-card rounded-lg p-5 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-destructive">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-sm font-bold">{t("إعادة تعيين التكوين", "Reset Configuration")}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("سيتم حذف التكوين الخاص بهذه اللجنة والعودة إلى تكوين المنظمة الافتراضي. لا يمكن التراجع عن هذا الإجراء.", "This will remove the committee-specific configuration and revert to the organization default. This action cannot be undone.")}
            </p>
            <div>
              <Label className="text-xs text-muted-foreground">{t("سبب إعادة التعيين", "Reset Reason")} *</Label>
              <Textarea value={resetReason} onChange={(e) => setResetReason(e.target.value)} placeholder={t("مثال: التكوين الخاص لم يعد ضرورياً", "e.g., Committee-specific config no longer needed")} rows={2} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowResetDialog(false)}>{t("إلغاء", "Cancel")}</Button>
              <Button variant="destructive" size="sm" onClick={resetToOrgDefault} disabled={!resetReason.trim() || resetting} className="min-h-[44px]">
                {resetting ? t("جارٍ إعادة التعيين...", "Resetting...") : t("إعادة التعيين", "Reset")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Dialog */}
      {conflict && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setConflict(null)}>
          <div className="bg-card rounded-lg p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold">{t("تعارض", "Conflict")}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t("تم تعديل هذا التكوين بواسطة مستخدم آخر. أعد التحميل لمشاهدة أحدث نسخة.", "This configuration was modified by another user. Reload to see the latest version.")}</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConflict(null)}>{t("إغلاق", "Close")}</Button>
              <Button size="sm" onClick={() => { setConflict(null); loadConfig(); }}>{t("إعادة تحميل", "Reload")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-md bg-foreground text-background text-sm shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  );
}