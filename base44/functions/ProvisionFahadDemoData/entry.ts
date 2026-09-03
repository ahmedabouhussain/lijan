import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  DEMO_USER, DEMO_DATASET, DEMO_FLAG_KEY,
  DEMO_ORGS, DEMO_COMMITTEES, buildCommitteeMembers, buildMeetings,
} from "../../shared/demoDataset.ts";

// ProvisionFahadDemoData — Creates comprehensive demo data for Fahad Al-Fihaidi
// 3 organizations, 7 committees — all ACTIVE, with public_id/slug for routing.
// Memberships linked to the current admin user so the demo is visible.
// Idempotent: cleans ALL old demo data by demo_dataset flag before creating.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    let payload = {};
    try { payload = await req.json(); } catch {}
    const reset = payload.reset !== false; // Default: reset

    const sr = base44.asServiceRole;

    // ── Step 1: Clean ALL old demo data (by demo_dataset flag) ──
    const deletedCounts = await cleanAllDemoData(sr, user.id);

    // ── Step 2: Create Organizations with public_id/slug ──
    const orgIds = [];
    const orgMap = {};
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
      orgMap[i] = created.id;
    }

    // ── Step 3: Create OrganizationMemberships for current user ──
    const orgMemberships = [];
    for (let i = 0; i < orgIds.length; i++) {
      const m = await sr.entities.OrganizationMembership.create({
        organization_id: orgIds[i],
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: i === 0 ? 'admin' : 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      });
      orgMemberships.push(m);
    }

    // ── Step 3b: Set Fahad's profile identity (job title, primary org) ──
    await base44.auth.updateMe({
      primary_org_id: orgMap[0],
      job_title_ar: DEMO_USER.job_title_ar,
      job_title_en: DEMO_USER.job_title_en,
      primary_org_ar: DEMO_USER.primary_org_ar,
      primary_org_en: DEMO_USER.primary_org_en,
      demo_persona_key: DEMO_USER.persona_key,
      is_demo_user: true,
      display_name_ar: DEMO_USER.name_ar,
      display_name_en: DEMO_USER.name_en,
    }).catch(() => {});

    // ── Step 3c: Register Audit and Review Council in OrganizationDirectory ──
    const existingDir = await sr.entities.OrganizationDirectory
      .filter({ directory_key: "audit_review_council" }).catch(() => []);
    if (!existingDir || existingDir.length === 0) {
      await sr.entities.OrganizationDirectory.create({
        directory_key: "audit_review_council",
        canonical_name_ar: "مجلس التدقيق والمراجعة",
        canonical_name_en: "Audit and Review Council",
        organization_type: "council",
        country_code: "QA",
        registry_source: "manual_entry",
        verification_status: "verified",
        canonical_organization_id: orgMap[0],
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      }).catch(() => {});
    }

    // ── Step 4: Create Committees + Memberships + Data ──
    const committeeIds = [];
    let totalMeetings = 0, totalDecisions = 0, totalActions = 0, totalMembers = 0;

    for (let i = 0; i < DEMO_COMMITTEES.length; i++) {
      const cdef = DEMO_COMMITTEES[i];
      const orgId = orgMap[cdef.orgIndex];

      // Create committee with public_id/slug
      const committee = await sr.entities.Committee.create({
        organization_id: orgId,
        public_id: cdef.public_id,
        slug: cdef.slug,
        name_ar: cdef.name_ar,
        name_en: cdef.name_en,
        type: cdef.type,
        status: 'active',
        mandate: buildMandate(cdef),
        scope: buildScope(cdef),
        establishing_authority: cdef.orgIndex === 0 ? "وزير المعرفة" : cdef.orgIndex === 1 ? "مجلس إدارة المؤسسة" : "رئيس المجلس",
        establishing_doc_type: "decision",
        establishing_doc_reference: `DEMO-${i + 1}-2026`,
        establishing_doc_date: "2026-01-01",
        quorum_count: 4,
        voting_rule: "simple_majority",
        meeting_cadence: "monthly",
        classification: "internal",
        term_start: "2026-01-01",
        term_end: "2027-12-31",
        chair_name: cdef.fahadRole === 'chair' ? DEMO_USER.name_ar : "أحمد المنصوري",
        secretary_name: cdef.fahadRole === 'secretary' ? DEMO_USER.name_ar : "سارة الكواري",
        governance_complete: true,
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      });
      committeeIds.push(committee.id);

      // Create committee memberships (linked to current user as Fahad)
      const members = buildCommitteeMembers(i, cdef.fahadRole);
      const memberRecords = members.map((m) => ({
        ...m,
        user_id: m.full_name === DEMO_USER.name_en ? user.id : null,
        organization_id: orgId,
        committee_id: committee.id,
        is_demo_data: true,
        demo_dataset: DEMO_DATASET,
      }));
      await sr.entities.CommitteeMembership.bulkCreate(memberRecords);
      totalMembers += memberRecords.length;

      // Create meetings (4 past + 2 upcoming)
      const meetings = buildMeetings(committee.id, orgId, i);
      const createdMeetings = await sr.entities.Meeting.bulkCreate(meetings);
      totalMeetings += createdMeetings.length;

      // Create agenda items for the first upcoming meeting
      const upcomingMeeting = createdMeetings.find((m) => m.status === 'scheduled');
      if (upcomingMeeting) {
        const agendaItems = buildAgendaItems(upcomingMeeting.id, committee.id, orgId, i, cdef);
        await sr.entities.AgendaItem.bulkCreate(agendaItems);
      }

      // Create attendance for the first past meeting
      const pastMeeting = createdMeetings.find((m) => m.status === 'completed');
      if (pastMeeting) {
        const attendance = buildAttendance(pastMeeting.id, committee.id, orgId, members);
        await sr.entities.Attendance.bulkCreate(attendance);
      }

      // Create decisions (5 per committee)
      const decisions = buildDecisions(committee.id, orgId, i, pastMeeting?.id, cdef);
      for (const d of decisions) {
        await sr.entities.Decision.create(d);
      }
      totalDecisions += decisions.length;

      // Create actions (8 per committee)
      const actions = buildActions(committee.id, orgId, i, cdef, user);
      for (const a of actions) {
        await sr.entities.Action.create(a);
      }
      totalActions += actions.length;

      // Create meeting minutes (2 approved + 1 under review)
      const minutes = buildMinutes(committee.id, orgId, i, createdMeetings, cdef);
      for (const m of minutes) {
        await sr.entities.MeetingMinutes.create(m);
      }

      // Create documents (10 per committee)
      const documents = buildDocuments(committee.id, orgId, i, cdef);
      for (const d of documents) {
        await sr.entities.Document.create(d);
      }

      // Create risks (4 per committee)
      const risks = buildRisks(committee.id, orgId, i, cdef);
      for (const r of risks) {
        await sr.entities.CommitteeAmendment.create({
          ...r,
          is_demo_data: true,
          demo_dataset: DEMO_DATASET,
        }).catch(() => {});
      }

      // Create audit events (20 per committee)
      const auditEvents = buildAuditEvents(committee.id, orgId, i, cdef, user);
      await sr.entities.AuditEvent.bulkCreate(auditEvents);

      // Create notifications (5 per committee)
      const notifications = buildNotifications(committee.id, orgId, i, cdef, user);
      await sr.entities.NotificationOutbox.bulkCreate(notifications);

      // Create authority delegation for vice_chair with delegation
      if (cdef.hasDelegation) {
        const delegationStart = new Date();
        delegationStart.setDate(delegationStart.getDate() - 5);
        const delegationEnd = new Date();
        delegationEnd.setDate(delegationEnd.getDate() + 25);
        await sr.entities.AuthorityDelegation.create({
          organization_id: orgId,
          committee_id: committee.id,
          type: 'delegation',
          from_member_name: "أحمد المنصوري",
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

      // Create conflict declaration for cybersecurity task force
      if (cdef.scenario === 'conflict_of_interest') {
        await sr.entities.ConflictDeclaration.create({
          organization_id: orgId,
          committee_id: committee.id,
          member_name: DEMO_USER.name_ar,
          member_role: 'chair',
          conflict_type: 'potential',
          description: 'مصلحة محتملة في أحد بنود جدول الأعمال — تم الإفصاح عنها قبل المناقشة',
          status: 'declared',
          is_demo_data: true,
          demo_dataset: DEMO_DATASET,
        }).catch(() => {});
      }
    }

    // ── Step 5: Set FeatureFlag ──
    const existingFlag = await sr.entities.FeatureFlag.filter({ key: DEMO_FLAG_KEY }).catch(() => []);
    const flagDesc = `Demo V2 provisioned. Org IDs: ${orgIds.join(',')}. User: ${user.email}`;
    if (existingFlag && existingFlag.length > 0) {
      await sr.entities.FeatureFlag.update(existingFlag[0].id, {
        enabled: true,
        description: flagDesc,
      });
    } else {
      await sr.entities.FeatureFlag.create({
        key: DEMO_FLAG_KEY,
        enabled: true,
        description: flagDesc,
        organization_id: null,
      });
    }

    // Also clean up old flag
    const oldFlag = await sr.entities.FeatureFlag.filter({ key: "fahad_demo_provisioned" }).catch(() => []);
    if (oldFlag && oldFlag.length > 0) {
      await sr.entities.FeatureFlag.update(oldFlag[0].id, { enabled: false }).catch(() => {});
    }

    return Response.json({
      status: 'success',
      message: 'Demo data provisioned successfully',
      summary: {
        organizations: orgIds.length,
        committees: committeeIds.length,
        org_memberships: orgMemberships.length,
        committee_members: totalMembers,
        meetings: totalMeetings,
        decisions: totalDecisions,
        actions: totalActions,
        deleted_before: deletedCounts,
      },
      org_ids: orgIds,
      committee_ids: committeeIds,
      demo_user: {
        email: DEMO_USER.email,
        name: DEMO_USER.name_en,
        linked_to: user.email,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

// ── Clean ALL demo data — by is_demo_data flag AND all known dataset keys ──
async function cleanAllDemoData(sr, userId) {
  const counts = {};
  const knownDatasetKeys = [
    DEMO_DATASET,
    "FAHAD_MULTI_ORG",
    "FAHAD_QATAR_GOVERNMENT_DEMO",
    "FAHAD_DEMO_V1",
  ];
  const entities = [
    'Attendance', 'AgendaItem', 'Action', 'Decision', 'MeetingMinutes',
    'Meeting', 'AuthorityDelegation', 'ConflictDeclaration', 'CommitteeAmendment',
    'CommitteeMembership', 'Committee', 'OrganizationMembership', 'Organization',
    'NotificationOutbox', 'AuditEvent', 'Document',
  ];

  for (const entity of entities) {
    let deleted = 0;
    const seenIds = new Set();
    try {
      // 1) Clean by is_demo_data flag (catches all demo data regardless of dataset key)
      const demoRecords = await sr.entities[entity].filter({ is_demo_data: true }).catch(() => []);
      for (const r of (demoRecords || [])) {
        if (seenIds.has(r.id)) continue;
        seenIds.add(r.id);
        await sr.entities[entity].delete(r.id).catch(() => {});
        deleted++;
      }
      // 2) Also clean by known dataset keys (fallback for records without is_demo_data)
      for (const key of knownDatasetKeys) {
        const records = await sr.entities[entity].filter({ demo_dataset: key }).catch(() => []);
        for (const r of (records || [])) {
          if (seenIds.has(r.id)) continue;
          seenIds.add(r.id);
          await sr.entities[entity].delete(r.id).catch(() => {});
          deleted++;
        }
      }
      // 3) For membership entities, also clean by user_id + demo flags (belt-and-suspenders)
      if (userId && (entity === 'OrganizationMembership' || entity === 'CommitteeMembership')) {
        const userMemberships = await sr.entities[entity].filter({ user_id: userId }).catch(() => []);
        for (const r of (userMemberships || [])) {
          if (seenIds.has(r.id)) continue;
          // Only delete if it has demo markers
          if (r.is_demo_data || r.demo_dataset || r.demo_persona_key) {
            seenIds.add(r.id);
            await sr.entities[entity].delete(r.id).catch(() => {});
            deleted++;
          }
        }
      }
    } catch {}
    counts[entity] = deleted;
  }

  return counts;
}

// ── Mandate builder ──
function buildMandate(cdef) {
  const topics = cdef.topics || [];
  return `تتولى ${cdef.name_ar} اختصاصات تشمل: ${topics.join("، ")}. ` +
    `تعمل اللجنة وفق اللائحة الداخلية وتقدم تقارير دورية للجهة المشرفة. ` +
    `بيانات تجريبية — غير صالحة للاستخدام الرسمي · Demo data — fictional`;
}

function buildScope(cdef) {
  return `يشمل نطاق ${cdef.name_ar}: المراجعة والاعتماد والمتابعة في مجالات الاختصاص المحددة. ` +
    `تقدم اللجنة توصيات للجهة المشرفة وترفع تقارير دورية عن نتائج أعمالها. ` +
    `بيانات تجريبية · Demo data`;
}

// ── Agenda items ──
function buildAgendaItems(meetingId, committeeId, orgId, committeeIndex, cdef) {
  const topics = cdef.topics || ["بند عام"];
  const items = [
    { title: "اعتماد محضر الاجتماع السابق", title_ar: "اعتماد محضر الاجتماع السابق", objective: "مراجعة واعتماد المحضر", time_allocation_minutes: 10, readiness: "ready", required_decision: "approve_minutes" },
    { title: `تقرير المتابعة التنفيذية — ${topics[0]}`, title_ar: `تقرير المتابعة التنفيذية — ${topics[0]}`, objective: "استعراض تقدم الإجراءات", time_allocation_minutes: 20, readiness: "ready", required_decision: "note" },
    { title: `${topics[1] || topics[0]} — للنقاش والتصويت`, title_ar: `${topics[1] || topics[0]} — للنقاش والتصويت`, objective: "مناقشة واتخاذ قرار", time_allocation_minutes: 30, readiness: "needs_attention", required_decision: "vote" },
    { title: `${topics[2] || topics[0]} — استعراض`, title_ar: `${topics[2] || topics[0]} — استعراض`, objective: "استعراض وتقديم ملاحظات", time_allocation_minutes: 15, readiness: "ready", required_decision: "note" },
  ];
  return items.map((item, idx) => ({
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

// ── Attendance ──
function buildAttendance(meetingId, committeeId, orgId, members) {
  const statuses = ["present", "present", "present", "present", "present", "present", "absent_with_apology", "present", "present", "present"];
  return members.map((m, idx) => ({
    organization_id: orgId,
    meeting_id: meetingId,
    committee_id: committeeId,
    member_name: m.full_name_ar || m.full_name,
    member_role: m.role,
    attendance_status: statuses[idx % statuses.length],
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  }));
}

// ── Decisions (5 per committee) ──
function buildDecisions(committeeId, orgId, committeeIndex, meetingId, cdef) {
  const topics = cdef.topics || ["قرار عام"];
  const decisions = [];

  // Decision 1: Issued (approved in past meeting)
  decisions.push({
    organization_id: orgId,
    committee_id: committeeId,
    meeting_id: meetingId,
    decision_number: `DEC-${committeeIndex + 1}-2026-001`,
    title: `اعتماد إطار عمل ${topics[0]}`,
    title_ar: `اعتماد إطار عمل ${topics[0]}`,
    proposal: `اعتماد الإطار المقترح لـ ${topics[0]} وفق المعايير المعتمدة — بيانات تجريبية`,
    legal_basis: "اللائحة الداخلية التجريبية — المادة 12",
    vote_for: 7, vote_against: 1, vote_abstain: 1,
    status: "issued",
    issued_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  });

  // Decision 2: Issued
  decisions.push({
    organization_id: orgId,
    committee_id: committeeId,
    meeting_id: meetingId,
    decision_number: `DEC-${committeeIndex + 1}-2026-002`,
    title: `تخصيص ميزانية ${topics[1] || topics[0]}`,
    title_ar: `تخصيص ميزانية ${topics[1] || topics[0]}`,
    proposal: `تخصيص الميزانية اللازمة لتنفيذ أنشطة ${topics[1] || topics[0]} — بيانات تجريبية`,
    legal_basis: "اللائحة الداخلية التجريبية — المادة 15",
    vote_for: 8, vote_against: 0, vote_abstain: 1,
    status: "issued",
    issued_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    is_demo_data: true,
    demo_dataset: DEMO_DATASET,
  });

  // Decision 3: Scenario-specific
  if (cdef.scenario === 'minutes_pending_approval') {
    decisions.push({
      organization_id: orgId, committee_id: committeeId,
      decision_number: `DEC-${committeeIndex + 1}-2026-003`,
      title: "قرار استراتيجي ينتظر الاعتماد",
      title_ar: "قرار استراتيجي ينتظر الاعتماد",
      proposal: "مسودة قرار استراتيجي تنتظر اعتماد الرئيس — بيانات تجريبية",
      status: "proposed",
      is_demo_data: true, demo_dataset: DEMO_DATASET,
    });
  } else if (cdef.scenario === 'open_voting') {
    decisions.push({
      organization_id: orgId, committee_id: committeeId,
      decision_number: `DEC-${committeeIndex + 1}-2026-003`,
      title: "قرار مفتوح للتصويت",
      title_ar: "قرار مفتوح للتصويت",
      proposal: "مسودة قرار مفتوح للتصويت — ينتظر إدلاء الأعضاء بأصواتهم — بيانات تجريبية",
      status: "voting",
      is_demo_data: true, demo_dataset: DEMO_DATASET,
    });
  } else {
    decisions.push({
      organization_id: orgId, committee_id: committeeId,
      decision_number: `DEC-${committeeIndex + 1}-2026-003`,
      title: `مراجعة ${topics[2] || topics[0]}`,
      title_ar: `مراجعة ${topics[2] || topics[0]}`,
      proposal: `مراجعة وتحديث السياسة المتعلقة بـ ${topics[2] || topics[0]} — بيانات تجريبية`,
      status: "in_review",
      is_demo_data: true, demo_dataset: DEMO_DATASET,
    });
  }

  // Decision 4: Executing
  decisions.push({
    organization_id: orgId, committee_id: committeeId,
    decision_number: `DEC-${committeeIndex + 1}-2026-004`,
    title: `تنفيذ ${topics[3] || topics[0]}`,
    title_ar: `تنفيذ ${topics[3] || topics[0]}`,
    proposal: `بدء تنفيذ الإجراءات المتعلقة بـ ${topics[3] || topics[0]} — بيانات تجريبية`,
    vote_for: 6, vote_against: 2, vote_abstain: 1,
    status: "executing",
    is_demo_data: true, demo_dataset: DEMO_DATASET,
  });

  // Decision 5: Completed
  decisions.push({
    organization_id: orgId, committee_id: committeeId,
    decision_number: `DEC-${committeeIndex + 1}-2026-005`,
    title: `إغلاق ${topics[4] || topics[0]}`,
    title_ar: `إغلاق ${topics[4] || topics[0]}`,
    proposal: `إكمال وإغلاق الإجراءات المتعلقة بـ ${topics[4] || topics[0]} — بيانات تجريبية`,
    vote_for: 9, vote_against: 0, vote_abstain: 0,
    status: "completed",
    is_demo_data: true, demo_dataset: DEMO_DATASET,
  });

  return decisions;
}

// ── Actions (8 per committee) ──
function buildActions(committeeId, orgId, committeeIndex, cdef, user) {
  const topics = cdef.topics || ["إجراء عام"];
  const actions = [];
  const futureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const actionTemplates = [
    { title: `إعداد مسودة ${topics[0]}`, owner: DEMO_USER.name_ar, deadline: futureDate(14), priority: 'high', progress: 30, status: 'in_progress' },
    { title: `مراجعة ${topics[1] || topics[0]}`, owner: "أحمد المنصوري", deadline: futureDate(21), priority: 'medium', progress: 50, status: 'in_progress' },
    { title: `تقييم ${topics[2] || topics[0]}`, owner: "سارة الكواري", deadline: futureDate(30), priority: 'medium', progress: 10, status: 'in_progress' },
    { title: `إعداد تقرير ${topics[3] || topics[0]}`, owner: DEMO_USER.name_ar, deadline: futureDate(7), priority: 'high', progress: 60, status: 'in_progress' },
    { title: `متابعة ${topics[4] || topics[0]}`, owner: "خالد العبدالله", deadline: futureDate(-3), priority: 'critical', progress: 20, status: 'overdue' },
    { title: `اعتماد ${topics[5] || topics[0]}`, owner: "نورة آل علي", deadline: futureDate(45), priority: 'low', progress: 0, status: 'pending' },
    { title: `تنفيذ ${topics[0]} — المرحلة الثانية`, owner: DEMO_USER.name_ar, deadline: futureDate(60), priority: 'medium', progress: 40, status: 'in_progress' },
    { title: `إغلاق ${topics[2] || topics[0]}`, owner: "محمد الدوسري", deadline: futureDate(-7), priority: 'high', progress: 90, status: 'completed' },
  ];

  for (const t of actionTemplates) {
    actions.push({
      organization_id: orgId,
      committee_id: committeeId,
      title: t.title,
      title_ar: t.title,
      owner_name: t.owner,
      deadline: t.deadline,
      priority: t.priority,
      progress_percent: t.progress,
      status: t.status,
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  return actions;
}

// ── Meeting minutes (2 approved + 1 under review) ──
function buildMinutes(committeeId, orgId, committeeIndex, meetings, cdef) {
  const minutes = [];
  const pastMeetings = meetings.filter((m) => m.status === 'completed');
  
  for (let i = 0; i < Math.min(2, pastMeetings.length); i++) {
    minutes.push({
      organization_id: orgId,
      committee_id: committeeId,
      meeting_id: pastMeetings[i].id,
      title: `محضر ${pastMeetings[i].title}`,
      title_ar: `محضر ${pastMeetings[i].title}`,
      body: `تم عقد ${pastMeetings[i].title} بحضور أعضاء اللجنة. تمت مناقشة بنود جدول الأعمال واتخاذ القرارات اللازمة. ` +
        `بيانات تجريبية — غير صالحة للاستخدام الرسمي · Demo data — fictional`,
      status: i === 0 ? 'approved' : 'approved',
      approved_by_name: cdef.fahadRole === 'chair' ? DEMO_USER.name_ar : "أحمد المنصوري",
      approved_at: new Date(Date.now() - (i + 1) * 7 * 86400000).toISOString(),
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }

  if (pastMeetings.length > 2) {
    minutes.push({
      organization_id: orgId,
      committee_id: committeeId,
      meeting_id: pastMeetings[2].id,
      title: `محضر ${pastMeetings[2].title} — تحت المراجعة`,
      title_ar: `محضر ${pastMeetings[2].title} — تحت المراجعة`,
      body: `مسودة محضر ${pastMeetings[2].title} — ينتظر المراجعة والاعتماد. بيانات تجريبية · Demo data`,
      status: 'draft',
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }

  return minutes;
}

// ── Documents (10 per committee) ──
function buildDocuments(committeeId, orgId, committeeIndex, cdef) {
  const topics = cdef.topics || ["وثيقة"];
  const docTypes = ["memo", "report", "analysis", "proposal", "evidence", "correspondence", "draft_decision", "report", "analysis", "proposal"];
  const docs = [];

  for (let i = 0; i < 10; i++) {
    docs.push({
      organization_id: orgId,
      committee_id: committeeId,
      title: `${topics[i % topics.length]} — وثيقة ${i + 1}`,
      title_ar: `${topics[i % topics.length]} — وثيقة ${i + 1}`,
      document_type: docTypes[i % docTypes.length],
      classification: "internal",
      owner_name: i % 3 === 0 ? DEMO_USER.name_ar : "أحمد المنصوري",
      description: `وثيقة تجريبية تتعلق بـ ${topics[i % topics.length]} — بيانات غير حقيقية · Demo document`,
      status: i < 6 ? "published" : "in_review",
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  return docs;
}

// ── Risks (4 per committee) — stored as CommitteeAmendment for demo ──
function buildRisks(committeeId, orgId, committeeIndex, cdef) {
  const topics = cdef.topics || ["مخاطرة"];
  const riskLevels = ["high", "medium", "medium", "low"];
  const risks = [];

  for (let i = 0; i < 4; i++) {
    risks.push({
      organization_id: orgId,
      committee_id: committeeId,
      title: `مخاطرة ${topics[i % topics.length]} — ${i + 1}`,
      title_ar: `مخاطرة ${topics[i % topics.length]} — ${i + 1}`,
      type: "amendment",
      status: "proposed",
      description: `مخاطرة محتملة في ${topics[i % topics.length]} — تتطلب متابعة ومعالجة. بيانات تجريبية`,
      priority: riskLevels[i],
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  return risks;
}

// ── Audit events (20 per committee) ──
function buildAuditEvents(committeeId, orgId, committeeIndex, cdef, user) {
  const events = [];
  const actionTypes = [
    'committee_accessed', 'meeting_scheduled', 'meeting_started', 'meeting_adjourned',
    'agenda_published', 'decision_issued', 'decision_voted', 'action_assigned',
    'action_updated', 'minutes_approved', 'document_uploaded', 'member_added',
    'member_removed', 'delegation_granted', 'conflict_declared', 'vote_cast',
    'escalation_triggered', 'review_requested', 'review_responded', 'notification_sent',
  ];

  for (let i = 0; i < 20; i++) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - i);
    events.push({
      organization_id: orgId,
      committee_id: committeeId,
      event_type: actionTypes[i % actionTypes.length],
      description: `${actionTypes[i % actionTypes.length]} — ${cdef.name_ar} — بيانات تجريبية`,
      actor_name: i % 3 === 0 ? DEMO_USER.name_ar : "أحمد المنصوري",
      actor_user_id: i % 3 === 0 ? user.id : null,
      entity_type: "Committee",
      entity_id: committeeId,
      entity_title: cdef.name_ar,
      timestamp: eventDate.toISOString(),
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  return events;
}

// ── Notifications (5 per committee) ──
function buildNotifications(committeeId, orgId, committeeIndex, cdef, user) {
  const eventTypes = ['meeting_scheduled', 'agenda_published', 'action_assigned', 'decision_issued', 'minutes_approval_requested'];
  const notifications = [];

  for (let i = 0; i < 5; i++) {
    notifications.push({
      organization_id: orgId,
      committee_id: committeeId,
      recipient_user_id: user.id,
      recipient_email: user.email,
      recipient_name: DEMO_USER.name_ar,
      event_type: eventTypes[i],
      channel: 'in_app',
      subject_ar: `${cdef.name_ar} — ${eventTypes[i]}`,
      subject_en: `${cdef.name_en} — ${eventTypes[i]}`,
      body_ar: `إشعار تجريبي من ${cdef.name_ar} — بيانات غير حقيقية`,
      body_en: `Demo notification from ${cdef.name_en} — fictional data`,
      priority: i === 0 ? 'high' : 'normal',
      status: i < 3 ? 'sent' : 'read',
      sent_at: new Date(Date.now() - i * 3600000).toISOString(),
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    });
  }
  return notifications;
}