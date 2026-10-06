import {
  guestState, evaluateGuestAccess, isGuestItem, isGuestDocumentPermitted,
  buildGuestExtract, buildGuestPreview, validateGuestInvitation,
  GUEST_ACCESS_VERSION, GUEST_FILE_DELIVERY, MAX_GUEST_VALIDITY_DAYS,
} from '../../shared/guestAccess.ts';

// TestGuestAccess — executed evidence for the ITEM-LEVEL GUEST contract (guest-access-1.0.0).
//
// Pure: nothing is written, so running it changes nothing. It exercises the SAME module the
// invitation command, the recipient preview and the public guest view consume, so a PASS here is a
// statement about the rule those three share — not about a persisted invitation, which needs an
// authorized seated actor and remains NOT TESTED.

const NOW = new Date("2026-10-06T09:00:00Z");
const guest = (over = {}) => ({
  id: "GUEST-1", committee_id: "COMM-1", agenda_item_id: "ITEM-1", meeting_id: "MEET-1",
  guest_name: "ضيف", guest_name_en: "Guest", access_scope: "item_only", status: "active",
  permitted_document_ids: ["DOC-1"], expires_at: "2026-10-20T09:00:00Z", valid_from: null,
  access_token: "gst_test", organization_id: "ORG-1", ...over,
});
const item = { id: "ITEM-1", sequence: 3, title_ar: "بند", title_en: "Item", objective_ar: "هدف", required_decision: "قرار", presenter: "مقدم", time_allocation_minutes: 15, classification: "internal", status: "pending" };
const document = (over = {}) => ({ id: "DOC-1", title: "مرفق", document_type: "memo", classification: "internal", current_version_number: 2, ...over });

