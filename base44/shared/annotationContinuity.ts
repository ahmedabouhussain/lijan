// annotationContinuity.ts — the ONE contract for personal and shared notes on committee documents
// (annotation-continuity-1.0.0, Stream C, S15).
//
// Product promises this contract makes testable:
//   1. A note belongs to the VERSION it was written on. A newer version never moves it silently: the
//      note stays on its version and is shown as "written on version N" with what changed since.
//   2. Carrying a note forward is the AUTHOR's explicit act. It creates a NEW note linked to the
//      original (the original is never mutated) and states whether the anchor could be verified.
//      This build stores no extracted document text, so a changed file is always flagged
//      `unverified` — it is never declared re-anchored on a guess.
//   3. A private note is visible to its author only — not to the committee, not to an institution
//      administrator, not to a successor. It never enters official records or handover packs.
//   4. "Unchanged" is claimed only when both versions carry a content fingerprint and they agree.
//      A missing fingerprint is `unknown`, never `identical`.
import { toAsciiDigits } from "./proposalContent.ts";

export const ANNOTATION_CONTRACT_VERSION = "annotation-continuity-1.0.0";

/** The two personal rights (both derived from the seat's read right in the authority kernel). */
export const ANNOTATION_CAPABILITIES = { create: "document.annotate", own: "annotation.own" };

/** Identity-bound acts, read by the command guard: only the author acts on their own note. */
export const ANNOTATION_IDENTITY_BOUND: Record<string, string> = { "annotation.own": "author_user_id" };

export const REANCHOR_STATES = ["original", "identical_content", "unverified"];
export const ANNOTATION_LIMITS = { body_max: 4000, anchor_max: 1000, page_max: 10000 };

/** Private notes are never part of an official output — listed as data so tests can hold it. */
export const OFFICIAL_OUTPUT_EXCLUSION = {
  private_notes: true,
  surfaces: ["minutes", "decision_package", "issue_snapshot", "handover_pack", "guest_view", "exports"],
};

const t = (en: string, ar: string) => ({ en, ar });
export const ANNOTATION_REFUSALS: Record<string, { en: string; ar: string }> = {
  body_required: t("A note needs text", "الملاحظة تحتاج إلى نص"),
  body_too_long: t("The note is longer than the permitted length", "الملاحظة أطول من الحد المسموح"),
  anchor_too_long: t("The quoted passage is longer than the permitted length", "المقطع المقتبس أطول من الحد المسموح"),
  page_invalid: t("The page number is not valid", "رقم الصفحة غير صالح"),
  version_superseded: t("New notes attach to the version in force; this version has been superseded", "الملاحظات الجديدة تُضاف إلى الإصدار النافذ؛ وهذا الإصدار مُستبدَل"),
  other_document: t("A note can only be carried to a version of the same document", "لا تُنقل الملاحظة إلا إلى إصدار من المستند نفسه"),
  not_newer_version: t("A note is carried forward only to a newer version", "لا تُنقل الملاحظة إلا إلى إصدار أحدث"),
  not_active: t("Only an active note can be carried forward or resolved", "لا يُنقل أو يُغلق إلا ملاحظة قائمة"),
  version_unavailable: t("The version this note belongs to cannot be read; the note is not moved", "تعذّرت قراءة الإصدار الذي تنتمي إليه الملاحظة؛ ولم تُنقل"),
};

export function refusal(code: string, status = 409, extra: Record<string, any> = {}) {
  const text = ANNOTATION_REFUSALS[code] || t(code, code);
  return { ok: false, code, status, reason: text.en, reason_ar: text.ar, ...extra };
}

