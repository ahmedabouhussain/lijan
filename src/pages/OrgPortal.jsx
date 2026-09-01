import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2, Users, Gavel, CheckSquare, Plus, ShieldCheck, AlertTriangle, ChevronLeft, FileText, Settings } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS, COMMITTEE_TYPES, formatDate } from "@/lib/raqeemUtils";

export default function OrgPortal() {
  const { orgRef } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const publicId = orgRef?.split("--")[1] || orgRef;

  useEffect(() => {
    if (!publicId) return;
    load();
  }, [publicId]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetOrganizationPortal", { public_id: publicId });
      const d = res.data || res;
      if (d.error) {
        setError(d.error);
      } else {
        setData(d);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل البوابة");
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-3">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/dashboard" className="text-primary hover:underline text-sm">العودة للوحة الرئيسية</Link>
      </div>
    );
  }

  if (!data) return null;

  const { organization: org, portal, my_role, committees, theme } = data;
  const allCommittees = [...committees.active, ...committees.draft, ...committees.suspended, ...committees.closing];

  const canCreateCommittee = my_role === "owner" || my_role === "admin";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground">الرئيسية</Link>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-foreground truncate">{org.name_ar || org.name_en}</span>
      </div>

      {/* Org Header */}
      <div className="raqeem-card p-6" style={{ borderTop: `4px solid ${org.branding_primary_color || "#8A1538"}` }}>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0" style={{ background: org.branding_primary_color || "#8A1538" }}>
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{org.name_ar || org.name_en}</h1>
              {portal.sandbox_badge && (
                <StatusBadge label="بيئة تجريبية · Sandbox" colorClass="bg-amber-100 text-amber-700" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{org.name_en}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {my_role === "owner" ? "مالك المنظمة" : my_role === "admin" ? "مدير المنظمة" : my_role}</span>
              <span>·</span>
              <span>{COMMITTEE_TYPES[org.type]?.ar || org.type}</span>
            </div>
          </div>
          {canCreateCommittee && (
            <Link to={`/o/${orgRef}/create-committee`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Plus className="w-4 h-4" /> إنشاء لجنة
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "إجمالي اللجان", count: committees.total, color: "text-primary bg-primary/10" },
          { icon: CheckSquare, label: "لجان نشطة", count: committees.active.length, color: "text-emerald-700 bg-emerald-50" },
          { icon: FileText, label: "لجان مسودة", count: committees.draft.length, color: "text-blue-700 bg-blue-50" },
          { icon: AlertTriangle, label: "لجان مغلقة", count: committees.closing.length, color: "text-muted-foreground bg-secondary" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="raqeem-card p-3 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{s.count}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Committee Portfolio */}
      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" /> محفظة اللجان · Committee Portfolio
        </h2>
        {allCommittees.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">لا توجد لجان بعد</p>
            {canCreateCommittee && (
              <Link to={`/o/${orgRef}/create-committee`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Plus className="w-4 h-4" /> إنشاء أول لجنة
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {allCommittees.map((c) => {
              const cRef = `${c.slug || c.id}--${c.public_id || c.id}`;
              return (
                <Link
                  key={c.id}
                  to={`/o/${orgRef}/c/${cRef}`}
                  className="flex items-center justify-between py-3 px-3 -mx-3 rounded-md hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.name_ar || c.name_en}</div>
                    <div className="text-xs text-muted-foreground">{c.name_en} · {COMMITTEE_TYPES[c.type]?.ar || c.type}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge label={COMMITTEE_STATUS[c.status]?.ar || c.status} colorClass={COMMITTEE_STATUS[c.status]?.color} />
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}