import { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { CATEGORY_LABELS } from "@/lib/docs/releaseLabels";

const DOWNLOAD_SUCCESS_RESET_MS = 4000;

// Downloads are authorized, audited AND signed on the server: the gate returns a short-lived link
// for a document the active release actually publishes, so the client never signs a storage
// reference of its own and can never be pointed at a file outside the release.
//
// The download is then completed by THIS browser: the file is fetched and saved under its own
// name. That keeps the click inside the app (no viewer tab, no lost PDF in a standalone window)
// and does not depend on the browser honouring a cross-origin download attribute.
async function downloadFile({ url, filename }) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download_failed_${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename || "document";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  }
}

/** Why a governed download was refused — the reader is told which of the three it is. */
function refusalMessage(decision, t) {
  if (decision?.code === "unauthenticated") {
    return t(
      "تنزيل المستندات يتطلب تسجيل الدخول بحساب مؤسسي.",
      "Downloading the documents requires signing in with an institutional account."
    );
  }
  if (decision?.code === "not_found") {
    return t("هذا الملف لم يعد ضمن الإصدار المنشور.", "This file is no longer part of the published release.");
  }
  return t(
    "تعذر تجهيز هذا الملف لهذه الجلسة. تحقق من صلاحية الوصول ثم حاول مرة أخرى.",
    "This file could not be prepared for this session. Check your access and try again."
  );
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
        const decision = gate?.data || gate || {};
        if (!decision.allowed || !decision.signed_url) {
          setBusy((prev) => ({ ...prev, [key]: "error" }));
          setNotice({ type: "error", message: refusalMessage(decision, t) });
          return;
        }
        await downloadFile({ url: decision.signed_url, filename: decision.filename || asset.filename });
        setBusy((prev) => ({ ...prev, [key]: "success" }));
        window.setTimeout(() => setBusy((prev) => ({ ...prev, [key]: null })), DOWNLOAD_SUCCESS_RESET_MS);
      } catch {
        setBusy((prev) => ({ ...prev, [key]: "error" }));
        setNotice({
          type: "error",
          message: t("تعذر تنزيل الملف. حاول مرة أخرى بعد قليل.", "The file could not be downloaded. Please try again shortly."),
        });
        audit({ asset_key: key, category: asset.category, action: "download", result: "failure", error_reference: "delivery_failed" });
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
      const decision = gate?.data || gate || {};
      if (!decision.allowed || !decision.signed_url) {
        setBusy((prev) => ({ ...prev, pack: "error" }));
        setNotice({ type: "error", message: refusalMessage(decision, t) });
        return;
      }
      await downloadFile({ url: decision.signed_url, filename: decision.filename || release.zip_filename });
      setBusy((prev) => ({ ...prev, pack: "success" }));
      window.setTimeout(() => setBusy((prev) => ({ ...prev, pack: null })), DOWNLOAD_SUCCESS_RESET_MS);
      } catch {
      setBusy((prev) => ({ ...prev, pack: "error" }));
      setNotice({
        type: "error",
        message: t("تعذر تنزيل الحزمة الكاملة. حاول مرة أخرى بعد قليل.", "The complete pack could not be downloaded. Please try again shortly."),
      });
      audit({ action: "pack_download", result: "failure", error_reference: "delivery_failed" });
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