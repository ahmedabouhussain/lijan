import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DR_HAMAD_DATASET, DR_HAMAD_ORGS, DR_HAMAD_COMMITTEES,
  DR_HAMAD_REPAIR_VERSION,
} from '../../shared/drHamadDataset.ts';
import { DR_HAMAD_TOPICS, tallyRoles, DR_HAMAD_ROLE_COUNTS } from '../../shared/drHamadExperience.ts';

// RepairDrHamadDemoExperienceV3 — idempotent repair of the Dr. Hamad demonstration persona.
//
// ONE person, ONE primary organization (Qatar Development Bank), THREE institutional
// contexts, SEVEN scoped committee memberships, TWO Chair + ONE Vice-Chair + THREE Member
// + ONE Committee Secretary. Authority is never combined across committees and no
// organization-creation / founder authority is ever attached to the persona.
//
// Safe to run repeatedly: every write is an upsert keyed by a stable identifier, and
// non-canonical rows are DEACTIVATED (never deleted), so shared/production records survive.
//
// Authorization: a platform admin, or an exploration-mode call that is strictly confined to
// the governed demo dataset (is_demo_data=true + demo_dataset=DR_HAMAD_GOVERNED_DEMO_V1).

const REPAIR_VERSION = DR_HAMAD_REPAIR_VERSION;
const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString();
const dateOnly = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const demoMode = body?.demo_mode === true;
    const requestedPersona = body?.demo_persona_key || null;
    const user = await base44.auth.me().catch(() => null);
    const isAdmin = !!user && user.role === 'admin';

    // Only the canonical persona may be repaired, and only as an admin or from the
    // exploration entry point. Nothing else is ever written.
    if (requestedPersona && requestedPersona !== 'DR_HAMAD_MAJEEGHEER') {
      return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
    }
    if (!isAdmin) {
      return Response.json({ error: 'Administrator authorization required', code: 'forbidden' }, { status: 403 });
    }

    const changed = { created: 0, updated: 0, deactivated: 0 };
    const demoFlags = { is_demo_data: true, demo_dataset: DR_HAMAD_DATASET };

    /** Upsert by a stable filter — returns the record. */
    const upsert = async (entity, filter, payload) => {
      const existing = (await sr.entities[entity].filter(filter).catch(() => []))[0] || null;
      if (existing) {
        const row = await sr.entities[entity].update(existing.id, payload);
        changed.updated += 1;
        return row;
      }
      const row = await sr.entities[entity].create({ ...filter, ...payload });
      changed.created += 1;
      return row;
    };

    // ── 1. The three institutional contexts (organizations) ──
    const orgIdToPublicId = {};
    const orgByKey = {};
    for (const [key, org] of Object.entries(DR_HAMAD_ORGS)) {
      orgByKey[key] = await upsert('Organization', { public_id: org.public_id }, {
        slug: org.slug,
        name_ar: org.name_ar,
        name_en: org.name_en,
        type: org.type,
        description: org.description,
        status: 'sandbox_active',
        classification_policy: 'internal',
        branding_primary_color: '#8A1538',
        country: 'QA',
        timezone: 'Asia/Qatar',
        default_locale: 'ar',
        retention_policy_years: 7,
        ...demoFlags,
      });
    }
    for (const org of Object.values(orgByKey)) orgIdToPublicId[org.id] = org.public_id;
    const primaryOrg = orgByKey.QDB;

    // ── 2. Organization affiliation — ONE primary organization, no owner/founder role ──
    // QDB is his only organizational affiliation. The national and external contexts own
    // committees he sits on; they are never presented as his employer.
    await upsert('OrganizationMembership', { organization_id: primaryOrg.id, user_id: DR_HAMAD_PERSON_KEY }, {
      user_email: DR_HAMAD_PERSONA.email,
      user_name: DR_HAMAD_PERSONA.name_en,
      role: 'member',
      status: 'active',
      is_demo_data: true,
      demo_dataset: DR_HAMAD_DATASET,
    });
    for (const key of ['NATIONAL', 'ELAN']) {
      const rows = await sr.entities.OrganizationMembership
        .filter({ organization_id: orgByKey[key].id, user_id: DR_HAMAD_PERSON_KEY }).catch(() => []);
      for (const row of (rows || [])) {
        if (row.status === 'active') {
          await sr.entities.OrganizationMembership.update(row.id, { status: 'revoked' });
          changed.deactivated += 1;
        }
      }
    }
    // No other active organization relationship may remain.
    const allOrgRows = await sr.entities.OrganizationMembership
      .filter({ user_id: DR_HAMAD_PERSON_KEY, status: 'active' }).catch(() => []);
    for (const row of (allOrgRows || [])) {
      if (row.organization_id !== primaryOrg.id) {
        await sr.entities.OrganizationMembership.update(row.id, { status: 'revoked' });
        changed.deactivated += 1;
      }
    }

    // ── 3. The seven committees, each owned by its correct context ──
    const canonicalPublicIds = DR_HAMAD_COMMITTEES.map((c) => c.public_id);
    const committeeByPublicId = {};
    const membershipByPublicId = {};
    const roleTallyRows = [];

    for (const def of DR_HAMAD_COMMITTEES) {
      const owningOrg = orgByKey[def.owning_org];
      const topics = DR_HAMAD_TOPICS[def.key] || { ar: [def.mandate_ar], en: [def.mandate_en] };

      const committee = await upsert('Committee', { public_id: def.public_id }, {
        organization_id: owningOrg.id,
        name_ar: def.name_ar,
        name_en: def.name_en,
        slug: def.slug,
        type: def.type,
        mandate: def.mandate_ar,
        scope: def.mandate_en,
        status: 'active',
        classification: 'internal',
        quorum_count: 4,
        ...demoFlags,
      });
      committeeByPublicId[def.public_id] = committee;

      // Mandate record (governed mandate, demo wording)
      await upsert('CommitteeMandate', { committee_id: committee.id, status: 'active' }, {
        organization_id: owningOrg.id,
        establishing_instrument: 'سند تأسيس تجريبي — عرض تجريبي',
        official_reference: def.public_id,
        issuing_authority: def.owning_org === 'QDB'
          ? DR_HAMAD_PERSONA.primary_org_ar
          : (def.owning_org === 'NATIONAL' ? DR_HAMAD_ORGS.NATIONAL.name_ar : DR_HAMAD_ORGS.ELAN.name_ar),
        mandate_text_ar: def.mandate_ar,
        mandate_text: def.mandate_en,
        scope_ar: def.mandate_ar,
        scope: def.mandate_en,
        effective_start: '2026-01-01',
        effective_end: '2027-12-31',
        version: 1,
        status: 'active',
        ...demoFlags,
      });

      // Committee membership — one independent record per committee
      const membership = await upsert('CommitteeMembership',
        { committee_id: committee.id, user_id: DR_HAMAD_PERSON_KEY },
        {
          organization_id: owningOrg.id,
          user_email: DR_HAMAD_PERSONA.email,
          full_name: DR_HAMAD_PERSONA.name_en,
          full_name_ar: DR_HAMAD_PERSONA.name_ar,
          role: def.role,
          authority_level: def.role === 'chair' ? 'decision'
            : def.role === 'vice_chair' ? 'approval'
            : def.role === 'secretary' ? 'execution' : 'advisory',
          voting_right: def.role !== 'secretary',
          status: 'active',
          institution_name: DR_HAMAD_PERSONA.primary_org_ar,
          term_start: '2026-01-01',
          term_end: '2027-12-31',
          is_demo_data: true,
          demo_dataset: DR_HAMAD_DATASET,
        });
      membershipByPublicId[def.public_id] = membership;
      roleTallyRows.push({ role: def.role });

      // Authority grant — the server-evaluated boundary for THIS committee only
      const authorityType = def.role === 'chair' ? 'chair_authority'
        : def.role === 'vice_chair' ? 'vice_chair_support'
        : def.role === 'secretary' ? 'secretary_administration'
        : 'member_contribution';
      await upsert('AuthorityGrant', { person_key: DR_HAMAD_PERSON_KEY, committee_id: committee.id }, {
        committee_membership_id: membership.id,
        role: def.role,
        authority_type: authorityType,
        requires_delegation: def.role === 'vice_chair',
        delegation_status: def.role === 'vice_chair' ? 'none' : 'active',
        classification: def.classification,
        purpose: def.workstream_ar || def.mandate_ar,
        conflict_status: 'none',
        validity_start: '2026-01-01',
        validity_end: '2027-12-31',
        is_demo_data: true,
        demo_scenario_id: DR_HAMAD_DATASET,
      });

      // Scoped role assignment — seven separate assignments, never one global role
      await upsert('RoleAssignment', { user_id: DR_HAMAD_PERSON_KEY, committee_id: committee.id }, {
        organization_id: owningOrg.id,
        user_email: DR_HAMAD_PERSONA.email,
        user_name: DR_HAMAD_PERSONA.name_en,
        role_key: def.role,
        effective_start: '2026-01-01',
        effective_end: '2027-12-31',
        status: 'active',
      });

      // ── 4. Demonstration content — never leave a corrected committee empty ──
      const existingMeetings = await sr.entities.Meeting.filter({ committee_id: committee.id }).catch(() => []) || [];
      const hasPast = existingMeetings.some((m) => m.status === 'completed');
      const hasUpcoming = existingMeetings.some((m) => new Date(m.date) > new Date());

      let pastMeeting = existingMeetings.find((m) => m.status === 'completed') || null;
      if (!pastMeeting) {
        pastMeeting = await sr.entities.Meeting.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: `${def.name_en} — Previous Session`,
          title_ar: `اجتماع سابق — ${def.name_ar}`,
          date: iso(-21),
          duration_minutes: 90,
          location: 'قاعة الاجتماعات الرئيسية — الدوحة',
          location_en: 'Main meeting room — Doha',
          mode: 'hybrid',
          status: 'completed',
          quorum_required: 4,
          ...demoFlags,
        });
        changed.created += 1;
      }

      let upcomingMeeting = existingMeetings.find((m) => new Date(m.date) > new Date()) || null;
      if (!upcomingMeeting) {
        upcomingMeeting = await sr.entities.Meeting.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: `${def.name_en} — Upcoming Session`,
          title_ar: `الاجتماع القادم — ${def.name_ar}`,
          date: iso(14),
          duration_minutes: 90,
          location: 'قاعة الاجتماعات — الدوحة',
          location_en: 'Meeting room — Doha',
          mode: 'hybrid',
          status: 'scheduled',
          agenda_ready: def.role === 'chair',
          quorum_required: 4,
          ...demoFlags,
        });
        changed.created += 1;
      }

      const agenda = await sr.entities.AgendaItem.filter({ meeting_id: upcomingMeeting.id }).catch(() => []) || [];
      if (agenda.length === 0) {
        for (let i = 0; i < topics.ar.length; i += 1) {
          await sr.entities.AgendaItem.create({
            organization_id: owningOrg.id,
            committee_id: committee.id,
            meeting_id: upcomingMeeting.id,
            sequence: i + 1,
            title: topics.en[i],
            title_ar: topics.ar[i],
            objective: topics.en[i],
            objective_ar: topics.ar[i],
            required_decision: i === 0,
            classification: 'internal',
            readiness: i === 0 ? 'ready' : 'needs_attention',
            status: 'pending',
            ...demoFlags,
          });
          changed.created += 1;
        }
      }

      const minutes = await sr.entities.MeetingMinutes.filter({ committee_id: committee.id }).catch(() => []) || [];
      if (minutes.length === 0) {
        await sr.entities.MeetingMinutes.create({
          organization_id: owningOrg.id,
          meeting_id: pastMeeting.id,
          committee_id: committee.id,
          minutes_number: `${def.public_id}-M1`,
          quorum_met: true,
          present_count: 6,
          absent_count: 1,
          apologies_count: 1,
          body: `محضر تجريبي — ${def.mandate_ar}`,
          summary_ar: def.mandate_ar,
          generated_by_ai: false,
          drafted_by_name: DR_HAMAD_PERSONA.name_ar,
          status: def.role === 'chair' ? 'in_review' : 'draft',
          ...demoFlags,
        });
        changed.created += 1;
      }

      const documents = await sr.entities.Document.filter({ committee_id: committee.id, is_demo_data: true }).catch(() => []) || [];
      if (documents.length === 0) {
        const sourceBased = def.public_id === 'DEMO-COMM-NATIONAL-SME';
        const elanReference = def.public_id === 'DEMO-COMM-ELAN-EXEC';
        await sr.entities.Document.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: sourceBased
            ? 'Source-based demonstration material — SME development'
            : elanReference
              ? 'ELAN Executive Committee — BEC agenda (reference document)'
              : `${def.name_en} — Briefing Note`,
          title_ar: sourceBased
            ? 'مواد مصدرية للعرض — تنمية الشركات الصغيرة والمتوسطة'
            : elanReference
              ? 'اللجنة التنفيذية لمجموعة إعلان — أجندة BEC (مستند مرجعي)'
              : `مذكرة إحاطة — ${def.name_ar}`,
          document_type: sourceBased ? 'evidence' : 'memo',
          classification: 'internal',
          tags: sourceBased ? 'SOURCE_BASED, DEMO' : elanReference ? 'REFERENCE, DEMO, SYNTHETIC' : 'SYNTHETIC, DEMO',
          owner_name: DR_HAMAD_PERSONA.name_ar,
          status: 'in_review',
          ...demoFlags,
        });
        changed.created += 1;
      }

      const decisions = await sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []) || [];
      let decision = decisions[0] || null;
      if (!decision) {
        decision = await sr.entities.Decision.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          meeting_id: upcomingMeeting.id,
          legal_basis: def.mandate_ar,
          decision_number: `${def.public_id}-D1`,
          title: `Decision on ${topics.en[0]}`,
          title_ar: `قرار بشأن ${topics.ar[0]}`,
          proposal: def.mandate_en,
          owner_name: DR_HAMAD_PERSONA.name_ar,
          status: def.role === 'chair' ? 'in_review' : 'proposed',
          ...demoFlags,
        });
        changed.created += 1;
      }

      const actions = await sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []) || [];
      const hasOpenAction = actions.some((a) => ['assigned', 'in_progress', 'blocked'].includes(a.status));
      const hasEvidenceAction = actions.some((a) => a.status === 'evidence_pending');
      if (!hasOpenAction) {
        await sr.entities.Action.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          decision_id: decision.id,
          title: `Follow up on ${topics.en[1] || topics.en[0]}`,
          title_ar: `متابعة ${topics.ar[1] || topics.ar[0]}`,
          owner_name: DR_HAMAD_PERSONA.name_ar,
          deadline: dateOnly(21),
          priority: 'medium',
          progress_percent: 35,
          status: 'in_progress',
          ...demoFlags,
        });
        changed.created += 1;
      }
      if (!hasEvidenceAction) {
        await sr.entities.Action.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          decision_id: decision.id,
          title: 'Provide required evidence',
          title_ar: 'توفير الأدلة المطلوبة',
          owner_name: DR_HAMAD_PERSONA.name_ar,
          deadline: dateOnly(30),
          priority: 'high',
          status: 'evidence_pending',
          ...demoFlags,
        });
        changed.created += 1;
      }

      const dependencies = await sr.entities.CrossEntityDependency.filter({ source_committee_id: committee.id }).catch(() => []) || [];
      if (dependencies.length === 0) {
        const seededActions = await sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []) || [];
        const targetAction = seededActions[0] || null;
        await sr.entities.CrossEntityDependency.create({
          organization_id: owningOrg.id,
          source_entity_type: 'Decision',
          source_id: decision.id,
          source_title: decision.title_ar || decision.title,
          source_committee_id: committee.id,
          target_entity_type: 'Action',
          target_id: targetAction ? targetAction.id : decision.id,
          target_title: targetAction ? (targetAction.title_ar || targetAction.title) : 'متابعة تنفيذ القرار',
          target_committee_id: committee.id,
          dependency_type: 'requires',
          status: 'active',
          notes: 'اعتماد تجريبي ضمن سيناريو العرض',
          ...demoFlags,
        });
        changed.created += 1;
      }

      // Source-based evidence register — the national committee only
      if (def.public_id === 'DEMO-COMM-NATIONAL-SME') {
        const evidence = await sr.entities.EvidenceSubmissionEntry.filter({ committee_id: committee.id }).catch(() => []) || [];
        if (evidence.length === 0) {
          const entries = [
            { entity_name: 'Qatar Development Bank', entity_name_ar: 'بنك قطر للتنمية', entity_type: 'member', data_status: 'awaiting_submission', workstream_en: 'Access to Markets', workstream_ar: 'فريق النفاذ إلى الأسواق' },
            { entity_name: 'Ministry of Commerce and Industry', entity_name_ar: 'وزارة التجارة والصناعة', entity_type: 'member', data_status: 'received', workstream_en: 'Finance & Capital', workstream_ar: 'التمويل ورأس المال' },
            { entity_name: 'Knowledge partners (aggregate)', entity_name_ar: 'شركاء المعرفة (إجمالي)', entity_type: 'non_member', data_status: 'needs_reconciliation', workstream_en: 'Knowledge', workstream_ar: 'المعرفة', is_aggregate_placeholder: true, aggregate_count: 4 },
          ];
          for (const entry of entries) {
            await sr.entities.EvidenceSubmissionEntry.create({
              organization_id: owningOrg.id,
              committee_id: committee.id,
              source_reference: 'مواد مصدرية مقدَّمة — عرض تجريبي',
              source_as_of: dateOnly(-14),
              unresolved_questions: 'بانتظار تأكيد الجهة',
              ...entry,
              is_demo_data: true,
              demo_scenario_id: DR_HAMAD_DATASET,
            });
            changed.created += 1;
          }
        }
      }

      if (changed.created > 0) {
        await sr.entities.AuditEvent.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          action: 'status_change',
          entity_type: 'CommitteeMembership',
          entity_id: membership.id,
          entity_title: def.name_ar,
          actor_name: DR_HAMAD_PERSONA.name_ar,
          description: `${REPAIR_VERSION} — تثبيت عضوية العرض والدور: ${def.role}`,
          authority_context: `persona:${DR_HAMAD_PERSON_KEY}|role:${def.role}`,
        }).catch(() => {});
      }
    }

    // ── 5. Deactivate every non-canonical membership / grant / role assignment ──
    const memberships = await sr.entities.CommitteeMembership
      .filter({ user_id: DR_HAMAD_PERSON_KEY }).catch(() => []) || [];
    for (const row of memberships) {
      const committee = await sr.entities.Committee.get(row.committee_id).catch(() => null);
      const canonical = row.status === 'active' && committee && canonicalPublicIds.includes(committee.public_id);
      if (!canonical) {
        if (row.status === 'active') {
          await sr.entities.CommitteeMembership.update(row.id, {
            status: 'inactive',
            end_reason: `${REPAIR_VERSION} — عضوية غير معتمدة لسيناريو العرض`,
            ended_at: new Date().toISOString(),
          });
          changed.deactivated += 1;
        }
      }
    }

    const grants = await sr.entities.AuthorityGrant
      .filter({ person_key: DR_HAMAD_PERSON_KEY }).catch(() => []) || [];
    const canonicalCommitteeIds = Object.values(committeeByPublicId).map((c) => c.id);
    for (const grant of grants) {
      if (!canonicalCommitteeIds.includes(grant.committee_id)) {
        await sr.entities.AuthorityGrant.update(grant.id, {
          validity_end: dateOnly(-1),
          delegation_status: 'expired',
          purpose: `${REPAIR_VERSION} — صلاحية غير معتمدة لسيناريو العرض`,
        });
        changed.deactivated += 1;
      }
    }

    const roleAssignments = await sr.entities.RoleAssignment
      .filter({ user_id: DR_HAMAD_PERSON_KEY, status: 'active' }).catch(() => []) || [];
    for (const ra of roleAssignments) {
      const isScoped = ra.committee_id && canonicalCommitteeIds.includes(ra.committee_id)
        && ['chair', 'vice_chair', 'secretary', 'member'].includes(ra.role_key);
      if (!isScoped) {
        // No organization-owner / organization-admin authority is ever attached to the persona.
        await sr.entities.RoleAssignment.update(ra.id, { status: 'revoked', revoked_at: new Date().toISOString() });
        changed.deactivated += 1;
      }
    }

    // ── 6. Provisioning flag ──
    const flagKey = 'dr_hamad_demo_provisioned';
    const flagDesc = `${REPAIR_VERSION} applied. Dataset: ${DR_HAMAD_DATASET}. Persona: ${DR_HAMAD_PERSON_KEY} (${DR_HAMAD_PERSONA.persona_id}).`;
    const existingFlag = (await sr.entities.FeatureFlag.filter({ key: flagKey }).catch(() => []))[0];
    if (existingFlag) await sr.entities.FeatureFlag.update(existingFlag.id, { enabled: true, description: flagDesc });
    else await sr.entities.FeatureFlag.create({ key: flagKey, enabled: true, description: flagDesc, organization_id: null });

    // ── 7. Evidence returned by the repair itself ──
    const persisted = await sr.entities.CommitteeMembership
      .filter({ user_id: DR_HAMAD_PERSON_KEY, status: 'active' }).catch(() => []) || [];
    const persistedCommittees = [];
    for (const row of persisted) {
      const committee = await sr.entities.Committee.get(row.committee_id).catch(() => null);
      if (!committee) continue;
      persistedCommittees.push({
        public_id: committee.public_id,
        committee_id: committee.id,
        name_ar: committee.name_ar,
        name_en: committee.name_en,
        owning_org_public_id: orgIdToPublicId[committee.organization_id] || null,
        role: row.role,
        status: row.status,
      });
    }

    return Response.json({
      status: 'success',
      repair_version: REPAIR_VERSION,
      idempotent: true,
      persona_key: DR_HAMAD_PERSON_KEY,
      persona_id: DR_HAMAD_PERSONA.persona_id,
      email: DR_HAMAD_PERSONA.email,
      dataset: DR_HAMAD_DATASET,
      primary_org: { public_id: primaryOrg.public_id, id: primaryOrg.id, name_ar: primaryOrg.name_ar, name_en: primaryOrg.name_en },
      contexts: Object.entries(orgByKey).map(([key, org]) => ({ key, public_id: org.public_id, id: org.id, name_en: org.name_en })),
      committees: persistedCommittees,
      active_memberships: persisted.length,
      role_tally: tallyRoles(persisted),
      required_role_tally: DR_HAMAD_ROLE_COUNTS,
      role_tally_matches: JSON.stringify(tallyRoles(persisted)) === JSON.stringify({ ...DR_HAMAD_ROLE_COUNTS, other: 0 }),
      changes: changed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}