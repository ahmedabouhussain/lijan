import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Building2, ArrowRight, Loader2, AlertCircle, Users,
  CheckCircle2, Info, Link as LinkIcon, Palette, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QATARI_ENTITIES } from "@/lib/qatariEntities";
import EntitySearchSelect from "@/components/raqeem/EntitySearchSelect";
import { BRAND } from "@/lib/brand";

const ORG_TYPES = [
  { value: "ministry", label: "وزارة · Ministry" },
  { value: "authority", label: "هيئة · Authority" },
  { value: "council", label: "مجلس · Council" },
  { value: "organization", label: "منظمة · Organization" },
  { value: "agency", label: "وكالة · Agency" },
  { value: "committee", label: "لجنة · Committee" },
  { value: "other", label: "أخرى · Other" },
];

// Map entity categories → default org type
const CATEGORY_TO_TYPE = {
  ministry: "ministry",
  authority: "authority",
  semi_government: "organization",
  holding: "organization",
  bank: "organization",
  insurance: "organization",
  private: "organization",
  judicial: "authority",
};

const OTHER_ID = "__other__";

export default function CreatePortal() {
  const navigate = useNavigate();
  const [entityId, setEntityId] = useState("");
  const [customAr, setCustomAr] = useState("");
  const [customEn, setCustomEn] = useState("");
  const [customType, setCustomType] = useState("organization");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#8A1538");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingPortal, setExistingPortal] = useState(null);
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);

  const selectedEntity = QATARI_ENTITIES.find((e) => e.id === entityId);
  const isOther = entityId === OTHER_ID;

  // Derived name_ar / name_en / type
  const name_ar = isOther ? customAr.trim() : (selectedEntity?.ar || "");
  const name_en = isOther ? customEn.trim() : (selectedEntity?.en || "");
  const type = isOther ? customType : (selectedEntity ? CATEGORY_TO_TYPE[selectedEntity.category] || "organization" : "organization");

  // Auto-generate slug from entity id
  const effectiveSlug = isOther ? slug : (selectedEntity ? selectedEntity.id : "");

  // Check for existing portal when a known entity is selected
  const checkExisting = async (entity) => {
    setExistingPortal(null);
    setError("");
    if (!entity) return;
    setChecking(true);
    try {
      const res = await base44.functions.invoke("CheckExistingPortal", {
        name_ar: entity.ar,
        name_en: entity.en,
      });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else if (data.exists) {
        setExistingPortal(data);
      }
    } catch (e) {
      // Silently fail — don't block creation
    }
    setChecking(false);
  };

  const handleEntityChange = (e) => {
    const val = e.target.value;
    setEntityId(val);
    setExistingPortal(null);
    setError("");
    if (val && val !== OTHER_ID) {
      const entity = QATARI_ENTITIES.find((x) => x.id === val);
      if (entity) checkExisting(entity);
    }
  };

  const submit = async () => {
    if (!entityId) {
      setError("الرجاء اختيار الجهة · Please select an entity");
      return;
    }
    if (isOther && (!customAr.trim() || !customEn.trim())) {
      setError("الاسم العربي والإنجليزي مطلوبان · Arabic and English names are required");
      return;
    }
    if (isOther && !slug.trim()) {
      setError("المعرّف المختصر مطلوب · Portal short link is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("ProvisionOrganizationPortal", {
        name_ar, name_en, type,
        slug: effectiveSlug,
        branding_primary_color: color,
        description,
      });
      const data = res.data || res;
      if (data.conflict) {
        // Server detected a name-based duplicate — show join option
        setExistingPortal(data);
      } else if (data.error) {
        setError(data.error);
      } else {
        navigate(data.portal_url);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر إنشاء البوابة");
    }
    setSubmitting(false);
  };

  const joinExisting = async () => {
    if (!existingPortal?.organization?.id) return;
    setJoining(true);
    setError("");
    try {
      const res = await base44.functions.invoke("JoinOrganization", {
        organization_id: existingPortal.organization.id,
      });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        navigate(data.portal_url);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر الانضمام");
    }
    setJoining(false);
  };

  const showForm = entityId && !existingPortal;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">إنشاء بوابة دخول</h1>
          <p className="text-sm text-muted-foreground">
            Create Entry Portal · ستحصل على دور مالك البوابة
          </p>
        </div>

        <div className="raqeem-card p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Entity Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="entity">
              الجهة · Organization <span className="text-destructive">*</span>
            </Label>
            <EntitySearchSelect
              value={entityId}
              onChange={(val) => handleEntityChange({ target: { value: val } })}
              includeOther
              placeholder="— ابحث أو اختر الجهة · Search or select entity —"
            />
            <p className="text-xs text-muted-foreground">
              الجهات الحكومية وشبه الحكومية والقابضة والخاصة المعتمدة في قطر
            </p>
          </div>

          {/* Checking indicator */}
          {checking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارٍ التحقق من البوابات الموجودة · Checking existing portals…</span>
            </div>
          )}

          {/* Existing portal conflict */}
          {existingPortal && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-md bg-amber-50 border border-amber-200">
                <Info className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-amber-900">
                    توجد بوابة منشأة لهذه الجهة
                  </p>
                  <p className="text-xs text-amber-800">
                    Portal already exists for this entity
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-amber-900">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="font-medium">{existingPortal.organization.name_ar}</span>
                      <span className="text-amber-700">· {existingPortal.organization.name_en}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <span>المالك · Owner: {existingPortal.organization.owner_name || "—"}</span>
                    </div>
                    {existingPortal.is_member && (
                      <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        أنت عضو بالفعل · You are already a member
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={joinExisting}
                disabled={joining}
                className="w-full h-10 inline-flex items-center justify-center gap-2"
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {existingPortal.is_member
                  ? "الانتقال إلى البوابة · Go to Portal"
                  : "الانضمام إلى البوابة · Join Portal"}
              </Button>
            </div>
          )}

          {/* "Other" custom fields */}
          {isOther && !existingPortal && (
            <div className="space-y-4 p-4 rounded-md bg-secondary/30 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                بيانات الجهة المخصصة · Custom Entity Details
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custom_ar">الاسم (عربي) *</Label>
                  <Input
                    id="custom_ar"
                    value={customAr}
                    onChange={(e) => setCustomAr(e.target.value)}
                    placeholder="اسم الجهة"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom_en">Name (English) *</Label>
                  <Input
                    id="custom_en"
                    value={customEn}
                    onChange={(e) => setCustomEn(e.target.value)}
                    placeholder="Entity name"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom_type">نوع المنظمة · Organization Type</Label>
                <select
                  id="custom_type"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Portal Address (clarified) */}
          {showForm && (
            <>
              {isOther && (
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    المعرّف المختصر للبوابة · Portal Short Link <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">/o/</span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, ""))}
                      placeholder="my-entity"
                      dir="ltr"
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    هذا هو الرابط المختصر الذي يظهر في شريط المتصفح للوصول إلى بوابتك.
                    سيُضاف معرف فريد تلقائياً (مثل <span dir="ltr" className="font-mono">/o/my-entity--org_abc123</span>) لمنع التضارب مع بوابات أخرى.
                  </p>
                </div>
              )}
              {!isOther && selectedEntity && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    المعرّف المختصر للبوابة · Portal Short Link
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">/o/</span>
                    <Input
                      value={effectiveSlug}
                      disabled
                      dir="ltr"
                      className="font-mono bg-secondary/40"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    معرّف مختصر ثابت للجهة المختارة. سيُضاف معرف فريد تلقائياً لمنع التضارب.
                  </p>
                </div>
              )}

              {/* Primary Color */}
              <div className="space-y-1.5">
                <Label htmlFor="color" className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  اللون الرئيسي · Primary Color
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-9 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    dir="ltr"
                    className="flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  الوصف · Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="وصف موجز للجهة · Brief description of the entity"
                  rows={3}
                />
              </div>

              {/* Trial notice */}
              <div className="p-3 rounded-md bg-secondary/40 text-xs text-muted-foreground leading-relaxed">
                بإنشائك البوابة، توافق على شروط الاستخدام التجريبي. ستظهر علامة "بيئة تجريبية" حتى يتم التحقق الرسمي.
              </div>

              {/* Submit */}
              <Button
                onClick={submit}
                disabled={submitting}
                className="w-full h-10 inline-flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
                {submitting ? "جارٍ الإنشاء..." : "إنشاء البوابة"}
              </Button>
            </>
          )}

          {/* Back link */}
          <button
            onClick={() => navigate("/")}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← العودة للرئيسية · Back to home
          </button>
        </div>
      </div>
    </div>
  );
}