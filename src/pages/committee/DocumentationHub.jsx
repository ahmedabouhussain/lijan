import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download, FileText, Presentation, FileSpreadsheet, Eye, Package,
  Loader2, Filter, Library, CheckCircle2, Clock, Shield, Lock,
} from "lucide-react";
import {
  DOCUMENT_CATALOG, CATEGORIES, CLASSIFICATIONS, AUDIENCES,
  ROLE_PRIORITY, FOUNDER_EMAIL,
} from "@/lib/docs/catalog";
import { generateAndDownload } from "@/lib/docs/generators";
import { generateCompletePack } from "@/lib/docs/packGenerator";

const FORMAT_ICONS = {
  docx: FileText,
  pdf: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
};

const FORMAT_COLORS = {
  docx: "bg-blue-100 text-blue-700",
  pdf: "bg-red-100 text-red-700",
  pptx: "bg-orange-100 text-orange-700",
  xlsx: "bg-green-100 text-green-700",
};

export default function DocumentationHub() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [selectedLang, setSelectedLang] = useState(lang === "ar" ? "ar" : "en");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [selectedView, setSelectedView] = useState("all");
  const [downloading, setDownloading] = useState({});
  const [packDownloading, setPackDownloading] = useState(false);
  const [packProgress, setPackProgress] = useState(0);
  const [packStatus, setPackStatus] = useState("");
  const [downloadLog, setDownloadLog] = useState([]);

  const isRTL = selectedLang === "ar";
  const isFounder = user?.email === FOUNDER_EMAIL;
  const isAdmin = user?.role === "admin" || isFounder;

  // Determine role-based priority — user can override via view selector
  const roleKey = selectedView;

  // Load download log
  useEffect(() => {
    if (!user?.id) return;
    base44.entities.DocumentationDownloadLog.filter(
      { user_id: user.id },
      "-downloaded_at",
      10
    )
      .then(setDownloadLog)
      .catch(() => {});
  }, [user?.id]);

  // Filtered and sorted documents
  const filteredDocs = useMemo(() => {
    let docs = [...DOCUMENT_CATALOG];

    // Filter by category
    if (selectedCategory !== "all") {
      docs = docs.filter((d) => d.category === selectedCategory);
    }

    // Filter by format
    if (selectedFormat !== "all") {
      docs = docs.filter((d) => d.formats.includes(selectedFormat));
    }

    // Sort by role priority
    const priority = ROLE_PRIORITY[roleKey] || ROLE_PRIORITY.all;
    docs.sort((a, b) => {
      const aIdx = priority.indexOf(a.id);
      const bIdx = priority.indexOf(b.id);
      if (aIdx === -1 && bIdx === -1) return a.order - b.order;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return docs;
  }, [selectedCategory, selectedFormat, roleKey, selectedView]);

  // Handle single document download
  const handleDownload = async (docId, format) => {
    const key = `${docId}_${format}`;
    setDownloading((prev) => ({ ...prev, [key]: true }));
    try {
      await generateAndDownload(docId, format, selectedLang, user);
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Handle complete pack download
  const handlePackDownload = async () => {
    setPackDownloading(true);
    setPackProgress(0);
    setPackStatus(isRTL ? "جاري التحضير..." : "Preparing...");
    try {
      await generateCompletePack("both", user, (progress, file) => {
        setPackProgress(progress);
        setPackStatus(file);
      });
    } catch (e) {
      console.error("Pack download failed:", e);
    } finally {
      setPackDownloading(false);
      setPackProgress(0);
      setPackStatus("");
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="raqeem-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Library className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isRTL ? "مركز الوثائق والعروض" : "Documentation & Executive Pack"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isRTL
                  ? "الباقة المؤسسية الكاملة لمنصة لِجان™ — للإدارة العليا والعمليات وتقنية المعلومات"
                  : "The complete institutional pack for LIJAN™ — for executive, operations, and IT"}
              </p>
            </div>
          </div>
          <Button
            onClick={handlePackDownload}
            disabled={packDownloading}
            size="lg"
            className="gap-2"
          >
            {packDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            {isRTL ? "تنزيل الباقة الكاملة" : "Download Complete Pack"}
          </Button>
        </div>

        {/* Pack progress */}
        {packDownloading && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{packStatus}</span>
              <span className="text-sm text-muted-foreground">{packProgress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${packProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Classification notice */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" />
          {isRTL
            ? "التصنيف: سري — للاستخدام المؤسسي المخول فقط · مدعوم بواسطة CONNECTION™"
            : "Classification: Confidential — Authorized Institutional Use Only · Powered by CONNECTION™"}
        </div>
      </div>

      {/* Filters */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />

          {/* Language filter */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setSelectedLang("ar")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedLang === "ar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setSelectedLang("en")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedLang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              English
            </button>
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">{isRTL ? "كل الأقسام" : "All Categories"}</option>
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>
                {isRTL ? val.ar : val.en}
              </option>
            ))}
          </select>

          {/* Format filter */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">{isRTL ? "كل الصيغ" : "All Formats"}</option>
            <option value="docx">DOCX</option>
            <option value="pdf">PDF</option>
            <option value="pptx">PPTX</option>
            <option value="xlsx">XLSX</option>
          </select>

          {/* View filter (role-based priority) */}
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">{isRTL ? "كل الوثائق" : "All Documents"}</option>
            <option value="executive">{isRTL ? "عرض الإدارة العليا" : "Executive View"}</option>
            <option value="it">{isRTL ? "عرض تقنية المعلومات" : "IT View"}</option>
            <option value="operations">{isRTL ? "عرض التشغيل" : "Operations View"}</option>
          </select>

          <span className="text-sm text-muted-foreground ml-auto">
            {filteredDocs.length} {isRTL ? "وثيقة" : "documents"}
          </span>
        </div>
      </div>

      {/* Document cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDocs.map((doc) => {
          const title = isRTL ? doc.title_ar : doc.title_en;
          const description = isRTL ? doc.description_ar : doc.description_en;
          const category = CATEGORIES[doc.category];
          const classification = CLASSIFICATIONS[doc.classification];

          return (
            <Card key={doc.id} className="p-5 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm leading-tight">{title}</h3>
                  <Badge variant="outline" className="mt-1.5 text-[10px]">
                    {isRTL ? category?.ar : category?.en}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {doc.status === "approved" && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                {description}
              </p>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="font-medium">{isRTL ? "الإصدار:" : "Ver:"}</span>
                  <span>{doc.version}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  <span>{isRTL ? classification?.ar : classification?.en}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                  <span className="font-medium">{isRTL ? "المالك:" : "Owner:"}</span>
                  <span className="truncate">{doc.owner}</span>
                </div>
              </div>

              {/* Download buttons */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                {doc.formats.map((format) => {
                  const Icon = FORMAT_ICONS[format] || FileText;
                  const colorClass = FORMAT_COLORS[format] || "bg-gray-100 text-gray-700";
                  const dlKey = `${doc.id}_${format}`;
                  const isDownloading = downloading[dlKey];

                  return (
                    <button
                      key={format}
                      onClick={() => handleDownload(doc.id, format)}
                      disabled={isDownloading}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${colorClass} hover:opacity-80 disabled:opacity-50`}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Icon className="w-3 h-3" />
                      )}
                      <span className="uppercase">{format}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Download history */}
      {downloadLog.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {isRTL ? "سجل التنزيلات الأخيرة" : "Recent Downloads"}
          </h3>
          <div className="space-y-1.5">
            {downloadLog.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{log.document_title}</span>
                  <Badge variant="outline" className="text-[9px] uppercase">{log.format}</Badge>
                  <span className="text-muted-foreground">{log.language === "ar" ? "عربي" : "EN"}</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(log.downloaded_at || log.created_date).toLocaleDateString(
                    isRTL ? "ar-SA" : "en-GB",
                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}