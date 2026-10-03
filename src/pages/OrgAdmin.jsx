import React, { useState, useEffect } from "react";
import { useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Settings, Users, Shield, Building2, Ban, RotateCcw, Loader2, AlertTriangle, UserX } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function OrgAdmin() {
  const { data } = useOrg();
  const { t } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [orgActionLoading, setOrgActionLoading] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);

  const isAdmin = data?.my_role === "owner" || data?.my_role === "admin";
  const isOwner = data?.my_role === "owner";
  const orgStatus = data?.organization?.status;

  useEffect(() => {
    if (!data?.organization?.id) return;
    base44.entities.OrganizationMembership.filter({ organization_id: data.organization.id })
      .then((res) => setMembers(res || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [data?.organization?.id]);

  // The institutional asset registry is platform administration, so the entry point is too.
  useEffect(() => {
    base44.auth.me().then((u) => setPlatformAdmin(u?.role === "admin")).catch(() => setPlatformAdmin(false));
  }, []);

  const suspendMember = async (member) => {
    setActionLoading(member.id);
    try {
      const newStatus = member.status === "suspended" ? "active" : "suspended";
      await base44.entities.OrganizationMembership.update(member.id, {
        status: newStatus,
        suspended_at: newStatus === "suspended" ? new Date().toISOString() : null,
      });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: newStatus } : m)));
    } catch (e) {
      console.error("Failed to update member", e);
    }
    setActionLoading(null);
  };

  const revokeMember = async (member) => {
    if (!window.confirm(t("هل أنت متأكد من إلغاء عضوية هذا المستخدم؟", "Are you sure you want to revoke this member's access?"))) return;
    setActionLoading(member.id);
    try {
      await base44.entities.OrganizationMembership.update(member.id, { status: "revoked" });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (e) {
      console.error("Failed to revoke member", e);
    }
    setActionLoading(null);
  };

  const toggleOrgSuspension = async () => {
    const isSuspending = orgStatus !== "suspended";
    if (isSuspending && !window.confirm(t("هل أنت متأكد من تعليق هذه الجهة؟ لن يتمكن الأعضاء من الوصول إليها.", "Are you sure you want to suspend this organization? Members will not be able to access it."))) return;
    setOrgActionLoading(true);
    try {
      const newStatus = isSuspending ? "suspended" : "official_active";
      await base44.entities.Organization.update(data.organization.id, {
        status: newStatus,
        suspended_at: isSuspending ? new Date().toISOString() : null,
      });
      window.location.reload();
    } catch (e) {
      console.error("Failed to update organization", e);
    }
    setOrgActionLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="raqeem-card p-8 text-center">
        <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t("هذه الصفحة متاحة لمديري المنظمة فقط", "This page is available to organization administrators only")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("إدارة المنظمة", "Organization Administration")}</h1>
      </div>

      {/* Members management */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("أعضاء المنظمة", "Organization Members")}</h3>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("لا يوجد أعضاء", "No members")}</p>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{m.user_name || m.user_email}</div>
                  <div className="text-xs text-muted-foreground">{m.user_email}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.status === "suspended" && (
                    <StatusBadge label={t("معلّق", "Suspended")} colorClass="bg-orange-50 text-orange-700" />
                  )}
                  <StatusBadge
                    label={m.role === "owner" ? t("مالك", "Owner") : m.role === "admin" ? t("مدير", "Admin") : t("عضو", "Member")}
                    colorClass={m.role === "owner" ? "bg-primary/10 text-primary" : m.role === "admin" ? "bg-state-info-surface text-state-info-ink" : "bg-secondary text-muted-foreground"}
                  />
                  {m.role !== "owner" && (
                    <>
                      <button
                        onClick={() => suspendMember(m)}
                        disabled={actionLoading === m.id}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50 transition-colors"
                        title={m.status === "suspended" ? t("إلغاء التعليق", "Unsuspend") : t("تعليق", "Suspend")}
                      >
                        {actionLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : m.status === "suspended" ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => revokeMember(m)}
                        disabled={actionLoading === m.id}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-700 disabled:opacity-50 transition-colors"
                        title={t("إلغاء العضوية", "Revoke access")}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Committee portfolio summary */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("محفظة اللجان", "Committee Portfolio")}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("نشطة", "Active"), value: (data?.committees?.active || []).length, color: "text-emerald-600" },
            { label: t("مسودة", "Draft"), value: (data?.committees?.draft || []).length, color: "text-amber-600" },
            { label: t("معلّقة", "Suspended"), value: (data?.committees?.suspended || []).length, color: "text-orange-600" },
            { label: t("مغلقة", "Closing"), value: (data?.committees?.closing || []).length, color: "text-red-600" },
          ].map((s, i) => (
            <div key={i} className="text-center p-3 rounded-md bg-secondary/30">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Central institutional identity register — platform administrators only */}
      {platformAdmin && (
        <div className="raqeem-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("سجل الأصول المؤسسية", "Organization Assets Registry")}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {t(
              "المصدر المركزي للشعارات المؤسسية: الاستيراد من المصادر الرسمية، الاعتماد، الإصدارات وسجل التدقيق.",
              "The central register of institutional marks: official import, approval, versioning and audit."
            )}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/organization-assets">{t("فتح السجل", "Open registry")}</Link>
          </Button>
        </div>
      )}

      {/* Organization suspension — owner only */}
      {isOwner && (
        <div className="raqeem-card p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-semibold">{t("حالة الجهة", "Organization Status")}</h3>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-foreground">
                {orgStatus === "suspended"
                  ? t("الجهة معلّقة حالياً — لا يمكن للأعضاء الوصول إليها.", "Organization is currently suspended — members cannot access it.")
                  : t("الجهة نشطة وتعمل بشكل طبيعي.", "Organization is active and operating normally.")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("يمكنك تعليق الجهة مؤقتاً أو إلغاء التعليق في أي وقت.", "You can temporarily suspend or unsuspend the organization at any time.")}
              </p>
            </div>
            <Button
              variant={orgStatus === "suspended" ? "default" : "outline"}
              onClick={toggleOrgSuspension}
              disabled={orgActionLoading}
              className="shrink-0"
            >
              {orgActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              {orgStatus === "suspended" ? t("إلغاء التعليق", "Unsuspend") : t("تعليق الجهة", "Suspend Org")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}