/** Normalised anchor text: NFC, Latin digits, no diacritics/tatweel, single spaces. */
export function normalizeAnchor(text: any) {
  if (typeof text !== "string") return "";
  return toAsciiDigits(text.normalize("NFC"))
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function anchorDigest(text: any) {
  const norm = normalizeAnchor(text);
  if (!norm) return null;
  const bytes = new TextEncoder().encode(norm);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function validateNoteInput({ body, anchor_text, page_number }: Record<string, any>) {
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return refusal("body_required", 400);
  if (text.length > ANNOTATION_LIMITS.body_max) return refusal("body_too_long", 400);
  if (typeof anchor_text === "string" && anchor_text.length > ANNOTATION_LIMITS.anchor_max) return refusal("anchor_too_long", 400);
  if (page_number !== undefined && page_number !== null && page_number !== "") {
    const n = Number(page_number);
    if (!Number.isInteger(n) || n < 1 || n > ANNOTATION_LIMITS.page_max) return refusal("page_invalid", 400);
  }
  return { ok: true };
}

/** The version in force: the document's own pointer, else the highest-numbered non-archived version. */
export function currentVersionOf(document: any, versions: any[] = []) {
  const byPointer = document?.current_version_id && versions.find((v) => v.id === document.current_version_id);
  if (byPointer) return byPointer;
  const live = versions.filter((v) => v.status !== "archived");
  return live.sort((a, b) => (b.version_number || 0) - (a.version_number || 0))[0] || null;
}

export function assessCreate({ version, current }: { version: any; current: any }) {
  if (!version || !current || version.id !== current.id) return refusal("version_superseded", 409);
  return { ok: true };
}

/** What changed between two versions — by content fingerprint only; text diff is not available. */
export function versionChange(from: any, to: any) {
  const base = {
    from_version: from?.version_number ?? null, to_version: to?.version_number ?? null,
    from_id: from?.id || null, to_id: to?.id || null,
    size_delta: Number.isFinite(from?.file_size_bytes) && Number.isFinite(to?.file_size_bytes) ? to.file_size_bytes - from.file_size_bytes : null,
    change_summary: to?.change_summary || null, change_summary_ar: to?.change_summary_ar || null,
    basis: "content_hash", text_diff: "unavailable",
  };
  if (!from?.content_hash || !to?.content_hash) return { ...base, state: "unknown" };
  return { ...base, state: from.content_hash === to.content_hash ? "identical" : "changed" };
}

/** Where a note stands relative to the version in force. Never relocates it. */
export function noteContinuity(note: any, versionsById: Record<string, any>, current: any) {
  if (!note?.document_version_id) return { state: "unbound_legacy", on_version: null, current_version: current?.version_number ?? null, change: null };
  const own = versionsById[note.document_version_id];
  if (!own) return { state: "version_unavailable", on_version: note.version_number ?? null, current_version: current?.version_number ?? null, change: null };
  if (current && own.id === current.id) return { state: "current", on_version: own.version_number, current_version: own.version_number, change: null };
  return { state: "superseded", on_version: own.version_number, current_version: current?.version_number ?? null, change: versionChange(own, current) };
}

export function assessCarryForward({ note, source_version, target_version, existing = [] }: Record<string, any>) {
  if (!note || note.status !== "active") return refusal("not_active", 409);
  if (!source_version) return refusal("version_unavailable", 409);
  if (!target_version || target_version.document_id !== note.document_id || source_version.document_id !== note.document_id) return refusal("other_document", 409);
  if ((target_version.version_number || 0) <= (source_version.version_number || 0)) return refusal("not_newer_version", 409);
  const prior = existing.find((e: any) => e.carried_from_annotation_id === note.id && e.document_version_id === target_version.id && e.status !== "deleted");
  if (prior) return { ok: true, idempotent: true, existing_id: prior.id, reanchor_state: prior.reanchor_state || null };
  const change = versionChange(source_version, target_version);
  return { ok: true, idempotent: false, reanchor_state: change.state === "identical" ? "identical_content" : "unverified", change };
}

/** What a caller may see: every note of their own; others' notes only when shared. */
export function visibleNotes(notes: any[] = [], actor_user_id: string | null) {
  return notes.filter((n) => n && n.status !== "deleted"
    && ((actor_user_id && n.author_user_id === actor_user_id) || n.is_private === false));
}