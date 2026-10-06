// evidenceDossier.ts — the readable evidence dossier of a decision (evidence-dossier-1.0.0, D-091).
//
// What this is for. Everything the platform knows about a decision is already on its record: the round
// that froze the text, the seats that were eligible, the votes, the circulation responses, the issuance
// package, the actions it produced and the minutes that carry it. But a governance record that can only
// be read one screen at a time is not auditable by anyone outside the platform — and a hand-assembled
// export is a second computation of the same facts, which is how one number ends up printed twice with
// two values (the D-074 rule).
//
// So the dossier is assembled ONCE, on the server, from the records themselves, and rendered twice from
// the same assembly: as Markdown and as a self-contained printable document. Three rules are structural:
//
//   1. EVERY FACT NAMES ITS SOURCE. A row is `{label, value, source}` — a value with no record behind it
//      is not printable, because the reader must be able to go and check it.
//   2. AN ABSENT RECORD IS STATED, NEVER OMITTED. A section whose source was read and holds nothing says
//      «لم يُسجَّل» — the difference between «nothing happened» and «we did not look» is the whole point.
//   3. AN UNREAD SOURCE IS NAMED. A section whose records could not be read is marked `not_read` and the
//      reason travels with the document (the D-054 rule, applied to an export).
//
// The dossier is a DIGEST of content. It is not proof of legal validity, not an independent timestamp,
// and not a substitute for the record — and it says so on its own face, in both languages.

export const EVIDENCE_DOSSIER_VERSION = "evidence-dossier-1.0.0";

/** Fixed section order: the life of the decision, from identity to audit. */
export const DOSSIER_SECTIONS = [
  { key: "identity", ar: "هوية القرار", en: "Decision identity", sources: ["Decision"] },
  { key: "origin", ar: "منشأ القرار", en: "Origin", sources: ["Meeting", "AgendaItem"] },
  { key: "voting", ar: "التصويت والهيئة الناخبة المجمّدة", en: "Voting and frozen electorate", sources: ["EligibleVoterSnapshot", "Vote"] },
  { key: "circulation", ar: "القرار بالتمرير", en: "Written resolution (circulation)", sources: ["CirculationRound", "CirculationResponse"] },
  { key: "issuance", ar: "الإصدار وحزمته", en: "Issuance and its package", sources: ["IssueSnapshot"] },
  { key: "execution", ar: "التنفيذ والدليل", en: "Execution and evidence", sources: ["Action"] },
  { key: "record", ar: "المحضر والسجل", en: "Minutes and record", sources: ["MeetingMinutes"] },
  { key: "audit", ar: "أثر التدقيق", en: "Audit trail", sources: ["AuditEvent"] },
];

/** Which record set feeds each section. `null` means the source was NOT read — never "empty". */
const SOURCE_FIELD = {
  identity: "decision",
  origin: "meeting",
  voting: "electorate",
  circulation: "circulation",
  issuance: "issuance",
  execution: "actions",
  record: "minutes",
  audit: "audit_events",
};

/** The nested record sets a section depends on: an unread one makes the section PARTIAL, not empty. */
const SECTION_SOURCE_KEYS: Record<string, string[]> = {
  identity: ["decision"],
  origin: ["meeting"],
  voting: ["electorate", "votes"],
  circulation: ["circulation", "circulation_responses"],
  issuance: ["issuance"],
  execution: ["actions"],
  record: ["minutes"],
  audit: ["audit_events"],
};

export const SECTION_STATES = {
  recorded: { ar: "مُسجَّل", en: "Recorded" },
  not_recorded: { ar: "لم يُسجَّل", en: "Not recorded" },
  not_read: { ar: "المصدر لم يُقرأ", en: "Source not read" },
};

