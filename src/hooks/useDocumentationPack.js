import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { CATEGORY_LABELS } from "@/lib/docs/releaseLabels";

const DOWNLOAD_SUCCESS_RESET_MS = 4000;

// Downloads are authorized and audited on the server; the file itself is served
// through a short-lived signed URL from the app's private storage.
function startBrowserDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function useDocumentationPack() {
  const { lang, dir, t, setLang } = useLanguage();
  const [release, setRelease] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edition, setEdition] = useState(lang === "ar" ? "ar" : "en");
  const [category, setCategory] = useState("all");
  const [format, setFormat] = useState("all");
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState({});
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const releases = await base44.entities.DocumentationRelease.filter(
          { status: "active" },
          { sort: "-published_at", limit: 1 }
        );
        const current = releases?.items?.[0] || null;
        if (!active) return;
        if (!current) {
          setRelease(null);
          setAssets([]);
          setLoading(false);
          return;
        }
        setRelease(current);
        const documents = await base44.entities.DocumentationAsset.filter(
          { release_id: current.release_id, status: "active" },
          { sort: "relative_path", limit: 200 }
        );
        if (!active) return;
        setAssets(documents?.items || []);
      } catch {
        if (active) setNotice({ type: "error", message: t("تعذر تحميل بيانات الحزمة. حاول تحديث الصفحة.", "The pack data could not be loaded. Please refresh the page.") });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t]);

  const audit = useCallback(
    (payload) => {
      if (!release) return Promise.resolve(null);
      return base44.functions
        .invoke("LogDocumentationDownload", {
          release_id: release.release_id,
          language: payload.language || edition,
          ...payload,
        })
        .catch(() => null);
    },
    [release, edition]
  );

  // Grouped into library items: one card per deliverable in the selected language edition.
  const items = useMemo(() => {
    const byDeliverable = new Map();
    for (const asset of assets) {
      if (asset.language !== edition) continue;
      const existing = byDeliverable.get(asset.deliverable_id);
      if (existing) {
        existing.files.push(asset);
        existing.editable = existing.editable || asset.editable;
        existing.archival = existing.archival || asset.archival;
      } else {
        byDeliverable.set(asset.deliverable_id, {
          deliverable_id: asset.deliverable_id,
          category: asset.category,
          title_ar: asset.title_ar,
          title_en: asset.title_en,
          purpose_ar: asset.purpose_ar,
          purpose_en: asset.purpose_en,
          version: asset.version,
          classification: asset.classification,
          owner: asset.owner,
          editable: !!asset.editable,
          archival: !!asset.archival,
          files: [asset],
        });
      }
    }
    return Array.from(byDeliverable.values()).map((item) => ({
      ...item,
      files: item.files.sort((a, b) => a.format.localeCompare(b.format)),
    }));
  }, [assets, edition]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (format !== "all" && !item.files.some((f) => f.format === format)) return false;
      if (kind === "editable" && !item.editable) return false;
      if (kind === "archival" && !item.archival) return false;
      if (term) {
        const haystack = [item.title_ar, item.title_en, item.purpose_ar, item.purpose_en]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [items, category, format, kind, search]);

  const downloadAsset = useCallback(
    async (asset) => {
      if (!release) return;
      const key = asset.asset_key;
      setBusy((prev) => ({ ...prev, [key]: "loading" }));
      setNotice(null);
      try {
        const gate = await base44.functions.invoke("LogDocumentationDownload", {
          release_id: release.release_id,
          asset_key: key,
          language: asset.language,
          category: asset.category,
          action: "download",
          format: asset.format,
          result: "success",
        });
        if (!gate?.data?.allowed) {
          setBusy((prev) => ({ ...prev, [key]: "error" }));
          setNotice({
            type: "error",
            message: t(
              "تعذر تجهيز هذا الملف لهذه الجلسة. تحقق من صلاحية الوصول ثم حاول مرة أخرى.",
              "This file could not be prepared for this session. Check your access and try again."
            ),
          });
          return;
        }
        const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: asset.file_uri, expires_in: 300 });
        if (!signed?.signed_url) throw new Error("signed_url_missing");
        startBrowserDownload(signed.signed_url, asset.filename);
        setBusy((prev) => ({ ...prev, [key]: "success" }));
        window.setTimeout(() => setBusy((prev) => ({ ...prev, [key]: null })), DOWNLOAD_SUCCESS_RESET_MS);
      } catch {
        setBusy((prev) => ({ ...prev, [key]: "error" }));
        setNotice({
          type: "error",
          message: t("تعذر تنزيل الملف. حاول مرة أخرى بعد قليل.", "The file could not be downloaded. Please try again shortly."),
        });
        audit({ asset_key: key, category: asset.category, action: "download", result: "failure", error_reference: "signed_url_unavailable" });
      }
    },
    [release, audit, t]
  );

  const downloadPack = useCallback(async () => {
    if (!release) return;
    setBusy((prev) => ({ ...prev, pack: "loading" }));
    setNotice(null);
    try {
      const gate = await base44.functions.invoke("LogDocumentationDownload", {
        release_id: release.release_id,
        language: edition,
        action: "pack_download",
        format: "zip",
        result: "success",
      });
      if (!gate?.data?.allowed) {
        setBusy((prev) => ({ ...prev, pack: "error" }));
        setNotice({
          type: "error",
          message: t(
            "تعذر تجهيز الحزمة الكاملة لهذه الجلسة. تحقق من صلاحية الوصول ثم حاول مرة أخرى.",
            "The complete pack could not be prepared for this session. Check your access and try again."
          ),
        });
        return;
      }
      const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: release.zip_file_uri, expires_in: 300 });
      if (!signed?.signed_url) throw new Error("signed_url_missing");
      startBrowserDownload(signed.signed_url, release.zip_filename);
      setBusy((prev) => ({ ...prev, pack: "success" }));
      window.setTimeout(() => setBusy((prev) => ({ ...prev, pack: null })), DOWNLOAD_SUCCESS_RESET_MS);
    } catch {
      setBusy((prev) => ({ ...prev, pack: "error" }));
      setNotice({
        type: "error",
        message: t("تعذر تنزيل الحزمة الكاملة. حاول مرة أخرى بعد قليل.", "The complete pack could not be downloaded. Please try again shortly."),
      });
      audit({ action: "pack_download", result: "failure", error_reference: "signed_url_unavailable" });
    }
  }, [release, edition, audit, t]);

  // The in-page switch drives the whole page: interface direction, copy, and the document edition shown.
  useEffect(() => {
    setEdition(lang === "ar" ? "ar" : "en");
  }, [lang]);

  const selectEdition = useCallback(
    (next) => {
      setEdition(next);
      setLang(next);
      audit({ action: "language_selected", language: next, result: "success" });
    },
    [audit, setLang]
  );

  const selectCategory = useCallback(
    (next) => {
      setCategory(next);
      audit({
        action: "category_selected",
        category: next,
        result: "success",
      });
    },
    [audit]
  );

  const counts = useMemo(
    () => ({
      documents: items.length,
      filtered: filteredItems.length,
      editions: assets.length,
    }),
    [items, filteredItems, assets]
  );

  return {
    dir,
    t,
    isAr: lang === "ar",
    release,
    assets,
    items,
    filteredItems,
    counts,
    loading,
    notice,
    setNotice,
    edition,
    selectEdition,
    category,
    selectCategory,
    format,
    setFormat,
    kind,
    setKind,
    search,
    setSearch,
    busy,
    downloadAsset,
    downloadPack,
    categoryLabels: CATEGORY_LABELS,
  };
}