import React from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommittee } from "@/lib/CommitteeContext";
import { cn } from "@/lib/utils";

export default function CommitteeHubTabs({ tabs }) {
  const { t } = useLanguage();
  const { data } = useCommittee();
  const [searchParams, setSearchParams] = useSearchParams();

  const myRole = data?.my_role;
  const visibleTabs = tabs.filter((tab) => !tab.roles || tab.roles.includes(myRole));
  if (visibleTabs.length === 0) return null;

  const requestedTab = searchParams.get("tab");
  const activeTabObj = visibleTabs.find((tab) => tab.key === requestedTab) || visibleTabs[0];
  const ActiveComponent = activeTabObj.component;

  const setTab = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
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