export const DOSSIER_STATEMENTS = {
  digest_not_validity: {
    ar: "هذا الملف خلاصة محتوى من سجلات المنصة. ليس إثباتًا للصحة القانونية، ولا طابعًا زمنيًا مستقلًا، ولا بديلًا عن السجل نفسه.",
    en: "This document is a digest of content held in the platform's records. It is not proof of legal validity, not an independent timestamp, and not a substitute for the record itself.",
  },
  absence_is_stated: {
    ar: "ما لا يوجد سجل له يُذكر بلفظه («لم يُسجَّل») ولا يُحذف من الملف؛ فالفراغ وعدمه واقعة يُفرَّق بينها.",
    en: "A section with no record says so in words («not recorded») and is never dropped from the document: the difference between nothing and nothing read is a fact.",
  },
  unread_is_named: {
    ar: "المصدر الذي تعذّرت قراءته يُسمّى بسببه في الملف، ويُوسم قسمه بأنه غير مقروء.",
    en: "A source that could not be read is named with its reason in the document, and its section is marked unread.",
  },
  values_name_source: {
    ar: "كل واقعة تحمل السجل الذي جاءت منه، ليتمكن القارئ من التحقق منها بنفسه.",
    en: "Every fact names the record it came from, so the reader can verify it independently.",
  },
};

export const ROW_CAP = 40;

const txt = (v: any) => (v === null || v === undefined || v === "" ? null : String(v));
const short = (v: any, n = 16) => {
  const s = txt(v);
  return s && s.length > n ? `${s.slice(0, n)}…` : s;
};
const arText = (r: any, base: string) => txt(r?.[`${base}_ar`]) || txt(r?.[base]) || txt(r?.[`${base}_en`]);
const enText = (r: any, base: string) => txt(r?.[`${base}_en`]) || txt(r?.[base]) || txt(r?.[`${base}_ar`]);

const row = (ar: string, en: string, value: any, source: string) => {
  const v = txt(value);
  return v === null ? null : { ar, en, value: v, source };
};
const keep = (rows: any[]) => rows.filter(Boolean);

const cap = (list: any[] = []) => ({
  rows: list.slice(0, ROW_CAP),
  total: list.length,
  truncated: list.length > ROW_CAP,
});

