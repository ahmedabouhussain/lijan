import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DR_HAMAD_DATASET, DR_HAMAD_COMMITTEES, DR_HAMAD_ORGS,
  ROLE_LABELS, DR_HAMAD_AMEEN_GENERAL,
} from '../../shared/drHamadDataset.ts';
import {
  DR_HAMAD_SUMMARY, DR_HAMAD_LANDING_COPY, DR_HAMAD_ROLE_TALLY, DR_HAMAD_ROLE_COUNTS,
  DR_HAMAD_ROLE_BOUNDARIES, drHamadSections, drHamadContextPath, tallyRoles,
} from '../../shared/drHamadExperience.ts';

// GetDrHamadExperience — the Dr. Hamad demonstration experience, resolved from the backend.
//
// Identity, the single primary organization, the three institutional contexts, the seven
// committee memberships, the current role and the per-committee role boundary are ALL read
// from persisted records for the persona's virtual user id. Nothing is inferred client-side
// and no other demo persona is ever consulted.
//
// Optional `committee_public_id` returns the current-context block for that committee
// (path, role, boundary, Ameen message) — used by the context indicator and «أمين».

const PERSONA_KEY = 'DR_HAMAD_MAJEEGHEER';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const demoMode = body?.demo_mode === true;
    const personaKey = body?.demo_persona_key || null;
    const committeePublicId = body?.committee_public_id || null;

    const user = await base44.auth.me().catch(() => null);
    const isAdmin = !!user && user.role === 'admin';

    // Only this persona, and only for the exploration session or a platform admin.
    if (personaKey && personaKey !== PERSONA_KEY) {
      return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
    }
    if (!demoMode && !isAdmin) {
      return Response.json({ error: 'Exploration mode or admin access required' }, { status: 403 });
    }

    // ── Persisted memberships (the authoritative set) ──
    const today = new Date().toISOString().slice(0, 10);
    const rows = await sr.entities.CommitteeMembership
      .filter({ user_id: DR_HAMAD_PERSON_KEY, status: 'active' }).catch(() => []) || [];
    const active = rows.filter((m) => {
      if (m.term_start && today < m.term_start) return false;
      if (m.term_end && today > m.term_end) return false;
      return true;
    });

    // ── Resolve the committees + owning organizations of those memberships ──
    const committees = [];
    for (const membership of active) {
      const committee = await sr.entities.Committee.get(membership.committee_id).catch(() => null);
      if (!committee) continue;
      // Only records of the governed demo dataset are exposed in the exploration experience.
      if (committee.is_demo_data !== true || committee.demo_dataset !== DR_HAMAD_DATASET) continue;
      const owningOrg = await sr.entities.Organization.get(committee.organization_id).catch(() => null);
      committees.push({ committee, owningOrg, membership });
    }

    // ── Per-committee indicators (bounded, committee-scoped reads) ──
    const now = new Date();
    const withIndicators = [];
    for (const entry of committees) {
      const { committee, owningOrg, membership } = entry;
      const [meetings, agenda, documents, decisions, actions, grants] = await Promise.all([
        sr.entities.Meeting.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.AgendaItem.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Document.filter({ committee_id: committee.id, is_demo_data: true }).catch(() => []),
        sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.AuthorityGrant.filter({ person_key: DR_HAMAD_PERSON_KEY, committee_id: committee.id }).catch(() => []),
      ]);

      const upcoming = (meetings || [])
        .filter((m) => new Date(m.date) >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
      const pendingActions = (actions || []).filter((a) =>
        ['assigned', 'in_progress', 'blocked', 'evidence_pending', 'overdue'].includes(a.status));
      const attentionAgenda = (agenda || []).filter((a) => a.readiness && a.readiness !== 'ready');
      const unpublishedDocs = (documents || []).filter((d) => d.status !== 'published' && d.status !== 'archived');
      const pendingDecisions = (decisions || []).filter((d) => ['draft', 'in_review', 'proposed', 'voting'].includes(d.status));
      const def = DR_HAMAD_COMMITTEES.find((c) => c.public_id === committee.public_id) || null;
      const grant = (grants || [])[0] || null;
      const delegationActive = !!grant && grant.delegation_status === 'active';

      // Role boundary — stated, never granted across committees.
      const boundary = DR_HAMAD_ROLE_BOUNDARIES[membership.role] || null;
      const roleLabelAr = def?.role_label_ar || ROLE_LABELS[membership.role]?.ar || membership.role;
      const roleLabelEn = def?.role_label_en || ROLE_LABELS[membership.role]?.en || membership.role;

      withIndicators.push({
        committee_id: committee.id,
        public_id: committee.public_id,
        slug: committee.slug,
        name_ar: committee.name_ar,
        name_en: committee.name_en,
        type: committee.type,
        status: committee.status,
        owning_org: owningOrg
          ? { public_id: owningOrg.public_id, name_ar: owningOrg.name_ar, name_en: owningOrg.name_en }
          : null,
        represented_org_ar: DR_HAMAD_PERSONA.primary_org_ar,
        represented_org_en: DR_HAMAD_PERSONA.primary_org_en,
        role: membership.role,
        role_label_ar: roleLabelAr,
        role_label_en: roleLabelEn,
        authority_type: grant?.authority_type || null,
        delegation_required: grant?.requires_delegation === true,
        delegation_active: delegationActive,
        boundary_ar: boundary?.ar || null,
        boundary_en: boundary?.en || null,
        classification: def?.classification || 'synthetic_demonstration',
        classification_label_ar: def?.classification === 'source_based_demonstration'
          ? 'محتوى مستند إلى مواد مصدرية'
          : def?.synthetic_role
            ? 'دور تجريبي افتراضي'
            : 'بيانات تجريبية',
        classification_label_en: def?.classification === 'source_based_demonstration'
          ? 'Source-based demonstration content'
          : def?.synthetic_role
            ? 'Synthetic demonstration role'
            : 'Synthetic demonstration data',
        synthetic_role: def?.synthetic_role === true,
        workstream_ar: def?.workstream_ar || null,
        workstream_en: def?.workstream_en || null,
        mandate_ar: def?.mandate_ar || committee.mandate || null,
        mandate_en: def?.mandate_en || committee.scope || null,
        ameen_ar: def?.ameen_ar || null,
        ameen_en: def?.ameen_en || null,
        context_path: drHamadContextPath(committee.public_id, 'ar'),
        context_path_en: drHamadContextPath(committee.public_id, 'en'),
        indicators: {
          next_meeting: upcoming ? { title_ar: upcoming.title_ar || upcoming.title, title_en: upcoming.title, date: upcoming.date, status: upcoming.status } : null,
          items_needing_attention: attentionAgenda.length + pendingActions.filter((a) => a.status === 'overdue' || a.status === 'blocked').length,
          agenda_items: (agenda || []).length,
          unread_documents: unpublishedDocs.length,
          pending_actions: pendingActions.length,
          pending_decisions: pendingDecisions.length,
          decision_readiness: pendingDecisions.length === 0 ? 'ready' : (agenda || []).some((a) => a.readiness === 'needs_attention') ? 'needs_attention' : 'ready',
          meetings_total: (meetings || []).length,
        },
      });
    }

    // ── Section grouping (three institutional contexts) ──
    const sections = drHamadSections().map((section) => ({
      ...section,
      committees: withIndicators.filter((c) => section.committee_public_ids.includes(c.public_id)),
    }));

    const roleRowset = withIndicators.map((c) => ({ role: c.role }));
    const tally = tallyRoles(roleRowset);

    // ── Optional current-context block for the context indicator / «أمين» ──
    let current = null;
    if (committeePublicId) {
      const found = withIndicators.find((c) => c.public_id === committeePublicId) || null;
      if (!found) {
        // A committee outside this persona's memberships is never described.
        current = { authorized: false, code: 'not_a_member' };
      } else {
        current = {
          authorized: true,
          committee_public_id: found.public_id,
          committee_name_ar: found.name_ar,
          committee_name_en: found.name_en,
          role: found.role,
          role_label_ar: found.role_label_ar,
          role_label_en: found.role_label_en,
          context_path: found.context_path,
          context_path_en: found.context_path_en,
          boundary_ar: found.boundary_ar,
          boundary_en: found.boundary_en,
          delegation_required: found.delegation_required,
          delegation_active: found.delegation_active,
          ameen_ar: found.ameen_ar,
          ameen_en: found.ameen_en,
          classification_label_ar: found.classification_label_ar,
          classification_label_en: found.classification_label_en,
        };
      }
    }

    return Response.json({
      persona_key: PERSONA_KEY,
      persona_id: DR_HAMAD_PERSONA.persona_id,
      dataset: DR_HAMAD_DATASET,
      profile: {
        name_ar: DR_HAMAD_PERSONA.name_ar,
        name_en: DR_HAMAD_PERSONA.name_en,
        email: DR_HAMAD_PERSONA.email,
        job_title_ar: DR_HAMAD_PERSONA.job_title_ar,
        job_title_en: DR_HAMAD_PERSONA.job_title_en,
        job_title_is_demo_wording: DR_HAMAD_PERSONA.job_title_is_demo_wording,
        account_classification_ar: DR_HAMAD_PERSONA.account_classification_ar,
        account_classification_en: DR_HAMAD_PERSONA.account_classification_en,
        primary_org_ar: DR_HAMAD_PERSONA.primary_org_ar,
        primary_org_en: DR_HAMAD_PERSONA.primary_org_en,
        primary_org_abbr: DR_HAMAD_PERSONA.primary_org_abbr,
      },
      contexts: Object.entries(DR_HAMAD_ORGS).map(([key, org]) => ({
        key,
        public_id: org.public_id,
        name_ar: org.name_ar,
        name_en: org.name_en,
        kind: org.context.kind,
        order: org.context.order,
      })),
      summary: DR_HAMAD_SUMMARY,
      landing: DR_HAMAD_LANDING_COPY,
      ameen_general: DR_HAMAD_AMEEN_GENERAL,
      sections,
      total_committees: withIndicators.length,
      role_tally: tally,
      required_role_tally: DR_HAMAD_ROLE_COUNTS,
      role_tally_matches: JSON.stringify(tally) === JSON.stringify({ ...DR_HAMAD_ROLE_COUNTS, other: 0 }),
      role_tally_copy: DR_HAMAD_ROLE_TALLY,
      role_labels: ROLE_LABELS,
      current_context: current,
      is_demo_mode: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}