import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DR_HAMAD_ORGS, DR_HAMAD_COMMITTEES,
  DEMO_SCENARIO_ID,
} from '../../shared/drHamadDataset.ts';

// ProvisionDrHamadDemoData — idempotent seed for the Dr. Hamad governed demonstration
// persona: one QDB organization (primary), one ELAN organization (committee owner only),
// seven committees, seven independent CommitteeMembership records, and a dedicated
// AuthorityGrant per committee that encodes the real authority boundary (never a bare
// role string). Re-running this function updates in place — it never duplicates records.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    const sr = base44.asServiceRole;

    // ── Organizations ──
    const orgByKey = {};
    for (const [key, org] of Object.entries(DR_HAMAD_ORGS)) {
      const existing = await sr.entities.Organization.filter({ public_id: org.public_id }).catch(() => []);
      if (existing && existing.length > 0) {
        orgByKey[key] = existing[0];
      } else {
        orgByKey[key] = await sr.entities.Organization.create({
          ...org,
          status: 'sandbox_active',
          is_demo_data: true,
          demo_dataset: DEMO_SCENARIO_ID,
        });
      }
    }
    const qdb = orgByKey.QDB;

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
        demo_dataset: DEMO_SCENARIO_ID,
      };
      if (committee) {
        committee = await sr.entities.Committee.update(committee.id, committeePayload);
      } else {
        committee = await sr.entities.Committee.create(committeePayload);
      }

      // CommitteeMembership for Dr. Hamad (one independent record per committee)
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
        demo_dataset: DEMO_SCENARIO_ID,
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
        demo_scenario_id: DEMO_SCENARIO_ID,
      };
      if (grant) {
        grant = await sr.entities.AuthorityGrant.update(grant.id, grantPayload);
      } else {
        grant = await sr.entities.AuthorityGrant.create(grantPayload);
      }

      // ── Minimal realistic bilingual content so no committee is empty ──
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
          is_demo_data: true,
          demo_dataset: DEMO_SCENARIO_ID,
        });
      }

      const existingAgenda = await sr.entities.AgendaItem.filter({ meeting_id: meeting.id }).catch(() => []);
      if (existingAgenda.length === 0) {
        const topics = def.topics_ar || [def.mandate_ar];
        await Promise.all(topics.slice(0, 3).map((topic, idx) =>
          sr.entities.AgendaItem.create({
            organization_id: owningOrg.id,
            committee_id: committee.id,
            meeting_id: meeting.id,
            sequence: idx + 1,
            title: topic,
            title_ar: topic,
            objective: topic,
            readiness: idx === 0 ? 'ready' : 'needs_attention',
            status: 'pending',
          })
        ));
      }

      const existingDecisions = await sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []);
      if (existingDecisions.length === 0) {
        await sr.entities.Decision.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          meeting_id: meeting.id,
          decision_number: `${def.public_id}-D1`,
          title: `Decision on ${def.topics_ar?.[0] || def.mandate_en}`,
          title_ar: `قرار بشأن ${def.topics_ar?.[0] || def.mandate_ar}`,
          proposal: def.mandate_en,
          status: def.role === 'chair' ? 'in_review' : 'proposed',
        });
      }

      const existingActions = await sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []);
      if (existingActions.length === 0) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 21);
        await sr.entities.Action.create({
          organization_id: owningOrg.id,
          committee_id: committee.id,
          title: `Follow up on ${def.topics_ar?.[0] || def.mandate_en}`,
          title_ar: `متابعة ${def.topics_ar?.[0] || def.mandate_ar}`,
          owner_name: DR_HAMAD_PERSONA.name_ar,
          deadline: deadline.toISOString().slice(0, 10),
          priority: 'medium',
          status: 'in_progress',
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
        });
      }

      results.push({ committee: def.name_en, role: def.role, committee_id: committee.id });
    }

    return Response.json({ status: 'success', scenario_id: DEMO_SCENARIO_ID, qdb_org_id: qdb.id, committees: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}