function sectionRows(key: string, records: any) {
  const d = records.decision || {};
  if (key === "identity") {
    return keep([
      row("رقم القرار", "Decision number", d.decision_number, "Decision"),
      row("عنوان القرار", "Title", arText(d, "title"), "Decision"),
      row("الحالة المسجَّلة", "Recorded status", d.status, "Decision"),
      row("حالة الإصدار", "Issuance state", d.issuance_state, "Decision"),
      row("بصمة حزمة الإصدار", "Issue manifest digest", short(d.issue_manifest_sha256, 20), "Decision"),
    ]);
  }
  if (key === "origin") {
    const m = records.meeting || {};
    return keep([
      row("الاجتماع", "Meeting", arText(m, "title"), "Meeting"),
      row("تاريخ الاجتماع", "Meeting date", m.date || m.scheduled_at, "Meeting"),
      row("حالة الاجتماع", "Meeting status", m.status, "Meeting"),
    ]);
  }
  if (key === "voting") {
    const rounds = records.electorate || [];
    const votes = records.votes || [];
    const rows: any[] = [];
    for (const r of rounds) {
      rows.push(row("الدورة", "Round", r.round, "EligibleVoterSnapshot"));
      rows.push(row("نسخة النص المجمّد", "Frozen proposal version", r.proposal_version, "EligibleVoterSnapshot"));
      rows.push(row("المقاعد المؤهلة", "Eligible seats", r.eligible_seat_count, "EligibleVoterSnapshot"));
      rows.push(row("عدد الناخبين", "Voting count", r.eligible_count, "EligibleVoterSnapshot"));
      rows.push(row("أساس التصويت", "Voting basis", r.voter_basis, "EligibleVoterSnapshot"));
      rows.push(row("القاعدة", "Voting rule", r.voting_rule, "EligibleVoterSnapshot"));
      rows.push(row("النصاب المطلوب", "Quorum required", r.quorum_required, "EligibleVoterSnapshot"));
      rows.push(row("جمّدت في", "Frozen at", r.frozen_at, "EligibleVoterSnapshot"));
      rows.push(row("تغيّرات جوهرية عن الدورة السابقة", "Material changes from previous round", r.material_change_count, "EligibleVoterSnapshot"));
      rows.push(row("حالة الدورة", "Round status", r.status, "EligibleVoterSnapshot"));
    }
    // A nested source that was NOT read prints nothing at all — never a zero in its place.
    if (records.votes === undefined || records.votes === null) return keep(rows);
    rows.push(row("أصوات مسجَّلة (عدد)", "Votes recorded (count)", votes.length, "Vote"));
    for (const v of votes.slice(0, ROW_CAP)) {
      rows.push(row(`صوت — ${txt(v.voter_name) || txt(v.seat_id) || "—"}`, `Vote — ${txt(v.voter_name) || txt(v.seat_id) || "—"}`, v.vote_choice || v.choice || v.vote, "Vote"));
    }
    return keep(rows);
  }
  if (key === "circulation") {
    const rounds = records.circulation || [];
    const responses = records.circulation_responses || [];
    const rows: any[] = [];
    for (const r of rounds) {
      rows.push(row("دورة تمرير", "Circulation round", r.round_number, "CirculationRound"));
      rows.push(row("حالة الدورة", "Round state", r.state, "CirculationRound"));
      rows.push(row("القاعدة المطبَّقة", "Rule applied", r.rule, "CirculationRound"));
      rows.push(row("أُرسلت في", "Dispatched at", r.dispatched_at, "CirculationRound"));
      rows.push(row("المهلة", "Deadline", r.deadline_at, "CirculationRound"));
      rows.push(row("النتيجة", "Outcome", r.outcome, "CirculationRound"));
      rows.push(row("المشاركة", "Participation", r.participation_count, "CirculationRound"));
      rows.push(row("عدد الموافقات", "Approvals", r.tally_approve, "CirculationRound"));
      rows.push(row("عدد الرفض", "Rejections", r.tally_reject, "CirculationRound"));
      rows.push(row("الصمت (لا يُحتسب موافقة)", "Silent (never counted as approval)", r.tally_silent, "CirculationRound"));
    }
    if (records.circulation_responses === undefined || records.circulation_responses === null) return keep(rows);
    rows.push(row("ردود مسجَّلة (عدد)", "Responses recorded (count)", responses.length, "CirculationResponse"));
    for (const p of responses.slice(0, ROW_CAP)) {
      rows.push(row(`ردّ — ${txt(p.person_name) || txt(p.seat_id) || "—"}`, `Response — ${txt(p.person_name) || txt(p.seat_id) || "—"}`, p.response, "CirculationResponse"));
    }
    return keep(rows);
  }
  if (key === "issuance") {
    const snaps = records.issuance || [];
    const rows: any[] = [];
    for (const s of snaps) {
      rows.push(row("رقم الحزمة", "Snapshot version", s.snapshot_version, "IssueSnapshot"));
      rows.push(row("أُصدرت في", "Issued at", s.issued_at, "IssueSnapshot"));
      rows.push(row("الدورة المستند إليها", "Round relied upon", s.round_number, "IssueSnapshot"));
      rows.push(row("نسخة النص المُصدر", "Frozen proposal version issued", s.proposal_version, "IssueSnapshot"));
      rows.push(row("حجم الهيئة الناخبة", "Electorate size as frozen", s.electorate_size, "IssueSnapshot"));
      rows.push(row("الاقتراع المقبول", "Accepted ballots", s.accepted_ballot_count, "IssueSnapshot"));
      rows.push(row("اكتمال النصاب", "Quorum met", s.quorum_met, "IssueSnapshot"));
      rows.push(row("اكتمال النسبة", "Threshold met", s.threshold_met, "IssueSnapshot"));
      rows.push(row("مستوى الضمان", "Assurance level", s.assurance_level, "IssueSnapshot"));
      rows.push(row("بصمة البيان", "Manifest digest", short(s.manifest_sha256, 20), "IssueSnapshot"));
      rows.push(row("يصحّح حزمة", "Corrects snapshot", s.corrects_snapshot_id, "IssueSnapshot"));
    }
    return keep(rows);
  }
  if (key === "execution") {
    const actions = records.actions || [];
    const rows: any[] = [row("إجراءات منشأة (عدد)", "Actions created (count)", actions.length, "Action")];
    const closed = actions.filter((a: any) => a.status === "closed").length;
    const withVerdict = actions.filter((a: any) => a.verification_state === "accepted").length;
    rows.push(row("مغلقة", "Closed", closed, "Action"));
    rows.push(row("بدليل مقبول", "With accepted evidence", withVerdict, "Action"));
    for (const a of actions.slice(0, ROW_CAP)) {
      rows.push(row("الإجراء", "Action", arText(a, "title"), "Action"));
      rows.push(row("المسؤول", "Owner", arText(a, "owner_name"), "Action"));
      rows.push(row("المهلة", "Deadline", a.deadline, "Action"));
      rows.push(row("الحالة", "Status", a.status, "Action"));
      rows.push(row("حالة الدليل", "Evidence state", a.verification_state, "Action"));
      rows.push(row("أُغلق في", "Closed at", a.closed_at, "Action"));
    }
    return keep(rows);
  }
  if (key === "record") {
    const minutes = records.minutes || [];
    const rows: any[] = [];
    for (const m of minutes) {
      rows.push(row("حالة المحضر", "Minutes status", m.status, "MeetingMinutes"));
      rows.push(row("اعتُمد بواسطة", "Approved by", m.approved_by_name, "MeetingMinutes"));
      rows.push(row("عدد الحاضرين المسجَّلين", "Present seats recorded", Array.isArray(m.attendance) ? m.attendance.length : null, "MeetingMinutes"));
    }
    return keep(rows);
  }
  if (key === "audit") {
    const events = records.audit_events || [];
    const rows: any[] = [row("أحداث مسجَّلة (عدد)", "Events recorded (count)", events.length, "AuditEvent")];
    for (const e of events.slice(0, ROW_CAP)) {
      rows.push(row("الفعل", "Act", e.action || e.event_type, "AuditEvent"));
      rows.push(row("الوقت", "At", e.timestamp || e.created_date, "AuditEvent"));
      rows.push(row("الفاعل", "Actor", e.actor_name || e.user_email, "AuditEvent"));
    }
    return keep(rows);
  }
  return [];
}

