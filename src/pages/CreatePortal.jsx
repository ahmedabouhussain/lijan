import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Building2, ArrowRight, Loader2, AlertCircle, Users,
  CheckCircle2, Info, Link as LinkIcon, Palette, FileText,
  ShieldCheck, UserPlus, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QATARI_ENTITIES } from "@/lib/qatariEntities";
import EntitySearchSelect from "@/components/raqeem/EntitySearchSelect";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

const ORG_TYPES = [
  { value: "ministry", label: "وزارة · Ministry" },
  { value: "authority", label: "هيئة · Authority" },
  { value: "council", label: "مجلس · Council" },
  { value: "organization", label: "منظمة · Organization" },
  { value: "agency", label: "وكالة · Agency" },
  { value: "committee", label: "لجنة · Committee" },
  { value: "other", label: "أخرى · Other" },
];

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
  const { isDemoMode } = useEffectiveActor();
  const [entityId, setEntityId] = useState("");
  const [customAr, setCustomAr] = useState("");
  const [customEn, setCustomEn] = useState("");
  const [customType, setCustomType] = useState("organization");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#8A1538");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resolution, setResolution] = useState(null);
  const [checking, setChecking] = useState(false);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [joinSubmitted, setJoinSubmitted] = useState(false);

  // Join request form fields
  const [joinJustification, setJoinJustification] = useState("");
  const [joinJobTitle, setJoinJobTitle] = useState("");
  const [joinDepartment, setJoinDepartment] = useState("");

  const selectedEntity = QATARI_ENTITIES.find((e) => e.id === entityId);
  const isOther = entityId === OTHER_ID;

  const name_ar = isOther ? customAr.trim() : (selectedEntity?.ar || "");
  const name_en = isOther ? customEn.trim() : (selectedEntity?.en || "");
  const type = isOther ? customType : (selectedEntity ? CATEGORY_TO_TYPE[selectedEntity.category] || "organization" : "organization");
  const effectiveSlug = isOther ? slug : (selectedEntity ? selectedEntity.id : "");
  const directoryKey = isOther ? null : (selectedEntity ? selectedEntity.id : null);

  // Resolve identity when entity is selected
  const resolveIdentity = async (entity) => {
    setResolution(null);
    setError("");
    if (!entity) return;
    setChecking(true);
    try {
      const res = await base44.functions.invoke("ResolveOrganizationIdentity", {
        directory_key: entity.id,
        name_ar: entity.ar,
        name_en: entity.en,
      });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        setResolution(data);
      }
    } catch (e) {
      // Silently fail — don't block creation
    }
    setChecking(false);
  };

  const handleEntityChange = (val) => {
    setEntityId(val);
    setResolution(null);
    setError("");
    setJoinSubmitted(false);
    if (val && val !== OTHER_ID) {
      const entity = QATARI_ENTITIES.find((x) => x.id === val);
      if (entity) resolveIdentity(entity);
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
        directory_key: directoryKey,
        slug: effectiveSlug,
        branding_primary_color: color,
        description,
        idempotency_key: `prov:${directoryKey || effectiveSlug}`,
      });
      const data = res.data || res;
      if (data.conflict) {
        setResolution({
          result: data.conflict_type === 'organization_exists' ? 'existing_unverified' : 'possible_duplicate',
          organization: data.organization,
        });
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

  const requestJoin = async () => {
    if (!resolution?.organization?.id) return;
    setRequestingJoin(true);
    setError("");
    try {
      const res = await base44.functions.invoke("RequestOrganizationAccess", {
        organization_id: resolution.organization.id,
        requested_role: "member",
        job_title: joinJobTitle || null,
        department: joinDepartment || null,
        justification: joinJustification || null,
      });
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else if (data.redirect) {
        // Org was merged — follow redirect
        navigate(data.portal_url);
      } else if (data.status === 'already_member') {
        navigate(data.portal_url);
      } else {
        setJoinSubmitted(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر إرسال الطلب");
    }
    setRequestingJoin(false);
  };

  // Entity exists — show "entity exists" screen
  const entityExists = resolution && (
    resolution.result === 'existing_verified' ||
    resolution.result === 'existing_unverified' ||
    resolution.result === 'membership_exists' ||
    resolution.result === 'access_request_pending'
  );

  const showForm = entityId && !entityExists && !joinSubmitted;

  // A demonstration persona never holds organization-creation authority — the surface is
  // closed here and the command is denied by the backend as well.
  if (isDemoMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="raqeem-card p-6 max-w-md text-center space-y-3">
          <ShieldCheck className="w-8 h-8 text-accent mx-auto" />
          <h1 className="text-lg font-bold text-foreground">إنشاء بوابة منظمة غير متاح في وضع الاستكشاف</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            دور العرض التجريبي لا يمنح صلاحية إنشاء الجهات.
            <br />
            Organization creation is not available to a demonstration persona.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">العودة للرئيسية · Back to Home</Button>
        </div>
      </div>
    );
  }

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
              onChange={handleEntityChange}
              includeOther
              placeholder="— ابحث أو اختر الجهة · Search or select entity —"
            />
            <p className="text-xs text-muted-foreground">
              الجهات الحكومية وشبه الحكومية والقابضة والبنوك والخاصة المعتمدة في قطر
            </p>
          </div>

          {/* Checking indicator */}
          {checking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارٍ التحقق من البوابات الموجودة · Checking existing portals…</span>
            </div>
          )}

          {/* === ENTITY EXISTS — show "entity exists" screen === */}
          {entityExists && resolution.organization && !joinSubmitted && (
            <div className="space-y-4">
              {/* Entity exists banner */}
              <div className="p-5 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-900">
                      هذه الجهة موجودة بالفعل على لِجان™
                    </p>
                    <p className="text-xs text-amber-700">
                      This entity already exists on the platform
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-amber-200">
                  <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-amber-900">{resolution.organization.name_ar}</div>
                    <div className="text-xs text-amber-700">{resolution.organization.name_en}</div>
                  </div>
                  {resolution.organization.status === 'official_active' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="w-3 h-3" /> موثقة · Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-800 leading-relaxed pt-1">
                  توجد بوابة مؤسسية قائمة لهذه الجهة. يمكنك طلب الانضمام إليها بدل إنشاء بوابة جديدة.
                  <br />
                  A portal already exists for this entity. You can request to join it instead of creating a new one.
                </p>
              </div>

              {/* Membership exists */}
              {resolution.result === 'membership_exists' && (
                <Button
                  onClick={() => navigate(resolution.organization.portal_url)}
                  className="w-full h-10"
                >
                  <ArrowLeft className="w-4 h-4" />
                  الانتقال إلى البوابة · Go to Portal
                </Button>
              )}

              {/* Access request pending */}
              {resolution.result === 'access_request_pending' && (
                <div className="p-4 rounded-md bg-state-info-surface border border-border text-sm text-state-info-ink">
                  <p className="font-medium">طلب الانضمام قيد المراجعة</p>
                  <p className="text-xs mt-1">Your join request is pending review by the organization owner.</p>
                </div>
              )}

              {/* Join request form */}
              {(resolution.result === 'existing_verified' || resolution.result === 'existing_unverified') && (
                <div className="space-y-4 p-4 rounded-md bg-secondary/30 border border-border">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">طلب الانضمام إلى البوابة · Request to Join</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1 block">المسمى الوظيفي · Job Title</Label>
                      <Input value={joinJobTitle} onChange={(e) => setJoinJobTitle(e.target.value)} placeholder="مثال: مدير إدارة" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">الإدارة · Department</Label>
                      <Input value={joinDepartment} onChange={(e) => setJoinDepartment(e.target.value)} placeholder="مثال: الشؤون القانونية" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المبرر · Justification</Label>
                    <Textarea
                      value={joinJustification}
                      onChange={(e) => setJoinJustification(e.target.value)}
                      placeholder="اشرح بإيجاز سبب انضمامك إلى هذه الجهة · Briefly explain why you need to join"
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={requestJoin}
                    disabled={requestingJoin}
                    className="w-full h-10"
                  >
                    {requestingJoin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {requestingJoin ? "جارٍ الإرسال..." : "إرسال طلب الانضمام · Submit Join Request"}
                  </Button>
                </div>
              )}

              {/* Alternative actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate("/")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  العودة واختيار جهة أخرى · Back and choose another entity
                </button>
              </div>
            </div>
          )}

          {/* Join request submitted confirmation */}
          {joinSubmitted && (
            <div className="space-y-4 p-6 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-emerald-900">تم إرسال طلب الانضمام</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Your join request has been submitted. The organization owner will review it and notify you.
                </p>
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="mt-2">
                العودة للرئيسية · Back to Home
              </Button>
            </div>
          )}

          {/* "Other" custom fields */}
          {isOther && !entityExists && !joinSubmitted && (
            <div className="space-y-4 p-4 rounded-md bg-secondary/30 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                بيانات الجهة المخصصة · Custom Entity Details
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custom_ar">الاسم (عربي) *</Label>
                  <Input id="custom_ar" value={customAr} onChange={(e) => setCustomAr(e.target.value)} placeholder="اسم الجهة" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="custom_en">Name (English) *</Label>
                  <Input id="custom_en" value={customEn} onChange={(e) => setCustomEn(e.target.value)} placeholder="Entity name" dir="ltr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom_type">نوع المنظمة · Organization Type</Label>
                <select id="custom_type" value={customType} onChange={(e) => setCustomType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  {ORG_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
            </div>
          )}

          {/* Portal config form */}
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
                    <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, ""))} placeholder="my-entity" dir="ltr" className="font-mono" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    سيُضاف معرف فريد تلقائياً لمنع التضارب.
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
                    <Input value={effectiveSlug} disabled dir="ltr" className="font-mono bg-secondary/40" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="color" className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  اللون الرئيسي · Primary Color
                </Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-9 rounded border border-input cursor-pointer" />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} dir="ltr" className="flex-1 font-mono" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  الوصف · Description
                </Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف موجز للجهة · Brief description of the entity" rows={3} />
              </div>

              <div className="p-3 rounded-md bg-secondary/40 text-xs text-muted-foreground leading-relaxed">
                بإنشائك البوابة، توافق على شروط الاستخدام التجريبي. ستظهر علامة "بيئة تجريبية" حتى يتم التحقق الرسمي.
              </div>

              <Button onClick={submit} disabled={submitting} className="w-full h-10">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
                {submitting ? "جارٍ الإنشاء..." : "إنشاء البوابة"}
              </Button>
            </>
          )}

          <button onClick={() => navigate("/")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← العودة للرئيسية · Back to home
          </button>
        </div>
      </div>
    </div>
  );
}