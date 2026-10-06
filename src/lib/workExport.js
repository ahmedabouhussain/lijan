// workExport.js — the READABLE export of «مساحتي» and its evidence columns.
//
// ONE rule this file keeps: the export is built from the SAME response the screen renders. It does not
// re-derive a total, re-count a group or re-filter a list in the browser — those numbers come from the
// server's own assembly (personalWork.assemblePersonalWork), so a printed page can never disagree with
// what the person sees. The boundary travels with the file: the contract version, the generation
// instant, the filter actually applied, and every source that could NOT be read.

const VERIFICATION_LABELS = {
  not_submitted: { ar: "لم يُقدَّم دليل", en: "No evidence submitted" },
  submitted: { ar: "بانتظار تحقق مستقل", en: "Awaiting independent verification" },
  returned: { ar: "أُعيد للتعديل", en: "Returned for correction" },
  accepted: { ar: "دليل مقبول", en: "Evidence accepted" },
};

export const WORK_EXPORT_COLUMNS = [
  { key: "kind_label", ar: "نوع الالتزام", en: "Item kind" },
  { key: "group_label", ar: "المجموعة", en: "Group" },
  { key: "title", ar: "البند", en: "Item" },
  { key: "committee", ar: "اللجنة", en: "Committee" },
  { key: "organization", ar: "الجهة الحاضنة", en: "Custodian body" },
  { key: "capacity", ar: "الصفة", en: "Capacity" },
  { key: "state", ar: "حالة السجل", en: "Record state" },
  { key: "evidence", ar: "حالة الدليل", en: "Evidence state" },
  { key: "deadline", ar: "المهلة", en: "Deadline" },
  { key: "deadline_band", ar: "فرق المهلة", en: "Deadline band" },
  { key: "why", ar: "سبب ظهوره لي", en: "Why it appears to me" },
  { key: "next", ar: "الإجراء التالي", en: "Next act" },
  { key: "route", ar: "المسار", en: "Route" },
];

const pick = (lang, pair) => (pair ? (lang === "ar" ? pair.ar : pair.en) || "" : "");