/**
 * Assemble the dossier from records ALREADY READ by the governed command. This module reads nothing and
 * writes nothing: it states what it was given, and what it was not.
 */
export function assembleDossier({ decision, records = {}, unread = [], assembledAt = null }) {
  const sources = { ...records, decision: decision ?? records.decision ?? null };
  const sections = DOSSIER_SECTIONS.map((s) => {
    const field = SOURCE_FIELD[s.key];
    const present = sources[field] !== undefined && sources[field] !== null;
    const list = Array.isArray(sources[field]) ? sources[field] : (present ? [sources[field]] : []);
    const rows = present ? sectionRows(s.key, sources) : [];
    const capped = cap(rows);
    const state = !present ? "not_read" : (capped.total > 0 ? "recorded" : "not_recorded");
    const unreadEntry = unread.find((u: any) => (SECTION_SOURCE_KEYS[s.key] || [field]).includes(u.source)) || null;
    return {
      key: s.key,
      title: { ar: s.ar, en: s.en },
      sources: s.sources,
      state,
      state_label: SECTION_STATES[unreadEntry && !present ? "not_read" : state],
      unread_reason: unreadEntry ? unreadEntry.reason : null,
      // A section whose primary source was read but whose nested source was not is PARTIAL: it shows
      // what it has and says what it is missing.
      partial: !!(unreadEntry && present),
      rows: capped.rows,
      row_total: capped.total,
      truncated: capped.truncated,
    };
  });

  return {
    contract_version: EVIDENCE_DOSSIER_VERSION,
    assembled_at: assembledAt,
    decision_ref: {
      id: sources.decision?.id || null,
      number: txt(sources.decision?.decision_number),
      title: { ar: arText(sources.decision, "title"), en: enText(sources.decision, "title") },
      committee_id: sources.decision?.committee_id || null,
    },
    sections,
    section_order: DOSSIER_SECTIONS.map((s) => s.key),
    unread_sources: unread,
    row_cap: ROW_CAP,
    statements: DOSSIER_STATEMENTS,
  };
}

export function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const stateText = (section: any, lang: string) => {
  const s = section.state_label || SECTION_STATES[section.state];
  return s ? (lang === "ar" ? s.ar : s.en) : section.state;
};

