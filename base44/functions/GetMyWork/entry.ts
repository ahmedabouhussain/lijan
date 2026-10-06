import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveAuthority, capabilitiesForRole } from '../../shared/authorityKernel.ts';
import { resolvePersonaCapabilities } from '../../shared/committeeAuth.ts';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';
import { DEMO_DATASET } from '../../shared/demoDataset.ts';
import { DONE_STATUSES } from '../../shared/actionState.ts';
import { assemblePersonalWork, PERSONAL_WORK_VERSION } from '../../shared/personalWork.ts';

// GetMyWork — «مساحتي»: the person's OWN queue, derived from governed records.
//
// READ-ONLY. This command writes nothing and decides no authority: it reports what the person's own
// seats and identities require of them, and it reports what it could NOT read instead of returning a
// false zero. Every act it names is performed by its own governed command afterwards, and that command
// re-authorizes — the queue is a statement of work, never a permission.
//
// Scope rules kept here (product brief revision 3, streams A and D):
//   • The queue is derived per COMMITTEE from the caller's own seats. A selected organization, a job
//     title, a platform role or an organization membership never produces operational work.
//   • An identity-bound obligation (an action you own, a handover that names you successor, a review
//     request addressed to you) is yours alone and is never inferred for another seat.
//   • Administrative oversight and platform administration are read-only: they are reported as such,
//     never rendered as an empty personal queue.
//   • Exploration (demo) mode resolves the GOVERNED demonstration persona, never the signed-in user.

const ROLE_LABELS: Record<string, any> = {
  chair: { ar: 'رئيس', en: 'Chair' },
  vice_chair: { ar: 'نائب الرئيس', en: 'Vice Chair' },
  secretary: { ar: 'أمين', en: 'Secretary' },
  committee_administrator: { ar: 'مدير اللجنة', en: 'Committee administrator' },
  member: { ar: 'عضو', en: 'Member' },
  alternate: { ar: 'بديل', en: 'Alternate' },
  observer: { ar: 'مراقب', en: 'Observer' },
  advisor: { ar: 'مستشار', en: 'Advisor' },
  oversight: { ar: 'إشراف إداري (قراءة فقط)', en: 'Administrative oversight (read-only)' },
};

const MAX_AUTHORITY_CHECKS = 30;
const DECISION_OPEN_STATES = ['draft', 'voting', 'approved', 'issued'];
const MINUTES_OPEN_STATES = ['draft', 'in_review', 'approved'];
const REVIEW_OPEN_STATES = ['pending', 'accepted', 'in_review'];

