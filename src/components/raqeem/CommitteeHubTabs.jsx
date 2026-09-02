import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommittee } from "@/lib/CommitteeContext";
import { cn } from "@/lib/utils";

export default function CommitteeHubTabs({ tabs, hubKey, hubLabel, hubLabelEn }) {
  const { t } = useLanguage();
  const { data } = useCommittee();
  const [searchParams, setSearchParams] = useSearchParams();

  const myRole = data?.my_role;
  const visibleTabs = tabs.filter((tab) => !tab.roles || tab.roles.includes(myRole));

  const storageKey = `hub_tab_${hubKey}`;
  const requestedTab = searchParams.get("tab") || localStorage.getItem(storageKey);
  const activeTabObj = visibleTabs.find((tab) => tab.key === requestedTab) || visibleTabs[0];

  useEffect(() => {
    if (activeTabObj) localStorage.setItem(storageKey, activeTabObj.key);
  }, [activeTabObj?.key, storageKey]);

  if (visibleTabs.length === 0 || !activeTabObj) return null;
  const ActiveComponent = activeTabObj.component;

  const setTab = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{t(hubLabel, hubLabelEn)}</span>
        <span className="text-muted-foreground/40">/</span>
        <span>{t(activeTabObj.label, activeTabObj.labelEn)}</span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTabObj.key === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {t(tab.label, tab.labelEn)}
            </button>
          );
        })}
      </div>
      <ActiveComponent />
    </div>
  );
}