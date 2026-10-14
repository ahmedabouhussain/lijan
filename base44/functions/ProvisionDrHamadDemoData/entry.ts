import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DR_HAMAD_DATASET, DR_HAMAD_ORGS, DR_HAMAD_COMMITTEES,
} from '../../shared/drHamadDataset.ts';
import { DR_HAMAD_TOPICS } from '../../shared/drHamadExperience.ts';

// ProvisionDrHamadDemoData — idempotent seed for the Dr. Hamad demonstration persona.
//
// ARCHITECTURE (identical to the platform demo-user provisioning):
// - ONE governed demo *user*: DR_HAMAD_PERSON_KEY (a DEMO-USER-* virtual id) + DR_HAMAD_DATASET.
// - Every record carries is_demo_data + demo_dataset, so the persona is isolated from real
//   data and from every other persona's dataset.
// - Memberships are keyed by the persona's virtual user id — the founder's account is never
//   touched, and no record is ever written against the real authenticated user.
// - Re-running updates in place and never duplicates.
//
// The persona then enters the platform exactly like any other demo user: the same session
// layer, the same workspace, the same organization and committee pages.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    const sr = base44.asServiceRole;

    // ── Legacy cleanup ──
    // An earlier revision keyed this persona by a bare person key. Remove those rows so the
    // persona resolves from a single identity (virtual user id + demo dataset) and never
    // appears twice in a committee's member register.
    const LEGACY_PERSON_KEY = 'demo-dr-hamad-majeegheer';
    for (const entity of ['CommitteeMembership', 'AuthorityGrant']) {
      const stale = await sr.entities[entity]
        .filter(entity === 'CommitteeMembership'
          ? { user_id: LEGACY_PERSON_KEY }
          : { person_key: LEGACY_PERSON_KEY })
        .catch(() => []);
      for (const row of (stale || [])) {
        await sr.entities[entity].delete(row.id).catch(() => {});
      }
    }

    // ── Organizations (upsert by public_id — always refreshed) ──
    const orgByKey = {};
    for (const [key, org] of Object.entries(DR_HAMAD_ORGS)) {
      const payload = {
        public_id: org.public_id,
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
        is_demo_data: true,
        demo_dataset: DR_HAMAD_DATASET,
      };
      const existing = (await sr.entities.Organization.filter({ public_id: org.public_id }).catch(() => []))[0];
      orgByKey[key] = existing
        ? await sr.entities.Organization.update(existing.id, payload)
        : await sr.entities.Organization.create(payload);
    }
    const qdb = orgByKey.QDB;

    // ── Organization memberships — the persona's own organization access ──
    for (const [key, org] of Object.entries(orgByKey)) {
      const existing = (await sr.entities.OrganizationMembership
        .filter({ organization_id: org.id, user_id: DR_HAMAD_PERSON_KEY }).catch(() => []))[0];
      const payload = {
        organization_id: org.id,
        user_id: DR_HAMAD_PERSON_KEY,
        user_email: DR_HAMAD_PERSONA.email,
        user_name: DR_HAMAD_PERSONA.name_en,
        role: key === 'QDB' ? 'owner' : 'member',
        status: 'active',
        is_demo_data: true,
        demo_dataset: DR_HAMAD_DATASET,
      };
      if (existing) {
        await sr.entities.OrganizationMembership.update(existing.id, payload);
      } else {
        await sr.entities.OrganizationMembership.create({ ...payload, joined_at: new Date().toISOString() });
      }
    }

    const results = [];

    for (const def of DR_HAMAD_COMMITTEES) {
      const owningOrg = orgByKey[def.owning_org];

      // Committee (upsert by public_id)
      let committee = (await sr.entities.Committee.filter({ public_id: def.public_id }).catch(() => []))[0];
      const committeePayload = {
        organization_id: owningOrg.id,
        name_ar: def.name_ar,
        name_en: def.name_en,
        slug: def.slug,
        public_id: def.public_id,
        type: def.type,
        mandate: def.mandate_ar,
        scope: def.mandate_en,
        status: 'active',
        classification: 'internal',
        is_demo_data: true,
        demo_dataset: DR_HAMAD_DATASET,
      };
      if (committee) {
        committee = await sr.entities.Committee.update(committee.id, committeePayload);
      } else {
        committee = await sr.entities.Committee.create(committeePayload);
      }

      // CommitteeMembership for the persona (one independent record per committee)
      let membership = (await sr.entities.CommitteeMembership.filter({
        committee_id: committee.id, user_id: DR_HAMAD_PERSON_KEY,
      }).catch(() => []))[0];
      const membershipPayload = {
        organization_id: owningOrg.id,
        committee_id: committee.id,
        user_id: DR_HAMAD_PERSON_KEY,
        user_email: DR_HAMAD_PERSONA.email,
        full_name: DR_HAMAD_PERSONA.name_en,
        full_name_ar: DR_HAMAD_PERSONA.name_ar,
        role: def.role,
        authority_level: def.role === 'chair' ? 'decision' : def.role === 'vice_chair' ? 'approval' : def.role === 'secretary' ? 'execution' : 'advisory',
        voting_right: def.role !== 'secretary',
        status: 'active',
        institution_name: DR_HAMAD_PERSONA.primary_org_ar, // represented org is ALWAYS QDB
        term_start: '2026-01-01',
        term_end: '2027-12-31',
        is_demo_data: true,
        demo_dataset: DR_HAMAD_DATASET,
      };
      if (membership) {
        membership = await sr.entities.CommitteeMembership.update(membership.id, membershipPayload);
      } else {
        membership = await sr.entities.CommitteeMembership.create(membershipPayload);
      }

      // AuthorityGrant — the real, server-evaluated authority boundary for this committee
      const authorityType = def.role === 'chair' ? 'chair_authority'
        : def.role === 'vice_chair' ? 'vice_chair_support'
        : def.role === 'secretary' ? 'secretary_administration'
        : 'member_contribution';
      let grant = (await sr.entities.AuthorityGrant.filter({
        person_key: DR_HAMAD_PERSON_KEY, committee_id: committee.id,
      }).catch(() => []))[0];
      const grantPayload = {
        person_key: DR_HAMAD_PERSON_KEY,
        committee_id: committee.id,
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
      };
      if (grant) {
        grant = await sr.entities.AuthorityGrant.update(grant.id, grantPayload);
      } else {
        grant = await sr.entities.AuthorityGrant.create(grantPayload);
      }

      // ── Minimal realistic content so no committee is empty ──
      const demoFlags = { is_demo_data: true, demo_dataset: DR_HAMAD_DATASET };

      const existingMeetings = await sr.entities.Meeting.filter({ committee_id: committee.id }).catch(() => []);
      let meeting = existingMeetings[0];
      if (!meeting) {
        const meetingDate = new Date();
        meetingDate.setDate(meetingDate.getDate() + 14);
        meeting = await sr.entities.Meeting.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: `${def.name_en} — Session`,
          title_ar: `اجتماع ${def.name_ar}`,
          date: meetingDate.toISOString(),
          duration_minutes: 75,
          location: 'قاعة الاجتماعات — الدوحة',
          mode: 'hybrid',
          status: 'scheduled',
          agenda_ready: true,
          quorum_required: 4,
          ...demoFlags,
        });
      }

      const existingAgenda = await sr.entities.AgendaItem.filter({ meeting_id: meeting.id }).catch(() => []);
      if (existingAgenda.length === 0) {
        // Bilingual agenda topics — the English title must never carry Arabic text.
        const topicSet = DR_HAMAD_TOPICS[def.key] || { ar: [def.mandate_ar], en: [def.mandate_en] };
        const arTopics = topicSet.ar || [def.mandate_ar];
        const enTopics = topicSet.en || [def.mandate_en];
        await Promise.all(arTopics.slice(0, 3).map((arTopic, idx) =>
          sr.entities.AgendaItem.create({
            organization_id: owningOrg.id,
            committee_id: committee.id,
            meeting_id: meeting.id,
            sequence: idx + 1,
            title: enTopics[idx] || arTopic,
            title_ar: arTopic,
            objective: enTopics[idx] || arTopic,
            readiness: idx === 0 ? 'ready' : 'needs_attention',
            status: 'pending',
            ...demoFlags,
          })
        ));
      }
      const topicAr = DR_HAMAD_TOPICS[def.key]?.ar?.[0] || def.mandate_ar;
      const topicEn = DR_HAMAD_TOPICS[def.key]?.en?.[0] || def.mandate_en;

      const existingDecisions = await sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []);
      if (existingDecisions.length === 0) {
        await sr.entities.Decision.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          meeting_id: meeting.id,
          decision_number: `${def.public_id}-D1`,
          title: `Decision on ${topicEn}`,
          title_ar: `قرار بشأن ${topicAr}`,
          proposal: def.mandate_en,
          status: def.role === 'chair' ? 'in_review' : 'proposed',
          ...demoFlags,
        });
      }

      const existingActions = await sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []);
      if (existingActions.length === 0) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 21);
        await sr.entities.Action.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: `Follow up on ${topicEn}`,
          title_ar: `متابعة ${topicAr}`,
          owner_name: DR_HAMAD_PERSONA.name_ar,
          deadline: deadline.toISOString().slice(0, 10),
          priority: 'medium',
          status: 'in_progress',
          ...demoFlags,
        });
      }

      const existingDocs = await sr.entities.Document.filter({ committee_id: committee.id }).catch(() => []);
      if (existingDocs.length === 0) {
        await sr.entities.Document.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: `${def.name_en} — Briefing Note`,
          title_ar: `مذكرة إحاطة — ${def.name_ar}`,
          document_type: 'memo',
          classification: 'internal',
          owner_name: DR_HAMAD_PERSONA.name_ar,
          status: 'in_review',
          ...demoFlags,
        });
      }

      results.push({ committee: def.name_en, role: def.role, committee_id: committee.id });
    }

    // ── Feature flag (same convention as the platform demo flag) ──
    const flagKey = 'dr_hamad_demo_provisioned';
    const flagDesc = `Dr. Hamad demo persona provisioned. Dataset: ${DR_HAMAD_DATASET}. Persona user: ${DR_HAMAD_PERSON_KEY}`;
    const existingFlag = (await sr.entities.FeatureFlag.filter({ key: flagKey }).catch(() => []))[0];
    if (existingFlag) {
      await sr.entities.FeatureFlag.update(existingFlag.id, { enabled: true, description: flagDesc });
    } else {
      await sr.entities.FeatureFlag.create({ key: flagKey, enabled: true, description: flagDesc, organization_id: null });
    }

    return Response.json({
      status: 'success',
      persona_key: DR_HAMAD_PERSON_KEY,
      dataset: DR_HAMAD_DATASET,
      primary_org_id: qdb.id,
      committees: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}