import React, { useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Home, Building2, ChevronLeft, Settings2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCommitteeSafe } from "@/lib/CommitteeContext";
import { cn } from "@/lib/utils";
import AdminEditMode from "@/components/raqeem/admin/AdminEditMode";

// Unified navigation bar — appears at the top of every page.
// Context-aware: detects committee vs org vs top-level and offers relevant shortcuts.
// Shows "Edit Page" button for authorized admins (can_configure_committee_pages).
export default function PageNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgRef, committeeRef } = useParams();
  const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const [editMode, setEditMode] = useState(false);
  const { canConfigure, loading: capsLoading } = useCommitteeAdmin();
  const { data } = useCommitteeSafe() || {};

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const inCommittee = Boolean(orgRef && committeeRef);
  const inOrg = Boolean(orgRef && !committeeRef);

  // Derive page_key from current route
  const pageKey = (() => {
    if (!inCommittee) return null;
    const base = `/o/${orgRef}/c/${committeeRef}`;
    const rest = location.pathname.slice(base.length).replace(/^\//, "");
    return rest || "home";
  })();

  const crumbs = [];
  // Always: root entry
  crumbs.push({ label: t("رَقِيم", "RAQEEM"), to: "/" });
  if (orgRef) {
    crumbs.push({ label: t("البوابة", "Portal"), to: `/o/${orgRef}` });
  }
  if (inCommittee) {
    crumbs.push({ label: t("اللجنة", "Committee"), to: `/o/${orgRef}/c/${committeeRef}` });
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (inCommittee) {
      navigate(`/o/${orgRef}/c/${committeeRef}`);
    } else if (inOrg) {
      navigate(`/o/${orgRef}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label={t("رجوع", "Back")}
        >
          <BackIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{t("رجوع", "Back")}</span>
        </button>

        <div className="flex items-center gap-1 min-w-0">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <React.Fragment key={crumb.to}>
                {idx > 0 && <ChevronLeft className={cn("w-3 h-3 text-muted-foreground/40 shrink-0", isRTL && "rotate-180")} />}
                {isLast ? (
                  <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors truncate max-w-[80px] sm:max-w-none"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {inCommittee && canConfigure && !capsLoading && pageKey && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-primary hover:bg-primary/10 transition-colors min-h-[36px]"
            title={t("تحرير الصفحة", "Edit Page")}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t("تحرير الصفحة", "Edit Page")}</span>
          </button>
        )}
        {inCommittee && (
          <Link
            to={`/o/${orgRef}/c/${committeeRef}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={t("رئيسية اللجنة", "Committee Home")}
          >
            <Home className="w-4 h-4" />
            <span className="hidden md:inline">{t("اللجنة", "Committee")}</span>
          </Link>
        )}
        {orgRef && (
          <Link
            to={`/o/${orgRef}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={t("بوابة المنظمة", "Organization Portal")}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden md:inline">{t("البوابة", "Portal")}</span>
          </Link>
        )}
        <Link
          to="/"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={t("الرئيسية", "Home")}
        >
          <Home className="w-4 h-4" />
          <span className="hidden lg:inline">{t("الرئيسية", "Home")}</span>
        </Link>
      </div>

      {editMode && pageKey && data?.committee?.id && (
        <AdminEditMode
          pageKey={pageKey}
          committeeId={data.committee.id}
          onClose={() => setEditMode(false)}
        />
      )}
    </div>
  );
}