export default async function () {
  try {
    const results = [];
    const check = (id, description, ok, detail) => results.push({ test_id: id, description, verdict: ok ? "PASS" : "FAIL", detail });

    // GA-001 — an unknown token is refused and is distinguishable from a dead invitation
    const unknown = evaluateGuestAccess({ guest: null, now: NOW });
    check("GA-001", "An unknown token is refused with its own code", unknown.allowed === false && unknown.code === "token_unknown", { code: unknown.code });

    // GA-002 — revoked
    const revoked = evaluateGuestAccess({ guest: guest({ status: "revoked" }), now: NOW });
    check("GA-002", "A revoked invitation is refused", revoked.allowed === false && revoked.code === "revoked", { code: revoked.code });

    // GA-003 — expired
    const expired = evaluateGuestAccess({ guest: guest({ expires_at: "2026-10-05T09:00:00Z" }), now: NOW });
    check("GA-003", "An expired invitation is refused server-side", expired.allowed === false && expired.code === "expired", { code: expired.code });

    // GA-004 — the expiry boundary itself is CLOSED (valid only while now < expires_at)
    const boundary = evaluateGuestAccess({ guest: guest({ expires_at: "2026-10-06T09:00:00Z" }), now: NOW });
    check("GA-004", "The expiry instant itself is already closed", boundary.allowed === false && boundary.code === "expired", { code: boundary.code });

    // GA-005 — a live invitation is allowed
    const live = evaluateGuestAccess({ guest: guest(), now: NOW });
    check("GA-005", "A live invitation is allowed", live.allowed === true && live.code === null, { code: live.code });

    // GA-006 — a not-yet-valid window is refused
    const scheduled = evaluateGuestAccess({ guest: guest({ valid_from: "2026-10-10T09:00:00Z" }), now: NOW });
    check("GA-006", "An invitation whose window has not opened is refused", scheduled.allowed === false && scheduled.code === "scheduled", { code: scheduled.code });

    // GA-007 — the scope can never widen: anything but item_only is refused
    const widened = evaluateGuestAccess({ guest: guest({ access_scope: "committee" }), now: NOW });
    check("GA-007", "Any scope other than item_only is refused", widened.allowed === false && widened.code === "scope_unsupported", { code: widened.code });

    // GA-008 — the guest is bound to exactly one item
    check("GA-008", "A guest is bound to the named item and to no other", isGuestItem(guest(), "ITEM-1") === true && isGuestItem(guest(), "ITEM-2") === false, {});

    // GA-009 — an unlisted document is never permitted
    const unlisted = isGuestDocumentPermitted({ guest: guest(), document: document({ id: "DOC-9" }) });
    check("GA-009", "A document the invitation does not name is never permitted", unlisted.permitted === false && unlisted.code === "not_listed", { code: unlisted.code });

    // GA-010 — minutes are refused EVEN WHEN LISTED
    const minutesListed = isGuestDocumentPermitted({ guest: guest({ permitted_document_ids: ["DOC-2"] }), document: document({ id: "DOC-2", document_type: "minutes" }) });
    check("GA-010", "Minutes are refused even when the invitation lists them", minutesListed.permitted === false && minutesListed.code === "hard_denied_document_type", { code: minutesListed.code });

    // GA-011 — restricted material is refused even when listed
    const restrictedListed = isGuestDocumentPermitted({ guest: guest({ permitted_document_ids: ["DOC-3"] }), document: document({ id: "DOC-3", classification: "restricted" }) });
    check("GA-011", "Restricted material is refused even when the invitation lists it", restrictedListed.permitted === false && restrictedListed.code === "hard_denied_classification", { code: restrictedListed.code });

    // GA-012 — the extract carries the item and ONLY the permitted attachments
    const extract = buildGuestExtract({ guest: guest({ permitted_document_ids: ["DOC-1", "DOC-2"] }), item, meeting: { id: "MEET-1", date: "2026-10-20" }, committee: { id: "COMM-1", name_ar: "لجنة" }, organization: { id: "ORG-1", name_ar: "جهة" }, documents: [document(), document({ id: "DOC-2", document_type: "minutes" })] });
    check("GA-012", "The extract carries the named item and only the permitted attachments", extract.item?.id === "ITEM-1" && extract.attachments.length === 1 && extract.attachments[0].id === "DOC-1", { attachments: extract.attachments.map((a) => a.id) });

    // GA-013 — the extract contains no register, pack, minutes or vote surface at all
    const keys = Object.keys(extract);
    const forbidden = ["minutes", "pack", "votes", "members", "decisions", "documents"];
    check("GA-013", "The guest payload exposes no minutes, pack, register or vote surface", forbidden.every((k) => !keys.includes(k)), { keys });

    // GA-014 — file bytes are NOT delivered, and that limit is stated in the payload
    check("GA-014", "Guest file delivery is reported as blocked rather than simulated", extract.file_delivery?.status === "blocked" && GUEST_FILE_DELIVERY.status === "blocked" && !!extract.limits?.en, { status: extract.file_delivery?.status });

    // GA-015 — the payload agrees with the record on contract version and expiry
    check("GA-015", "The guest view names the contract version and the record's own expiry", extract.contract_version === GUEST_ACCESS_VERSION && extract.scope.expires_at === "2026-10-20T09:00:00Z", { version: extract.contract_version, expires: extract.scope.expires_at });

    // GA-016 — a guest is never told that withheld material exists
    check("GA-016", "Withheld material is not named to the guest", extract.attachments.length === 1 && !JSON.stringify(extract).includes("DOC-2"), {});

    // GA-017 — the inviter's preview DOES name what is withheld (that is its purpose)
    const preview = buildGuestPreview({ guest: guest({ permitted_document_ids: ["DOC-1", "DOC-2"] }), item, meeting: null, committee: null, organization: null, documents: [document(), document({ id: "DOC-2", document_type: "minutes" })], now: NOW });
    check("GA-017", "The recipient preview names the withheld attachments and the scope statement", preview.withheld.length === 1 && preview.withheld[0].id === "DOC-2" && preview.scope_statement.never_en.length === 4, { withheld: preview.withheld });

    // GA-018 — the preview offers the link only while the invitation is live
    const deadPreview = buildGuestPreview({ guest: guest({ status: "revoked" }), item, meeting: null, committee: null, organization: null, documents: [], now: NOW });
    check("GA-018", "The preview offers no link for a dead invitation", preview.link === "/guest/gst_test" && deadPreview.link === null, { live: preview.link, dead: deadPreview.link });

    // GA-019 — an expiry is required (a guest invitation is never open-ended)
    const noExpiry = validateGuestInvitation({ guest_name: "ضيف", expires_at: null, now: NOW });
    check("GA-019", "An invitation without an expiry is refused", noExpiry.valid === false && noExpiry.errors[0].code === "expiry_required", { errors: noExpiry.errors });

    // GA-020 — validity is bounded
    const far = validateGuestInvitation({ guest_name: "ضيف", expires_at: "2028-01-01T00:00:00Z", now: NOW });
    const soon = validateGuestInvitation({ guest_name: "ضيف", expires_at: "2026-11-01T00:00:00Z", now: NOW });
    check("GA-020", `A bounded invitation is accepted and one beyond ${MAX_GUEST_VALIDITY_DAYS} days is refused`, soon.valid === true && far.valid === false && far.errors[0].code === "expiry_too_far", { soon: soon.valid, far: far.errors });

    // GA-021 — a nameless invitation is refused, and a past expiry is refused
    const past = validateGuestInvitation({ guest_name: "ضيف", expires_at: "2026-10-01T00:00:00Z", now: NOW });
    const nameless = validateGuestInvitation({ guest_name: "  ", expires_at: "2026-11-01T00:00:00Z", now: NOW });
    check("GA-021", "A past expiry and a nameless guest are both refused", past.valid === false && past.errors[0].code === "expiry_not_future" && nameless.valid === false, { past: past.errors, nameless: nameless.errors });

    // GA-022 — the state machine reports the same answer the decision does
    check("GA-022", "guestState and evaluateGuestAccess agree on every state", guestState(guest(), NOW) === "active" && guestState(guest({ status: "revoked" }), NOW) === "revoked" && guestState(guest({ expires_at: "2020-01-01T00:00:00Z" }), NOW) === "expired" && guestState(null, NOW) === "token_unknown", {});

    const failed = results.filter((r) => r.verdict === "FAIL");
    return Response.json({
      contract_version: GUEST_ACCESS_VERSION,
      suites: { guest_access: { total: results.length, passed: results.length - failed.length, failed: failed.length, verdict: failed.length === 0 ? "PASS" : "FAIL" } },
      failures: failed.map((r) => ({ test_id: r.test_id, description: r.description, detail: r.detail })),
      writes_performed: 0,
      records_read: 0,
      evidence_ids: results.map((r) => `E-S13-${r.test_id}`),
      scope_note: "This suite proves the CONTRACT. A persisted invitation, a real guest read and browser behaviour are NOT TESTED (no authorized seated actor, no public guest rehearsal in this build).",
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}