/** Markdown — for a plain, verifiable text the reader can keep, diff or paste into a filing system. */
export function dossierToMarkdown(dossier: any, lang: "ar" | "en" = "ar") {
  const ar = lang === "ar";
  const lines: string[] = [];
  lines.push(`# ${ar ? "ملف أدلة القرار" : "Decision evidence dossier"} — ${dossier?.decision_ref?.number || dossier?.decision_ref?.id || ""}`);
  const title = ar ? dossier?.decision_ref?.title?.ar : dossier?.decision_ref?.title?.en;
  if (title) lines.push(`**${title}**`);
  lines.push("");
  lines.push(`> ${ar ? DOSSIER_STATEMENTS.digest_not_validity.ar : DOSSIER_STATEMENTS.digest_not_validity.en}`);
  lines.push(`> ${ar ? DOSSIER_STATEMENTS.absence_is_stated.ar : DOSSIER_STATEMENTS.absence_is_stated.en}`);
  lines.push("");
  lines.push(`\`${dossier?.contract_version}\` · ${dossier?.assembled_at || ""}`);
  lines.push("");
  for (const s of dossier?.sections || []) {
    lines.push(`## ${ar ? s.title.ar : s.title.en} — ${stateText(s, lang)}`);
    lines.push(`_${ar ? "المصادر" : "Sources"}: ${(s.sources || []).join(" · ")}_`);
    if (s.state === "not_read") {
      lines.push(`- ${ar ? "لم تُقرأ سجلات هذا القسم" : "The records of this section were not read"}${s.unread_reason ? `: ${s.unread_reason}` : ""}`);
    } else if (s.state === "not_recorded") {
      lines.push(`- ${ar ? SECTION_STATES.not_recorded.ar : SECTION_STATES.not_recorded.en} — ${ar ? "لا يوجد سجل لهذا القسم" : "no record exists for this section"}`);
    } else {
      for (const r of s.rows) {
        lines.push(`- **${ar ? r.ar : r.en}**: ${r.value}  _( ${r.source} )_`);
      }
      if (s.truncated) lines.push(`- ${ar ? `أُدرج ${s.rows.length} من ${s.row_total} سطرًا` : `${s.rows.length} of ${s.row_total} rows shown`}`);
      if (s.partial) lines.push(`- ${ar ? "قسم ناقص: مصدر لم يُقرأ —" : "Partial section: a source was not read —"} ${s.unread_reason || ""}`);
    }
    lines.push("");
  }
  if ((dossier?.unread_sources || []).length) {
    lines.push(`## ${ar ? "مصادر لم تُقرأ" : "Sources not read"}`);
    for (const u of dossier.unread_sources) lines.push(`- ${u.source}: ${u.reason}`);
    lines.push("");
  }
  lines.push("---");
  lines.push(ar ? DOSSIER_STATEMENTS.values_name_source.ar : DOSSIER_STATEMENTS.values_name_source.en);
  lines.push(ar ? DOSSIER_STATEMENTS.unread_is_named.ar : DOSSIER_STATEMENTS.unread_is_named.en);
  return lines.join("\n");
}