export default async function (req) {
  const base44 = createClientFromRequest(req);
  const sr = base44.asServiceRole;
  const body = await req.json().catch(() => ({})) || {};
  const demoMode = body.demo_mode === true;

  const unread: any[] = [];
  const readList = async (source, promise) => {
    try {
      const rows = await promise;
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      // A failed read is NEVER an empty result: it is named, so the surface can say it could not look.
      unread.push({ source, reason: e?.message || 'read failed' });
      return [];
    }
  };

  try {
    // ── 1. The actor: a governed demonstration persona, or the authenticated user. ──
    let actor: any = null;
    let persona: any = null;
    if (demoMode) {
      persona = resolveDemoPersona(body.demo_persona);
      if (!persona) return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
      actor = { id: persona.user_id, full_name: persona.name_ar, email: null, is_demo: true };
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      actor = { id: user.id, full_name: user.data?.display_name_ar || user.full_name, email: user.email, is_demo: false, role: user.role };
    }

    // ── 2. The caller's own seats. Term dates are read from the record, never assumed. ──
    const seatRows = (await readList('CommitteeMembership (my seats)',
      sr.entities.CommitteeMembership.filter({ user_id: actor.id, status: 'active' })))
      .filter((m) => (demoMode
        ? (m.is_demo_data === true && m.demo_dataset === persona.dataset)
        : (!m.is_demo_data && m.demo_dataset !== DEMO_DATASET)));
    const today = new Date().toISOString().slice(0, 10);
    const seats = seatRows.filter((m) => {
      if (m.term_start && today < m.term_start) return false;
      if (m.term_end && today > m.term_end) return false;
      return true;
    });
    const seatByCommittee = {};
    for (const s of seats) if (s.committee_id && !seatByCommittee[s.committee_id]) seatByCommittee[s.committee_id] = s;
    const myCommitteeIds = Object.keys(seatByCommittee);

    if (myCommitteeIds.length === 0) {
      return Response.json({
        contract_version: PERSONAL_WORK_VERSION,
        generated_at: new Date().toISOString(),
        actor, is_demo_mode: demoMode,
        scope: { committees: [], excluded: [], unread_sources: unread },
        items: [], counts: { total: 0, overdue: 0, due_soon: 0, by_group: {} },
        authority_checks: { performed: 0, capped: false },
        notice: {
          code: 'no_seat',
          ar: 'لا تشغل أي مقعد لجنة سارٍ الآن. صف العمل الشخصي يُبنى من المقاعد لا من العضوية الإدارية.',
          en: 'You hold no committee seat in force right now. Personal work is derived from seats, not from administrative membership.',
        },
      });
    }

    // ── 3. Where the work lives: committee and organization identity + route refs. ──
    const committees = await readList('Committee (my committees)', sr.entities.Committee.filter({ id: { $in: myCommitteeIds } }));
    const committeeById = {};
    for (const c of committees) committeeById[c.id] = c;
    const scopeExcluded: any[] = [];
    const readableCommitteeIds = [];
    for (const id of myCommitteeIds) {
      const c = committeeById[id];
      if (!c) { scopeExcluded.push({ committee_id: id, code: 'committee_unreadable', reason: 'Committee record could not be read' }); continue; }
      if (demoMode && (c.is_demo_data !== true || c.demo_dataset !== persona.dataset)) {
        scopeExcluded.push({ committee_id: id, code: 'out_of_scope', reason: 'Committee is outside this exploration dataset' });
        continue;
      }
      readableCommitteeIds.push(id);
    }
    const orgIds = [...new Set(readableCommitteeIds.map((id) => committeeById[id].organization_id).filter(Boolean))];
    const orgs = await readList('Organization (committee custodians)', sr.entities.Organization.filter({ id: { $in: orgIds } }));
    const orgById = {};
    for (const o of orgs) orgById[o.id] = o;

    const refOf = (row) => `${row.slug || row.id}--${row.public_id || row.id}`;
    const placeFor = (committeeId) => {
      const c = committeeById[committeeId];
      if (!c) return null;
      const o = orgById[c.organization_id] || null;
      return {
        committee: { id: c.id, ref: refOf(c), name: { ar: c.name_ar || c.name_en, en: c.name_en || c.name_ar } },
        organization: o
          ? { id: o.id, ref: refOf(o), name: { ar: o.name_ar || o.name_en, en: o.name_en || o.name_ar } }
          : { id: null, ref: null, name: { ar: 'جهة غير مقروءة', en: 'Custodian not readable' } },
      };
    };

    const SEGMENT_ROUTES: Record<string, any> = {
      actions: (b) => `${b}/actions`,
      evidence: (b) => `${b}/evidence`,
      voting: (b) => `${b}/voting`,
      minutes: (b) => `${b}/minutes`,
      decisions: (b, id) => (id ? `${b}/decisions/${id}` : `${b}/decisions`),
      documents: (b, id) => (id ? `${b}/documents/${id}` : `${b}/documents`),
      'people:handover': (b) => `${b}/people?tab=handover`,
      'people:appointments': (b) => `${b}/people?tab=appointments`,
      'people:structure': (b) => `${b}/people?tab=structure`,
    };
    const linkFor = (committeeId, kind, recordId) => {
      const place = placeFor(committeeId);
      if (!place || !place.organization.ref || !place.committee.ref) return null;
      const segment = kind === 'action_evidence' || kind === 'action_close' ? 'actions'
        : kind === 'action_verify' ? 'evidence'
          : kind === 'vote_cast' ? 'voting'
            : kind === 'minutes_draft' || kind === 'minutes_approve' || kind === 'minutes_issue' ? 'minutes'
              : kind === 'handover_accept' ? 'people:handover'
                : kind === 'seat_expiry' ? 'people:appointments'
                  : kind === 'review_respond' ? 'documents'
                    : 'decisions';
      const builder = SEGMENT_ROUTES[segment] || SEGMENT_ROUTES.decisions;
      return builder(`/o/${place.organization.ref}/c/${place.committee.ref}`, recordId);
    };

    // ── 4. Authority per committee — resolved from seats, grants, delegations and recusals. ──
    // The queue only ever CONFIRMS the acts it is about to show: authority is not pre-computed for
    // capabilities nobody needs, and the number of confirmations is bounded and reported.
    const capacityByCommittee: Record<string, any> = {};
    const capabilityCache: Record<string, boolean> = {};
    let checksPerformed = 0;
    let checksCapped = false;

    let recusedDecisions: Record<string, Set<string>> = {};
    if (demoMode) {
      // The showcase read path resolves capability from the persona's governed membership + grant.
      for (const id of readableCommitteeIds) {
        const resolved = await resolvePersonaCapabilities(base44, persona, committeeById[id]);
        const ctx = resolved.authority_context || {};
        const blockedCode = ctx.conflict_status === 'declared' ? 'conflict_declared'
          : ctx.record_state === 'out_of_validity' ? 'grant_out_of_validity'
            : (!resolved.role ? 'no_seat' : null);
        const caps = new Set(blockedCode || !resolved.role ? [] : capabilitiesForRole(resolved.role, { delegationActive: ctx.delegation_active === true }));
        capacityByCommittee[id] = {
          role: resolved.role,
          role_label: ROLE_LABELS[resolved.role] || null,
          delegation: ctx.delegation_active === true,
          blocked_code: blockedCode,
          caps,
        };
        if (blockedCode) scopeExcluded.push({ committee_id: id, code: blockedCode, reason: blockedCode === 'conflict_declared' ? 'A conflict of interest is declared for this seat' : blockedCode === 'grant_out_of_validity' ? 'The authority grant is outside its validity window' : 'No committee seat is held' });
      }
      // Recusal records are read for the person's OWN identity only (never by name).
      const recusalRows = await readList('Recusal (my recusals)', sr.entities.Recusal.filter({ member_user_id: actor.id, status: 'active' }));
      for (const r of recusalRows) {
        if (!recusedDecisions[r.committee_id]) recusedDecisions[r.committee_id] = new Set();
        recusedDecisions[r.committee_id].add(r.decision_id || '*');
      }
    } else {
      for (const id of readableCommitteeIds) {
        const base = await resolveAuthority(base44, { capability: 'read', committee_id: id });
        if (!base.allowed) {
          scopeExcluded.push({ committee_id: id, code: base.code, reason: base.reason, authority_context: base.authority_context });
          continue;
        }
        const oversight = base.authority_context === 'org_admin_oversight_read_only';
        capacityByCommittee[id] = {
          role: oversight ? 'oversight' : base.effective_role,
          role_label: ROLE_LABELS[oversight ? 'oversight' : base.effective_role] || null,
          delegation: base.delegation_applied === true,
          blocked_code: oversight ? 'oversight_read_only' : null,
          oversight,
          caps: null, // resolved on demand through the kernel, never re-typed here
        };
        if (oversight) scopeExcluded.push({ committee_id: id, code: 'oversight_read_only', reason: 'Administrative oversight is read-only and creates no personal obligation' });
      }
    }

    const can = (committeeId, capability) => {
      const cap = capacityByCommittee[committeeId];
      if (!cap || cap.oversight || cap.blocked_code) return false;
      if (demoMode) {
        if (recusedDecisions[committeeId] && capability === 'vote.cast') return false;
        return cap.caps.has(capability);
      }
      const key = `${committeeId}:${capability}`;
      if (key in capabilityCache) return capabilityCache[key];
      if (checksPerformed >= MAX_AUTHORITY_CHECKS) { checksCapped = true; return false; }
      checksPerformed += 1;
      const allowed = kernelCheck(committeeId, capability);
      capabilityCache[key] = allowed;
      return allowed;
    };
    // Confirmed synchronously against a pre-resolved table so `can` stays a plain predicate.
    const kernelVerdicts: Record<string, boolean> = {};
    const kernelCheck = (committeeId, capability) => kernelVerdicts[`${committeeId}:${capability}`] === true;

    const capacityFor = (committeeId) => {
      const cap = capacityByCommittee[committeeId];
      if (!cap) return null;
      return { role: cap.role, role_label: cap.role_label, delegation: cap.delegation === true };
    };

    // ── 5. Records → candidate items (explicitly scoped to the person's own committees). ──
    const actionsOwned = (await readList('Action (my obligations)', sr.entities.Action.filter({ owner_user_id: actor.id })))
      .filter((a) => readableCommitteeIds.includes(a.committee_id) && !DONE_STATUSES.includes(a.status));
    const actionsAwaitingVerdict = (await readList('Action (awaiting independent verification)',
      sr.entities.Action.filter({ committee_id: { $in: readableCommitteeIds }, verification_state: 'submitted' })))
      .filter((a) => a.evidence_submitted_by_user_id !== actor.id);
    const actionsAccepted = await readList('Action (accepted verdicts awaiting closure)',
      sr.entities.Action.filter({ committee_id: { $in: readableCommitteeIds }, verification_state: 'accepted', status: { $nin: DONE_STATUSES } }));
    const decisions = await readList('Decision (open lifecycle states)',
      sr.entities.Decision.filter({ committee_id: { $in: readableCommitteeIds }, status: { $in: DECISION_OPEN_STATES } }));
    const minutes = await readList('MeetingMinutes (unreleased)',
      sr.entities.MeetingMinutes.filter({ committee_id: { $in: readableCommitteeIds }, status: { $in: MINUTES_OPEN_STATES } }));
    const packs = await readList('HandoverPack (addressed to me)', sr.entities.HandoverPack.filter({ successor_user_id: actor.id }));
    const requests = await readList('ReviewRequest (addressed to me)',
      sr.entities.ReviewRequest.filter({ reviewer_user_id: actor.id, status: { $in: REVIEW_OPEN_STATES } }));

    const votingIds = decisions.filter((d) => d.status === 'voting').map((d) => d.id);
    const myBallots = votingIds.length
      ? await readList('Vote (my ballots)', sr.entities.Vote.filter({ decision_id: { $in: votingIds }, voter_user_id: actor.id }))
      : [];
    const votedDecisionIds = [...new Set(myBallots.map((v) => v.decision_id))];

    const actions = [...actionsOwned, ...actionsAwaitingVerdict, ...actionsAccepted];
    const recusalFilter = (items, kind) => {
      if (!demoMode) return items;
      return items.filter((it) => {
        const blocked = recusedDecisions[it.committee_id];
        if (!blocked) return true;
        if (kind === 'decision') return !(blocked.has(it.id) || blocked.has('*'));
        if (kind === 'action') return !blocked.has('*');
        return true;
      });
    };

    // ── 6. Confirm the acts the queue would show (bounded and reported). ──
    const candidateInput = {
      actorId: actor.id,
      actions: recusalFilter(actions, 'action'),
      decisions: recusalFilter(decisions, 'decision'),
      minutes, packs, requests, seats,
      votedDecisionIds,
      can,
      capacityFor,
      placeFor,
      linkFor,
    };
    if (!demoMode) {
      const draft = assemblePersonalWork({ ...candidateInput, can: () => true, capacityFor });
      const need: Record<string, string[]> = {};
      for (const it of draft.items) {
        const cid = it.place?.committee?.id;
        const capability = it.next?.capability;
        if (!cid || !capability) continue;
        need[cid] = need[cid] || [];
        if (!need[cid].includes(capability)) need[cid].push(capability);
      }
      for (const cid of Object.keys(need)) {
        for (const capability of need[cid]) {
          if (checksPerformed >= MAX_AUTHORITY_CHECKS) { checksCapped = true; continue; }
          checksPerformed += 1;
          const verdict = await resolveAuthority(base44, { capability, committee_id: cid });
          kernelVerdicts[`${cid}:${capability}`] = verdict.allowed === true;
        }
      }
    }

    const result = assemblePersonalWork(candidateInput);

    // ── 7. The answer: what is required, what was excluded, and what could not be read. ──
    const scopeCommittees = readableCommitteeIds.map((id) => ({
      ...placeFor(id),
      capacity: capacityFor(id),
      blocked_code: capacityByCommittee[id]?.blocked_code || null,
    }));
    const scopeExcludedOut = scopeExcluded.map((e) => ({
      committee: committeeById[e.committee_id] ? placeFor(e.committee_id) : { committee: { id: e.committee_id, ref: null, name: { ar: 'لجنة غير مقروءة', en: 'Committee not readable' } }, organization: null },
      code: e.code, reason: e.reason || null, authority_context: e.authority_context || null,
    }));

    let notice = null;
    if (demoMode) {
      notice = { code: 'exploration', ar: 'هذه قائمة عرض استكشافي لهوية تجريبية محوكمة، لا لهوية مُصادقة.', en: 'This is an exploration queue for a governed demonstration identity, not for an authenticated user.' };
    } else if (Object.values(capacityByCommittee).some((c) => c.oversight)) {
      notice = { code: 'oversight_read_only', ar: 'الإشراف الإداري يقرأ ولا يُنشئ التزامًا شخصيًا؛ ولا تنتج عناوين اللجان منصبًا تنفيذيًا.', en: 'Administrative oversight may read; it creates no personal obligation, and a committee title it administers is not operational authority.' };
    }

    return Response.json({
      contract_version: PERSONAL_WORK_VERSION,
      generated_at: new Date().toISOString(),
      actor: { id: actor.id, display_name: actor.full_name, is_demo: actor.is_demo, platform_role: actor.role || null },
      is_demo_mode: demoMode,
      scope: { committees: scopeCommittees, excluded: scopeExcludedOut, unread_sources: unread },
      items: result.items,
      counts: result.counts,
      authority_checks: { performed: checksPerformed, capped: checksCapped, budget: MAX_AUTHORITY_CHECKS },
      notice,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: PERSONAL_WORK_VERSION }, { status: 500 });
  }
}