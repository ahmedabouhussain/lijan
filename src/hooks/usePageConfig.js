import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useCommitteeSafe } from "@/lib/CommitteeContext";

/**
 * usePageConfig — returns the effective published page configuration
 * for the current committee page. Falls back to org template, then system defaults.
 */
export function usePageConfig(pageKey) {
  const { data } = useCommitteeSafe() || {};
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDefault, setIsDefault] = useState(true);

  const committeeId = data?.committee?.id;

  const load = useCallback(async () => {
    if (!committeeId || !pageKey) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("GetEffectivePageConfiguration", {
        committee_id: committeeId,
        page_key: pageKey,
      });
      const d = res.data || res;
      setConfig(d.config || null);
      setIsDefault(d.is_default);
    } catch (e) {
      setConfig(null);
      setIsDefault(true);
    }
    setLoading(false);
  }, [committeeId, pageKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Helper to get a label override or fall back to default
  const getLabel = useCallback(
    (key, defaultAr, defaultEn, lang = "ar") => {
      if (!config?.labels) return lang === "ar" ? defaultAr : defaultEn;
      const override = config.labels[key];
      if (override) return lang === "ar" ? override.ar || defaultAr : override.en || defaultEn;
      return lang === "ar" ? defaultAr : defaultEn;
    },
    [config]
  );

  // Helper to get title
  const getTitle = useCallback(
    (defaultAr, defaultEn, lang = "ar") => {
      if (!config) return lang === "ar" ? defaultAr : defaultEn;
      return lang === "ar" ? config.title_ar || defaultAr : config.title_en || defaultEn;
    },
    [config]
  );

  // Helper to get description
  const getDescription = useCallback(
    (defaultAr, defaultEn, lang = "ar") => {
      if (!config) return lang === "ar" ? defaultAr : defaultEn;
      return lang === "ar" ? config.description_ar || defaultAr : config.description_en || defaultEn;
    },
    [config]
  );

  // Helper to get empty state
  const getEmptyState = useCallback(
    (defaultAr, defaultEn, lang = "ar") => {
      if (!config) return lang === "ar" ? defaultAr : defaultEn;
      return lang === "ar" ? config.empty_state_ar || defaultAr : config.empty_state_en || defaultEn;
    },
    [config]
  );

  // Check if a section is visible
  const isSectionVisible = useCallback(
    (sectionKey, defaultVisible = true) => {
      if (!config?.sections) return defaultVisible;
      const section = config.sections.find((s) => s.key === sectionKey);
      return section ? section.visible !== false : defaultVisible;
    },
    [config]
  );

  return {
    config,
    loading,
    isDefault,
    reload: load,
    getLabel,
    getTitle,
    getDescription,
    getEmptyState,
    isSectionVisible,
  };
}