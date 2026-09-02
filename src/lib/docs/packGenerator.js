/**
 * LIJAN™ Complete Pack Generator
 *
 * Generates all documents in both Arabic and English,
 * organized into a structured ZIP archive.
 *
 * Folder structure:
 *   01_Executive_Pack/Arabic/  + English/
 *   02_Platform_Capabilities/Arabic/  + English/
 *   ...
 *   10_Evidence_and_Version_History/
 */

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { DOCUMENT_CATALOG } from "./catalog";
import { getDocumentContent } from "./content/index";
import { generateDOCX, generatePDF, generatePPTX, generateXLSX } from "./generators";

const FOLDER_MAP = {
  "master-index": "01_Executive_Pack",
  "executive-presentation": "01_Executive_Pack",
  "executive-dossier": "01_Executive_Pack",
  "kpi-framework": "01_Executive_Pack",
  "demo-speaker-notes": "01_Executive_Pack",
  "capability-catalogue": "02_Platform_Capabilities",
  "operating-model": "03_Operating_Model",
  "role-guide": "04_User_Guides",
  "system-admin-runbook": "04_User_Guides",
  "it-guide": "05_IT_and_Integration",
  "security-guide": "06_Security_and_Data",
  "implementation-plan": "07_Implementation_and_Training",
  "support-guide": "08_Support_and_Continuity",
  "templates-pack": "09_Templates_and_Checklists",
};

/**
 * Generate a single document blob for a given language and format.
 */
async function generateSingle(docMeta, lang, format) {
  const content = getDocumentContent(docMeta.id);
  if (!content) return null;

  if (format === "docx") return await generateDOCX(docMeta, content, lang);
  if (format === "pdf") return await generatePDF(docMeta, content, lang);
  if (format === "pptx") return await generatePPTX(docMeta, content, lang);
  if (format === "xlsx") return await generateXLSX(docMeta, content, lang);
  return null;
}

/**
 * Generate the complete pack as a ZIP blob.
 * @param {string} lang — "ar", "en", or "both"
 * @param {object} user — current user for download logging
 * @param {function} onProgress — callback(progress, currentFile)
 */
export async function generateCompletePack(lang = "both", user = null, onProgress = null) {
  const zip = new JSZip();
  const languages = lang === "both" ? ["ar", "en"] : [lang];
  let totalFiles = 0;
  let completedFiles = 0;

  // Count total files
  for (const docMeta of DOCUMENT_CATALOG) {
    for (const l of languages) {
      totalFiles += docMeta.formats.length;
    }
  }

  // Generate all documents
  for (const docMeta of DOCUMENT_CATALOG) {
    const folder = FOLDER_MAP[docMeta.id] || "10_Evidence_and_Version_History";

    for (const l of languages) {
      const langFolder = l === "ar" ? "Arabic" : "English";
      const langSuffix = l === "ar" ? "AR" : "EN";

      for (const format of docMeta.formats) {
        try {
          if (onProgress) {
            onProgress(
              Math.round((completedFiles / totalFiles) * 100),
              `${docMeta.key}_${langSuffix}.${format}`
            );
          }

          const blob = await generateSingle(docMeta, l, format);
          if (blob) {
            const fileName = `${docMeta.key}_${langSuffix}_v${docMeta.version}.${format}`;
            zip.file(`${folder}/${langFolder}/${fileName}`, blob);
          }
        } catch (e) {
          // Continue on error — pack is best-effort
          console.error(`Failed to generate ${docMeta.key}_${langSuffix}.${format}:`, e);
        }
        completedFiles++;
      }
    }
  }

  // Add a README file
  const readmeAr = `لِجان™ — الباقة الوثائقية التنفيذية الكاملة
الإصدار 1.0 — ${new Date().toLocaleDateString("ar-SA")}

هذا الملف يحتوي على جميع وثائق المنصة منظمة في مجلدات.
كل وثيقة متاحة بالعربية والإنجليزية بصيغ متعددة.

التصنيف: سري — للاستخدام المؤسسي المخول فقط
LIJAN™ — National Councils & Committees Operating System
Powered by CONNECTION™`;

  const readmeEn = `LIJAN™ — Complete Executive Documentation Pack
Version 1.0 — ${new Date().toLocaleDateString("en-GB")}

This archive contains all platform documents organized in folders.
Each document is available in Arabic and English in multiple formats.

Classification: Confidential — Authorized Institutional Use Only
LIJAN™ — National Councils & Committees Operating System
Powered by CONNECTION™`;

  zip.file("README_AR.txt", readmeAr);
  zip.file("README_EN.txt", readmeEn);

  if (onProgress) onProgress(100, "Compressing...");

  const zipBlob = await zip.generateAsync(
    { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
    (meta) => {
      if (onProgress && meta.percent) {
        onProgress(Math.round(meta.percent), "Compressing...");
      }
    }
  );

  const packFileName = `LIJAN_Complete_Documentation_Pack_v1.0_${new Date().toISOString().split("T")[0]}.zip`;
  saveAs(zipBlob, packFileName);

  // Log pack download
  if (user) {
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.entities.DocumentationDownloadLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        document_key: "COMPLETE_PACK",
        document_title: "Complete Documentation Pack",
        language: lang === "both" ? "both" : lang,
        format: "zip",
        version: "1.0",
        action: "pack_download",
        file_size_bytes: zipBlob.size,
        downloaded_at: new Date().toISOString(),
      });
    } catch { /* best-effort */ }
  }

  return { zipBlob, fileName: packFileName, sizeBytes: zipBlob.size };
}