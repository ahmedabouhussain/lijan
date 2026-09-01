import React, { useState, useEffect } from "react";
import { useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Settings, Users, Shield, Building2 } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function OrgAdmin() {
  const { data } = useOrg();
  const { t } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = data?.my_role === "owner" || data?.my_role === "admin";

  useEffect(() => {
    if (!data?.organization?.id) return;
    base44.entities.OrganizationMembership.filter({ organization_id: data.organization.id, status: "active" })
      .then((res) => setMembers(res || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [data?.organization?.id]);

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
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium">{m.user_name || m.user_email}</div>
                  <div className="text-xs text-muted-foreground">{m.user_email}</div>
                </div>
                <StatusBadge
                  label={m.role === "owner" ? t("مالك", "Owner") : m.role === "admin" ? t("مدير", "Admin") : t("عضو", "Member")}
                  colorClass={m.role === "owner" ? "bg-primary/10 text-primary" : m.role === "admin" ? "bg-blue-100 text-blue-700" : "bg-secondary text-muted-foreground"}
                />
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
    </div>
  );
}