const bandLabel = (lang, band) => {
  if (band?.days === null || band?.days === undefined) return "";
  const days = band.days;
  if (band.band === "overdue") return lang === "ar" ? `متأخر ${Math.abs(days)} يومًا` : `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return lang === "ar" ? "اليوم" : "today";
  return lang === "ar" ? `بعد ${days} يومًا` : `in ${days} day(s)`;
};

export function buildWorkExportRows(items, lang = "ar") {
  return (items || []).map((it) => ({
    kind_label: it.kind || "",
    group_label: pick(lang, it.group_label),
    title: pick(lang, it.title),
    committee: lang === "ar" ? it.place?.committee?.name?.ar || "" : it.place?.committee?.name?.en || "",
    organization: lang === "ar" ? it.place?.organization?.name?.ar || "" : it.place?.organization?.name?.en || "",
    capacity: pick(lang, it.capacity?.role_label) || it.capacity?.role || "",
    state: pick(lang, it.state),
    evidence: pick(lang, it.secondary_state) || (it.secondary_state?.value ? (VERIFICATION_LABELS[it.secondary_state.value]?.[lang] || it.secondary_state.value) : ""),
    deadline: it.deadline ? String(it.deadline).slice(0, 10) : "",
    deadline_band: bandLabel(lang, it.deadline_band),
    why: pick(lang, it.why),
    next: pick(lang, it.next?.label) || "",
    route: it.route || "",
  }));
}

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** The provenance block that travels WITH the numbers, so the file can never be read out of context. */
export function buildWorkExportMeta({ data, itemCount, scopeLabel, lang = "ar" }) {
  const counts = data?.counts || { total: 0, overdue: 0, due_soon: 0 };
  const unread = (data?.scope?.unread_sources || []).map((u) => `${u.source} (${u.reason})`);
  const excluded = (data?.scope?.excluded || []).map((e) => `${lang === "ar" ? e.committee?.committee?.name?.ar : e.committee?.committee?.name?.en} (${e.code})`);
  return {
    title: lang === "ar" ? "لِجان™ — تصدير صف العمل والأدلة" : "LIJAN™ — work queue and evidence export",
    contract_version: data?.contract_version || "—",
    generated_at: data?.generated_at || null,
    actor: data?.actor?.display_name || null,
    scope_label: scopeLabel,
    item_count: itemCount,
    totals: counts,
    unread_sources: unread,
    excluded_committees: excluded,
    note: lang === "ar"
      ? "الأرقام في هذا التصدير هي نفسها المعروضة على الشاشة، من نفس الاستجابة؛ وما لم يُقرأ مذكور أعلاه ولا يُقرأ صفرًا."
      : "The numbers here are those shown on screen, from the same response; anything that could not be read is named above and is never rendered as a zero.",
  };
}

export function workExportCsv({ data, items, scopeLabel, lang = "ar" }) {
  const meta = buildWorkExportMeta({ data, itemCount: (items || []).length, scopeLabel, lang });
  const lines = [
    `# ${meta.title}`,
    `# ${lang === "ar" ? "العقد" : "Contract"}: ${meta.contract_version}`,
    `# ${lang === "ar" ? "أُنشئ" : "Generated"}: ${meta.generated_at || "—"}`,
    `# ${lang === "ar" ? "النطاق" : "Scope"}: ${meta.scope_label}`,
    `# ${lang === "ar" ? "الإجمالي" : "Total"}: ${meta.totals.total} · ${lang === "ar" ? "متأخر" : "overdue"}: ${meta.totals.overdue} · ${lang === "ar" ? "خلال ثلاثة أيام" : "due soon"}: ${meta.totals.due_soon}`,
    `# ${lang === "ar" ? "مصادر لم تُقرأ" : "Sources not read"}: ${meta.unread_sources.length ? meta.unread_sources.join(" | ") : (lang === "ar" ? "لا شيء" : "none")}`,
    `# ${lang === "ar" ? "لجان لا تُنتج التزامًا" : "Committees producing no obligation"}: ${meta.excluded_committees.length ? meta.excluded_committees.join(" | ") : (lang === "ar" ? "لا شيء" : "none")}`,
    `# ${meta.note}`,
    WORK_EXPORT_COLUMNS.map((c) => csvCell(lang === "ar" ? c.ar : c.en)).join(","),
    ...buildWorkExportRows(items, lang).map((row) => WORK_EXPORT_COLUMNS.map((c) => csvCell(row[c.key])).join(",")),
  ];
  // A BOM so Arabic opens correctly in the spreadsheet applications this institution uses.
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** A printable, readable document: the same rows, with the provenance block on top. */
export function openWorkPrintView({ data, items, scopeLabel, lang = "ar" }) {
  const meta = buildWorkExportMeta({ data, itemCount: (items || []).length, scopeLabel, lang });
  const rows = buildWorkExportRows(items, lang);
  const esc = (v) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const head = WORK_EXPORT_COLUMNS.map((c) => `<th>${esc(lang === "ar" ? c.ar : c.en)}</th>`).join("");
  const body = rows.map((r) => `<tr>${WORK_EXPORT_COLUMNS.map((c) => `<td>${esc(r[c.key])}</td>`).join("")}</tr>`).join("");
  const html = `<!doctype html><html dir="${lang === "ar" ? "rtl" : "ltr"}" lang="${lang}"><head><meta charset="utf-8">
<title>${esc(meta.title)}</title>
<style>
  body { font-family: "Noto Naskh Arabic", Arial, sans-serif; color:#1f2123; margin:24px; }
  h1 { font-size:18px; margin:0 0 4px; color:#871746; }
  .meta { font-size:11px; color:#6e7377; margin-bottom:12px; line-height:1.7; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { background:#f3efe8; text-align:${lang === "ar" ? "right" : "left"}; border:1px solid #e5e7eb; padding:5px; }
  td { border:1px solid #e5e7eb; padding:5px; vertical-align:top; }
  tfoot { font-size:10px; color:#6e7377; }
</style></head><body>
<h1>${esc(meta.title)}</h1>
<div class="meta">
  ${esc(lang === "ar" ? "العقد" : "Contract")}: ${esc(meta.contract_version)} · ${esc(lang === "ar" ? "أُنشئ" : "Generated")}: ${esc(meta.generated_at || "—")}<br>
  ${esc(lang === "ar" ? "النطاق" : "Scope")}: ${esc(meta.scope_label)} · ${esc(lang === "ar" ? "الإجمالي" : "Total")}: ${meta.totals.total} · ${esc(lang === "ar" ? "متأخر" : "overdue")}: ${meta.totals.overdue} · ${esc(lang === "ar" ? "خلال ثلاثة أيام" : "due soon")}: ${meta.totals.due_soon}<br>
  ${esc(lang === "ar" ? "مصادر لم تُقرأ" : "Sources not read")}: ${esc(meta.unread_sources.length ? meta.unread_sources.join(" | ") : (lang === "ar" ? "لا شيء" : "none"))}<br>
  ${esc(meta.note)}
</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}