/** A self-contained printable document: no scripts, no external assets, everything escaped. */
export function dossierToPrintableHtml(dossier: any, lang: "ar" | "en" = "ar") {
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const sections = (dossier?.sections || []).map((s) => {
    const rows = s.rows.map((r) => `<tr><th>${escapeHtml(ar ? r.ar : r.en)}</th><td>${escapeHtml(r.value)}</td><td class="src">${escapeHtml(r.source)}</td></tr>`).join("");
    const body = s.state === "not_read"
      ? `<p class="none">${escapeHtml(ar ? "لم تُقرأ سجلات هذا القسم" : "The records of this section were not read")}${s.unread_reason ? `: ${escapeHtml(s.unread_reason)}` : ""}</p>`
      : s.state === "not_recorded"
        ? `<p class="none">${escapeHtml(ar ? SECTION_STATES.not_recorded.ar : SECTION_STATES.not_recorded.en)}</p>`
        : `<table>${rows}</table>${s.truncated ? `<p class="none">${escapeHtml(ar ? `أُدرج ${s.rows.length} من ${s.row_total} سطرًا` : `${s.rows.length} of ${s.row_total} rows shown`)}</p>` : ""}${s.partial ? `<p class="none">${escapeHtml(ar ? `قسم ناقص: مصدر لم يُقرأ — ${s.unread_reason || ""}` : `Partial section: a source was not read — ${s.unread_reason || ""}`)}</p>` : ""}`;
    return `<section><h2>${escapeHtml(ar ? s.title.ar : s.title.en)} <span class="state">${escapeHtml(stateText(s, lang))}</span></h2>`
      + `<p class="src">${escapeHtml(ar ? "المصادر" : "Sources")}: ${escapeHtml((s.sources || []).join(" · "))}</p>${body}</section>`;
  }).join("");

  const unread = (dossier?.unread_sources || []).length
    ? `<section><h2>${escapeHtml(ar ? "مصادر لم تُقرأ" : "Sources not read")}</h2><ul>${dossier.unread_sources.map((u: any) => `<li>${escapeHtml(u.source)}: ${escapeHtml(u.reason)}</li>`).join("")}</ul></section>`
    : "";

  return `<!doctype html><html dir="${dir}" lang="${ar ? "ar" : "en"}"><head><meta charset="utf-8">`
    + `<title>${escapeHtml(ar ? "ملف أدلة القرار" : "Decision evidence dossier")} — ${escapeHtml(dossier?.decision_ref?.number || "")}</title>`
    + `<style>body{font-family:"Noto Naskh Arabic",Arial,sans-serif;background:#FAF8F5;color:#1F2023;margin:0;padding:32px;line-height:1.55}`
    + `h1{color:#8A1538;margin:0 0 4px;font-size:22px}h2{color:#8A1538;font-size:16px;margin:24px 0 4px;border-bottom:1px solid #E7E3DF;padding-bottom:4px}`
    + `.state{font-size:11px;font-weight:400;color:#6F7176;border:1px solid #E7E3DF;border-radius:4px;padding:1px 6px}`
    + `.src{font-size:11px;color:#6F7176;margin:2px 0 8px}table{width:100%;border-collapse:collapse;font-size:13px}`
    + `th,td{text-align:start;border-bottom:1px solid #E7E3DF;padding:5px 6px;vertical-align:top}th{width:32%;font-weight:600;color:#1F2023}`
    + `td.src{width:14%;font-size:10px;color:#6F7176}.none{font-size:13px;color:#6F7176;margin:6px 0}`
    + `header{border-bottom:2px solid #8A1538;padding-bottom:12px}blockquote{background:#FFFFFF;border:1px solid #E7E3DF;border-radius:10px;padding:12px;font-size:13px;color:#1F2023}`
    + `footer{margin-top:28px;border-top:1px solid #E7E3DF;padding-top:10px;font-size:11px;color:#6F7176}</style></head><body>`
    + `<header><h1>${escapeHtml(ar ? "ملف أدلة القرار" : "Decision evidence dossier")} — ${escapeHtml(dossier?.decision_ref?.number || dossier?.decision_ref?.id || "")}</h1>`
    + `<p>${escapeHtml(ar ? dossier?.decision_ref?.title?.ar : dossier?.decision_ref?.title?.en)}</p>`
    + `<p class="src">${escapeHtml(dossier?.contract_version || "")} · ${escapeHtml(dossier?.assembled_at || "")}</p></header>`
    + `<blockquote>${escapeHtml(ar ? DOSSIER_STATEMENTS.digest_not_validity.ar : DOSSIER_STATEMENTS.digest_not_validity.en)}<br>`
    + `${escapeHtml(ar ? DOSSIER_STATEMENTS.absence_is_stated.ar : DOSSIER_STATEMENTS.absence_is_stated.en)}</blockquote>`
    + sections + unread
    + `<footer>${escapeHtml(ar ? DOSSIER_STATEMENTS.values_name_source.ar : DOSSIER_STATEMENTS.values_name_source.en)}<br>`
    + `${escapeHtml(ar ? DOSSIER_STATEMENTS.unread_is_named.ar : DOSSIER_STATEMENTS.unread_is_named.en)}</footer></body></html>`;
}