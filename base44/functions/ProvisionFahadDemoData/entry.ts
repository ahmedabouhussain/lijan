import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  DEMO_USER, DEMO_DATASET, DEMO_FLAG_KEY,
  DEMO_ORGS, DEMO_COMMITTEES, buildCommitteeMembers, buildMeetings,
} from "../../shared/demoDataset.ts";

// ProvisionFahadDemoData — Creates comprehensive demo data for Fahad Al-Fihaidi
// 3 organizations, 7 committees, memberships, meetings, decisions, actions, etc.
// Admin-only. Idempotent (checks FeatureFlag). Supports reset=true to recreate.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    let payload = {};
    try { payload = await req.json(); } catch {}
    const reset = payload.reset === true;

    const sr = base44.asServiceRole;

    // ── Check if already provisioned ──
    const existingFlag = await sr.entities.FeatureFlag.filter({ key: DEMO_FLAG_KEY }).catch(() => []);
    const alreadyProvisioned = existingFlag && existingFlag.length > 0 && existingFlag[0].enabled;

    if (alreadyProvisioned && !reset) {
      return Response.json({
        status: 'already_provisioned',
        message: 'Demo data for Fahad Al-Fihaidi is already provisioned. Use reset=true to recreate.',
      });
    }

    // ── If reset, delete existing demo data ──
    let deletedCounts = {};
    if (alreadyProvisioned && reset) {
      deletedCounts = await deleteDemoData(sr, existingFlag[0]);
    }

    // ── Create Organizations ──
    const orgIds = [];
    for (let i = 0; i < DEMO_ORGS.length; i++) {
      const org = DEMO_ORGS[i];
      const created = await sr.entities.Organization.create({
        ...org,
        status: 'sandbox_active',
        classification_policy: 'internal',
        branding_primary_color: '#8A1538',
        country: 'QA',
        timezone: 'Asia/Qatar',
        default_locale: 'ar',
        retention_policy_years: 7,
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      });
      orgIds.push(created.id);
    }

    // ── Create OrganizationMemberships for Fahad ──
    const orgMemberships = [];
    for (const orgId of orgIds) {
      const m = await sr.entities.OrganizationMembership.create({
        organization_id: orgId,
        user_id: DEMO_USER.id,
        user_email: DEMO_USER.email,
        user_name: DEMO_USER.name_en,
        role: 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      });
      orgMemberships.push(m);
    }

    // ── Create Committees + Memberships + Meetings + Data ──
    const committeeIds = [];
    const meetingIds = []; // flat list of {id, committeeId, orgId, isPast}
    const allActions = [];

    for (let i = 0; i < DEMO_COMMITTEES.length; i++) {
      const cdef = DEMO_COMMITTEES[i];
      const orgId = orgIds[cdef.orgIndex];

      // Create committee
      const committee = await sr.entities.Committee.create({
        organization_id: orgId,
        name_ar: cdef.name_ar,
        name_en: cdef.name_en,
        type: cdef.type,
        status: 'active',
        mandate: `اختصاصات ${cdef.name_ar} — بيانات تجريبية`,
        establishing_authority: "جهة التأسيس التجريبية",
        establishing_doc_type: "decision",
        establishing_doc_reference: `DEMO-${i + 1}-2026`,
        quorum_count: 4,
        voting_rule: "simple_majority",
        meeting_cadence: "monthly",
        classification: "internal",
        term_start: "2026-01-01",
        chair_name: cdef.fahadRole === 'chair' ? DEMO_USER.name_ar : DEMO_MEMBER_NAMES_PLACEHOLDER,
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      });
      committeeIds.push(committee.id);

      // Create committee memberships
      const members = buildCommitteeMembers(i, cdef.fahadRole);
      for (const m of members) {
        await sr.entities.CommitteeMembership.create({
          ...m,
          organization_id: orgId,
          committee_id: committee.id,
          is_demo_data: true,
          demo_dataset: DEMO_DATASET,
        });
      }

      // Create meetings (1 past + 1 upcoming)
      const meetings = buildMeetings(committee.id, orgId, i);
      const pastMeeting = await sr.entities.Meeting.create(meetings[0]);
      const upcomingMeeting = await sr.entities.Meeting.create(meetings[1]);
      meetingIds.push({ id: pastMeeting.id, committeeId: committee.id, orgId, isPast: true, index: i });
      meetingIds.push({ id: upcomingMeeting.id, committeeId: committee.id, orgId, isPast: false, index: i });

      // Create agenda items for upcoming meeting
      const agendaItems = buildAgendaItems(upcomingMeeting.id, committee.id, orgId, i);
      await sr.entities.AgendaItem.bulkCreate(agendaItems);

      // Create attendance for past meeting
      const attendance = buildAttendance(pastMeeting.id, committee.id, orgId, members);
      await sr.entities.Attendance.bulkCreate(attendance);

      // Create decisions (varies by scenario)
      const decisions = buildDecisions(committee.id, orgId, i, pastMeeting.id, cdef.scenario);
      for (const d of decisions) {
        await sr.entities.Decision.create(d);
      }

      // Create actions (some assigned to Fahad)
      const actions = buildActions(committee.id, orgId, i, cdef.scenario, cdef.fahadRole);
      for (const a of actions) {
        const created = await sr.entities.Action.create(a);
        allActions.push(created);
      }

      // Create authority delegation for Committee 2 (vice_chair with delegation)
      if (cdef.hasDelegation) {
        const delegationStart = new Date();
        delegationStart.setDate(delegationStart.getDate() - 5);
        const delegationEnd = new Date();
        delegationEnd.setDate(delegationEnd.getDate() + 25);
        await sr.entities.AuthorityDelegation.create({
          organization_id: orgId,
          committee_id: committee.id,
          type: 'delegation',
          from_member_name: DEMO_MEMBER_NAMES_PLACEHOLDER,
          from_member_role: 'chair',
          to_member_name: DEMO_USER.name_ar,
          to_member_role: 'vice_chair',
          scope: 'إدارة اجتماع محدد واعتماد جدول أعماله ومتابعة قراراته — تفويض محدود المدة',
          reason: 'غياب رئيس اللجنة — تفويض محدود للنائب · Limited delegation during chair absence',
          start_date: delegationStart.toISOString().split('T')[0],
          end_date: delegationEnd.toISOString().split('T')[0],
          status: 'active',
          is_demo_data: true,
          demo_dataset: DEMO_DATASET,
        });
      }
    }

    // ── Create Audit Events ──
    await sr.entities.AuditEvent.create({
      organization_id: orgIds[0],
      event_type: 'demo_provision',
      description: `Provisioned Fahad Al-Fihaidi demo dataset: ${DEMO_ORGS.length} orgs, ${DEMO_COMMITTEES.length} committees`,
      actor_name: user.full_name || user.email,
      actor_user_id: user.id,
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    }).catch(() => {});

    // ── Set FeatureFlag ──
    if (existingFlag && existingFlag.length > 0) {
      await sr.entities.FeatureFlag.update(existingFlag[0].id, {
        enabled: true,
        description: `Demo data provisioned. Org IDs: ${orgIds.join(',')}`,
      });
    } else {
      await sr.entities.FeatureFlag.create({
        key: DEMO_FLAG_KEY,
        enabled: true,
        description: `Demo data provisioned. Org IDs: ${orgIds.join(',')}`,
        organization_id: null,
      });
    }

    return Response.json({
      status: 'success',
      message: 'Demo data provisioned successfully',
      summary: {
        organizations: orgIds.length,
        committees: committeeIds.length,
        org_memberships: orgMemberships.length,
        meetings: meetingIds.length,
        actions: allActions.length,
        deleted_before: deletedCounts,
      },
      org_ids: orgIds,
      committee_ids: committeeIds,
      demo_user: {
        id: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name_en,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

const DEMO_MEMBER_NAMES_PLACEHOLDER = "أحمد المنصوري";

// ── Helper builders ──

function buildAgendaItems(meetingId, committeeId, orgId, committeeIndex) {
  const baseItems = [
    { title: "اعتماد محضر الاجتماع السابق", title_ar: "اعتماد محضر الاجتماع السابق", objective: "مراجعة واعتماد المحضر", time_allocation_minutes: 10, readiness: "ready", required_decision: "approve_minutes" },
    { title: "تقرير المتابعة التنفيذية", title_ar: "تقرير المتابعة التنفيذية", objective: "استعراض تقدم الإجراءات", time_allocation_minutes: 20, readiness: "ready", required_decision: "note" },
    { title: "بند للنقاش والتصويت", title_ar: "بند للنقاش والتصويت", objective: "مناقشة واتخاذ قرار", time_allocation_minutes: 30, readiness: "needs_attention", required_decision: "vote" },
  ];
  return baseItems.map((item, idx) => ({
    organization_id: orgId,
    committee_id: committeeId,
    meeting_id: meetingId,
    sequence: idx + 1,
    title: item.title,
    title_ar: item.title_ar,
    objective: item.objective,
    time_allocation_minutes: item.time_allocation_minutes,
    required_decision: item.required_decision,
    readiness: item.readiness,
    classification: "internal",
    status: "pending",
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  }));
}

function buildAttendance(meetingId, committeeId, orgId, members) {
  return members.map((m) => ({
    organization_id: orgId,
    meeting_id: meetingId,
    committee_id: committeeId,
    member_name: m.full_name,
    member_role: m.role,
    attendance_status: "present",
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  }));
}

function buildDecisions(committeeId, orgId, committeeIndex, meetingId, scenario) {
  const decisions = [];
  // Past decision (approved)
  decisions.push({
    organization_id: orgId,
    committee_id: committeeId,
    meeting_id: meetingId,
    decision_number: `DEC-${committeeIndex + 1}-2026-001`,
    title: `قرار تنفيذي للجنة ${committeeIndex + 1}`,
    title_ar: `قرار تنفيذي للجنة ${committeeIndex + 1}`,
    proposal: "مسودة قرار تجريبي — بيانات غير حقيقية",
    legal_basis: "اللائحة الداخلية التجريبية",
    vote_for: 5,
    vote_against: 0,
    vote_abstain: 1,
    status: "issued",
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  });

  // Scenario-specific decision
  if (scenario === 'minutes_pending_approval') {
    decisions.push({
      organization_id: orgId,
      committee_id: committeeId,
      decision_number: `DEC-${committeeIndex + 1}-2026-002`,
      title: "قرار استراتيجي ينتظر الاعتماد",
      title_ar: "قرار استراتيجي ينتظر الاعتماد",
      proposal: "مسودة قرار استراتيجي تنتظر اعتماد الرئيس",
      status: "proposed",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  if (scenario === 'open_voting') {
    decisions.push({
      organization_id: orgId,
      committee_id: committeeId,
      decision_number: `DEC-${committeeIndex + 1}-2026-003`,
      title: "قرار مفتوح للتصويت",
      title_ar: "قرار مفتوح للتصويت",
      proposal: "مسودة قرار مفتوح للتصويت — ينتظر إدلاء الأعضاء بأصواتهم",
      status: "voting",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  return decisions;
}

function buildActions(committeeId, orgId, committeeIndex, scenario, fahadRole) {
  const actions = [];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 14);
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 7);

  // Action assigned to Fahad
  actions.push({
    organization_id: orgId,
    committee_id: committeeId,
    title: `إجراء متابعة ${committeeIndex + 1} — مسند إلى فهد`,
    title_ar: `إجراء متابعة ${committeeIndex + 1} — مسند إلى فهد`,
    owner_name: DEMO_USER.name_ar,
    deadline: futureDate.toISOString().split('T')[0],
    priority: 'high',
    progress_percent: 30,
    status: 'in_progress',
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  });

  // Overdue action (for Committee 5 scenario)
  if (scenario === 'overdue_action') {
    actions.push({
      organization_id: orgId,
      committee_id: committeeId,
      title: "إجراء متأخر — يتطلب متابعة عاجلة",
      title_ar: "إجراء متأخر — يتطلب متابعة عاجلة",
      owner_name: DEMO_USER.name_ar,
      deadline: pastDate.toISOString().split('T')[0],
      priority: 'critical',
      progress_percent: 20,
      status: 'overdue',
      reminder_count: 3,
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }

  // Action assigned to another member
  actions.push({
    organization_id: orgId,
    committee_id: committeeId,
    title: `إجراء متابعة ${committeeIndex + 1} — مسند إلى عضو آخر`,
    title_ar: `إجراء متابعة ${committeeIndex + 1} — مسند إلى عضو آخر`,
    owner_name: "أحمد المنصوري",
    deadline: futureDate.toISOString().split('T')[0],
    priority: 'medium',
    progress_percent: 50,
    status: 'in_progress',
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  });

  return actions;
}

// ── Delete existing demo data ──
async function deleteDemoData(sr, flag) {
  const counts = {};
  // Parse org IDs from flag description
  const desc = flag.description || '';
  const match = desc.match(/Org IDs: (.+)$/);
  const orgIds = match ? match[1].split(',').filter(Boolean) : [];

  if (orgIds.length === 0) return counts;

  // Delete in dependency order
  for (const entity of ['Attendance', 'AgendaItem', 'Action', 'Decision', 'MeetingMinutes', 'Meeting', 'AuthorityDelegation', 'CommitteeMembership', 'Committee', 'OrganizationMembership']) {
    for (const orgId of orgIds) {
      try {
        const records = await sr.entities[entity].filter({ organization_id: orgId }).catch(() => []);
        for (const r of records) {
          if (r.is_demo_data || r.demo_dataset === DEMO_DATASET) {
            await sr.entities[entity].delete(r.id).catch(() => {});
          }
        }
      } catch {}
    }
  }

  // Delete organizations
  for (const orgId of orgIds) {
    try { await sr.entities.Organization.delete(orgId).catch(() => {}); } catch {}
  }

  counts.organizations = orgIds.length;
  return counts;
}