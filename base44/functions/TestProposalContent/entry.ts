import {
  canonicalProposal, proposalDigest, compareProposals, contentBinding, bindingRefusal,
  serializeProposal, versionLabel, PROPOSAL_CONTENT_VERSION,
} from '../../shared/proposalContent.ts';

// TestProposalContent — executed evidence for FROZEN PROPOSAL CONTENT and MATERIAL-CHANGE detection
// (proposal-content-1.0.0). Pure: nothing is read or written. It exercises the SAME module OpenVote,
// CastVote, IssueDecision and GetProposalChanges consume, so a PASS is a statement about the rule they
// share — not about a persisted round, which needs an authorized seated actor and stays NOT TESTED.

const base = {
  title: "Approve the procurement budget", title_ar: "اعتماد ميزانية المشتريات", title_en: "Approve the procurement budget",
  proposal: "تعتمد اللجنة مبلغ 1,500,000 ريال لمشروع التحول الرقمي حتى 2026-12-31.",
  proposal_en: "The committee approves QAR 1,500,000 for the digital transformation project until 2026-12-31.",
  legal_basis: "المادة 7 من الميثاق", owner_name: "إدارة المشتريات", deadline: "2026-12-31",
  status: "draft", vote_for: 0,
};

export default async function () {
  try {
    const results: any[] = [];
    const check = (id: string, description: string, ok: boolean, detail: any = {}) => results.push({ test_id: id, description, verdict: ok ? "PASS" : "FAIL", detail });

    const c0 = canonicalProposal(base);
    const d0 = await proposalDigest(c0);

    // PC-001 — status, tallies and other non-proposal fields do not change the fingerprint
    const d1 = await proposalDigest(canonicalProposal({ ...base, status: "voting", vote_for: 9, updated_date: "2026-10-06T10:00:00Z" }));
    check("PC-001", "Status, tallies and timestamps do not change the proposal fingerprint", d0 === d1, { d0, d1 });

    // PC-002 — whitespace-only edits are not a change
    const d2 = await proposalDigest(canonicalProposal({ ...base, proposal: "  تعتمد اللجنة   مبلغ 1,500,000 ريال لمشروع التحول الرقمي حتى 2026-12-31.  " }));
    check("PC-002", "Whitespace-only edits do not change the fingerprint", d0 === d2, {});

    // PC-003 — the fingerprint is deterministic and well-formed
    check("PC-003", "The fingerprint is a deterministic SHA-256 digest", /^sha256:[0-9a-f]{64}$/.test(d0) && d0 === await proposalDigest(JSON.parse(serializeProposal(c0))) && versionLabel(d0)?.startsWith("pc:") === true, { d0 });

    // PC-004 — a changed amount is material
    const amt = compareProposals(c0, canonicalProposal({ ...base, proposal: base.proposal.replace("1,500,000", "2,000,000") }));
    const amtF = amt.fields.find((f: any) => f.field === "proposal");
    check("PC-004", "A changed amount is flagged as material, with before and after values", amt.material && amtF?.findings.some((x: any) => x.type === "amount_changed" && x.before.includes("1500000") && x.after.includes("2000000")), { findings: amtF?.findings });

    // PC-005 — Arabic-Indic digits are read as the same amount (no false change)
    const indic = compareProposals(c0, canonicalProposal({ ...base, proposal: "تعتمد اللجنة مبلغ ١٬٥٠٠٬٠٠٠ ريال لمشروع التحول الرقمي حتى 2026-12-31." }));
    const indicF = indic.fields.find((f: any) => f.field === "proposal");
    check("PC-005", "Arabic-Indic digits with the same value are not an amount change", !!indicF && !indicF.findings.some((x: any) => x.type === "amount_changed") && indicF.material === false, { findings: indicF?.findings });

    // PC-006 — an added Arabic negation is material
    const negAr = compareProposals(c0, canonicalProposal({ ...base, proposal: "لا تعتمد اللجنة مبلغ 1,500,000 ريال لمشروع التحول الرقمي حتى 2026-12-31." }));
    const negArF = negAr.fields.find((f: any) => f.field === "proposal");
    check("PC-006", "An added Arabic negation is flagged as material", negAr.material && negArF?.findings.some((x: any) => x.type === "negation_added" && x.tokens.includes("لا")), { findings: negArF?.findings });

    // PC-007 — an added English negation is material
    const negEn = compareProposals(c0, canonicalProposal({ ...base, proposal_en: "The committee does not approve QAR 1,500,000 for the digital transformation project until 2026-12-31." }));
    const negEnF = negEn.fields.find((f: any) => f.field === "proposal_en");
    check("PC-007", "An added English negation is flagged as material", negEn.material && negEnF?.findings.some((x: any) => x.type === "negation_added" && x.tokens.includes("not")), { findings: negEnF?.findings });

    // PC-008 — a removed negation with a proclitic (وعدم / بدون) is material
    const withNeg = canonicalProposal({ ...base, proposal: "تعتمد اللجنة المشروع بدون تمويل إضافي وعدم التمديد." });
    const noNeg = canonicalProposal({ ...base, proposal: "تعتمد اللجنة المشروع مع تمويل إضافي والتمديد." });
    const remF = compareProposals(withNeg, noNeg).fields.find((f: any) => f.field === "proposal");
    check("PC-008", "A removed negation, including a prefixed one, is flagged as material", remF?.findings.some((x: any) => x.type === "negation_removed" && x.tokens.includes("بدون") && x.tokens.includes("عدم")), { findings: remF?.findings });

    // PC-009 — a changed date is material
    const date = compareProposals(c0, canonicalProposal({ ...base, proposal: base.proposal.replace("2026-12-31", "2027-03-31") }));
    check("PC-009", "A changed date is flagged as material", date.fields.find((f: any) => f.field === "proposal")?.findings.some((x: any) => x.type === "date_changed"), {});

    // PC-010 — a changed execution owner or deadline is material
    const owner = compareProposals(c0, canonicalProposal({ ...base, owner_name: "إدارة المالية", deadline: "2027-01-31" }));
    check("PC-010", "A changed execution owner and deadline are both material", owner.material_count === 2 && owner.fields.every((f: any) => f.material), { fields: owner.fields.map((f: any) => f.field) });

    // PC-011 — a wording-only edit is reported but not material
    const words = compareProposals(c0, canonicalProposal({ ...base, title_en: "Approval of the procurement budget" }));
    check("PC-011", "A wording-only edit is reported as a textual (non-material) change", words.changed && !words.material && words.textual_count === 1, { fields: words.fields });

    // PC-012 — binding: the content now equals the frozen content
    const round = { proposal_content: serializeProposal(c0), proposal_sha256: d0 };
    const bound = await contentBinding({ round, decision: { ...base, status: "voting" } });
    check("PC-012", "A round is bound when the current content is the frozen content", bound.state === "bound" && bound.code === null, { state: bound.state });

    // PC-013 — binding: the proposal changed after the round froze
    const stale = await contentBinding({ round, decision: { ...base, proposal: base.proposal.replace("1,500,000", "2,000,000") } });
    check("PC-013", "An edit after the round froze makes the round stale, with the material change named", stale.state === "stale" && stale.code === "stale_content" && stale.changes?.material === true, { state: stale.state });

    // PC-014 — binding: a legacy round with no frozen content
    const legacy = await contentBinding({ round: { proposal_version: "2026-10-01T00:00:00Z" }, decision: base });
    check("PC-014", "A round opened before content freezing is reported as unbound, never assumed bound", legacy.state === "unbound_legacy" && legacy.code === "no_frozen_content", { state: legacy.state });

    // PC-015 — binding: the stored frozen copy was altered
    const tampered = await contentBinding({ round: { proposal_content: serializeProposal({ ...c0, proposal: "نص آخر" }), proposal_sha256: d0 }, decision: base });
    check("PC-015", "A frozen copy that no longer re-hashes to its fingerprint is refused", tampered.state === "tampered" && tampered.code === "frozen_content_tampered", { state: tampered.state });

    // PC-016 — the refusal body is bilingual and states that nothing was written
    const refusal = bindingRefusal(stale, "corr_test");
    check("PC-016", "The refusal is bilingual, names the material change and records no write", !!refusal.error && !!refusal.error_ar && refusal.decided === "refused_before_write" && refusal.content_binding.material === true && Array.isArray(refusal.content_binding.changes), { code: refusal.code });

    // PC-017 — unchanged content produces no change report
    const none = compareProposals(c0, canonicalProposal({ ...base }));
    check("PC-017", "Identical content produces no change report", none.changed === false && none.fields.length === 0, {});

    // PC-018 — a percentage change is an amount change
    const pct = compareProposals(canonicalProposal({ ...base, proposal: "نسبة الإنجاز المطلوبة 80%" }), canonicalProposal({ ...base, proposal: "نسبة الإنجاز المطلوبة 60٪" }));
    check("PC-018", "A changed percentage (including the Arabic percent sign) is material", pct.fields[0]?.findings.some((x: any) => x.type === "amount_changed" && x.before.includes("80%") && x.after.includes("60%")), { findings: pct.fields[0]?.findings });

    const failed = results.filter((r) => r.verdict === "FAIL");
    return Response.json({
      contract_version: PROPOSAL_CONTENT_VERSION,
      suites: { proposal_content: { total: results.length, passed: results.length - failed.length, failed: failed.length, verdict: failed.length === 0 ? "PASS" : "FAIL" } },
      failures: failed.map((r) => ({ test_id: r.test_id, description: r.description, detail: r.detail })),
      writes_performed: 0,
      records_read: 0,
      scope_note: "Proves the CONTRACT shared by OpenVote, CastVote, IssueDecision and GetProposalChanges. A persisted round, a refused stale ballot on a real decision and browser behaviour are NOT TESTED (no authorized seated actor).",
      results,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}