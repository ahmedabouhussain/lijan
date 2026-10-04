import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { dispatchNotification } from '../../shared/notificationEngine.ts';
import {
  OPEN_ACTION_STATUSES,
  ACCOUNTABLE_OFFICE_ROLES,
  classifyAction,
  resolveRecipients,
  buildFollowUpDigestPrompt,
  buildFollowUpFallback,
  FOLLOW_UP_SCHEMA,
  todayISO,
  addDaysISO,
} from '../../shared/executionReminderEngine.ts';

// RunAmeenExecutionFollowUp — the decision-execution follow-up cycle.
// Called by the daily scheduled workflow "Ameen Execution Reminders" after the deadline reminders.
// For each committee with something to follow, Ameen writes a formal bilingual brief covering:
//   · decisions recorded in execution and their state,
//   · decisions in execution with NO linked actions (an execution gap),
//   · actions approaching or past their delivery deadline.
// The brief is dispatched to the committee's accountable offices and recorded in the AI output
// ledger, so an AI-authored notice is always traceable to its source records and reviewable.

const SYSTEM_ACTOR = 'أمين — نظام متابعة التنفيذ الآلي';
const SYSTEM_ACTOR_EN = 'Ameen — automated execution follow-up';
const MAX_COMMITTEES_PER_RUN = 6;
const MAX_CANDIDATE_COMMITTEES = 20;
const EXECUTION_DECISION_STATUSES = ['issued', 'executing'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // No user context when the scheduled workflow runs this; a signed-in caller must be a platform admin.
    try {
      const me = await base44.auth.me();
      if (me && me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    } catch { /* scheduled run without a user context */ }

    const body = await req.json().catch(() => ({}));
    const windowDays = Math.min(Math.max(Number(body.window_days) || 7, 1), 30);
    const dryRun = body.dry_run === true;
    const scopeOrg = body.organization_id || null;

    const now = new Date();
    const today = todayISO(now);
    const windowEnd = addDaysISO(today, windowDays);

    const actionQuery = { status: { $in: OPEN_ACTION_STATUSES }, deadline: { $exists: true, $lte: windowEnd } };
    const decisionQuery = { status: { $in: EXECUTION_DECISION_STATUSES } };
    if (scopeOrg) {
      actionQuery.organization_id = scopeOrg;
      decisionQuery.organization_id = scopeOrg;
    }

    const [openActions, executingDecisions] = await Promise.all([
      base44.asServiceRole.entities.Action.filter(actionQuery, 'deadline', 500).catch(() => []),
      base44.asServiceRole.entities.Decision.filter(decisionQuery, '-created_date', 300).catch(() => []),
    ]);

    // Every action a decision owns, whatever its status — a closed action must not read as a gap.
    const decisionIds = (executingDecisions || []).map((d) => d.id);
    const allDecisionActions = decisionIds.length
      ? await base44.asServiceRole.entities.Action.filter({ decision_id: { $in: decisionIds } }, '-created_date', 500).catch(() => [])
      : [];

    const actionsByDecision = {};
    for (const a of allDecisionActions || []) {
      if (!a.decision_id) continue;
      actionsByDecision[a.decision_id] = actionsByDecision[a.decision_id] || [];
      actionsByDecision[a.decision_id].push(a);
    }

    const itemsByCommittee = {};
    const push = (committeeId, item) => {
      if (!committeeId) return;
      itemsByCommittee[committeeId] = itemsByCommittee[committeeId] || [];
      itemsByCommittee[committeeId].push(item);
    };

    for (const action of openActions || []) {
      const classification = classifyAction(action, { today, windowDays });
      if (!classification) continue;
      push(action.committee_id, {
        kind: 'action',
        title: action.title_ar || action.title || '',
        status: action.status,
        owner: action.owner_name || '',
        deadline: String(action.deadline || '').slice(0, 10),
        progress: action.progress_percent ?? 0,
        days: classification.days,
        note: classification.stage === 'overdue' ? 'تجاوز الموعد النهائي' : 'موعد نهائي قريب',
        workstream_id: action.workstream_id || null,
      });
    }

    for (const decision of executingDecisions || []) {
      const linked = actionsByDecision[decision.id];
      const linkedOpen = (linked || []).filter((a) => OPEN_ACTION_STATUSES.includes(a.status || 'assigned'));
      const overdueLinked = linkedOpen.filter((a) => a.deadline && a.deadline < today);
      const days = decision.deadline ? Math.round((Date.parse(`${decision.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000) : null;
      const deadlineSoon = days !== null && days <= windowDays;

      if (!linked || linked.length === 0) {
        push(decision.committee_id, {
          kind: 'execution_gap',
          title: decision.title_ar || decision.title || '',
          status: decision.status,
          owner: decision.owner_name || '',
          deadline: decision.deadline ? String(decision.deadline).slice(0, 10) : '',
          progress: null,
          days: days === null ? 0 : days,
          note: 'قرار قيد التنفيذ دون إجراءات تنفيذية مرتبطة مسجلة',
          workstream_id: null,
        });
        continue;
      }

      if (deadlineSoon || overdueLinked.length > 0) {
        push(decision.committee_id, {
          kind: 'decision',
          title: decision.title_ar || decision.title || '',
          status: decision.status,
          owner: decision.owner_name || '',
          deadline: decision.deadline ? String(decision.deadline).slice(0, 10) : '',
          progress: null,
          days: days === null ? 0 : days,
          note: overdueLinked.length > 0
            ? `قرار قيد التنفيذ مع ${overdueLinked.length} إجراءً متأخرًا`
            : 'قرار قيد التنفيذ يقترب موعده',
          workstream_id: null,
        });
      }
    }

    const candidateIds = Object.keys(itemsByCommittee).slice(0, MAX_CANDIDATE_COMMITTEES);
    if (candidateIds.length === 0) {
      return Response.json({ status: 'ok', today, window_days: windowDays, committees_followed_up: 0, briefs: [] });
    }

    const [committees, officeSeats, workstreamSeats] = await Promise.all([
      base44.asServiceRole.entities.Committee.filter({ id: { $in: candidateIds } }, '-created_date', 100).catch(() => []),
      base44.asServiceRole.entities.CommitteeMembership.filter({ committee_id: { $in: candidateIds }, status: 'active' }, 'protocol_order', 300).catch(() => []),
      base44.asServiceRole.entities.WorkstreamMembership.filter({ committee_id: { $in: candidateIds }, status: 'active' }, 'created_date', 300).catch(() => []),
    ]);

    const orgIds = [...new Set((committees || []).map((c) => c.organization_id).filter(Boolean))];
    const orgs = orgIds.length
      ? await base44.asServiceRole.entities.Organization.filter({ id: { $in: orgIds } }, '-created_date', 100).catch(() => [])
      : [];
    const orgIndex = {};
    for (const o of orgs || []) orgIndex[o.id] = o;
    const committeeIndex = {};
    for (const c of committees || []) committeeIndex[c.id] = c;

    // An Ameen brief for nobody is a wasted model call, so recipients are resolved BEFORE the cap:
    // committees with an accountable recipient are followed up first, and one without a recipient is
    // reported as unrouted rather than quietly consuming a slot.
    const recipientMap = {};
    const unroutedCommittees = [];
    for (const committeeId of candidateIds) {
      const committee = committeeIndex[committeeId];
      if (!committee) continue;
      const committeeOrg = orgIndex[committee.organization_id] || null;
      const recipients = resolveRecipients({
        workstreamSeats: (workstreamSeats || []).filter((s) => s.committee_id === committeeId),
        committeeSeats: (officeSeats || []).filter((s) => s.committee_id === committeeId),
      });
      // With no accountable seat holding an account, the committee's own organization owner is the
      // last accountable route — never a platform admin, who is not answerable for execution.
      if (recipients.length === 0 && committeeOrg?.owner_user_id) {
        recipients.push({
          user_id: committeeOrg.owner_user_id,
          name: committeeOrg.owner_name || committeeOrg.name_ar || '',
          name_en: committeeOrg.owner_name || committeeOrg.name_en || '',
          email: committeeOrg.owner_email || null,
          role: null,
          seat_kind: 'organization_owner',
        });
      }
      if (recipients.length === 0) {
        unroutedCommittees.push(committee.name_ar || committee.name_en || committeeId);
        continue;
      }
      recipientMap[committeeId] = recipients;
    }

    // Committees carrying the most overdue items are followed up first within the per-run cap.
    const committeeIds = Object.keys(recipientMap)
      .sort((a, b) => itemsByCommittee[b].filter((i) => i.days < 0).length - itemsByCommittee[a].filter((i) => i.days < 0).length)
      .slice(0, MAX_COMMITTEES_PER_RUN);

    const briefs = [];

    for (const committeeId of committeeIds) {
      const committee = committeeIndex[committeeId];
      if (!committee) continue;
      const items = itemsByCommittee[committeeId];
      const committeeName = committee.name_ar || committee.name_en || '';
      const org = orgIndex[committee.organization_id] || null;

      const recipients = recipientMap[committeeId] || [];

      let brief;
      try {
        const generated = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: buildFollowUpDigestPrompt({ committee_name: committeeName, today, window_days: windowDays, items }),
          response_json_schema: FOLLOW_UP_SCHEMA,
        });
        brief = generated && generated.brief_ar ? { ...generated, generated: true } : buildFollowUpFallback({ committee_name: committeeName, today, items });
      } catch {
        brief = buildFollowUpFallback({ committee_name: committeeName, today, items });
      }

      const hasOverdue = items.some((i) => i.days < 0);
      const orgRef = org ? (org.slug ? `${org.slug}--${org.public_id}` : org.public_id) : null;
      const committeeRef = `${committee.slug || committee.id}--${committee.public_id || committee.id}`;
      const deepLink = orgRef ? `/o/${orgRef}/c/${committeeRef}/execution` : '';

      if (!dryRun) {
        for (const recipient of recipients) {
          await dispatchNotification(base44, {
            organization_id: committee.organization_id,
            committee_id: committee.id,
            recipient_user_id: recipient.user_id,
            recipient_email: recipient.email,
            recipient_name: recipient.name,
            event_type: 'custom',
            channel: 'in_app',
            priority: hasOverdue ? 'high' : 'normal',
            subject_ar: brief.headline_ar,
            subject_en: brief.headline_en,
            body_ar: brief.brief_ar,
            body_en: brief.brief_en,
            source_entity_type: 'Committee',
            source_entity_id: committee.id,
            source_title: committeeName,
            deep_link: deepLink,
            correlation_id: `followup_${today}_${committee.id}`,
            actor_name: SYSTEM_ACTOR,
          }).catch(() => null);

          // The office carrying institutional accountability also receives the brief by email.
          if (recipient.seat_kind === 'committee_office' && recipient.role === 'chair' && recipient.email) {
            await dispatchNotification(base44, {
              organization_id: committee.organization_id,
              committee_id: committee.id,
              recipient_user_id: recipient.user_id,
              recipient_email: recipient.email,
              recipient_name: recipient.name,
              event_type: 'custom',
              channel: 'email',
              priority: hasOverdue ? 'high' : 'normal',
              subject_ar: brief.headline_ar,
              subject_en: brief.headline_en,
              body_ar: brief.brief_ar,
              body_en: brief.brief_en,
              source_entity_type: 'Committee',
              source_entity_id: committee.id,
              source_title: committeeName,
              deep_link: deepLink,
              correlation_id: `followup_email_${today}_${committee.id}`,
              actor_name: SYSTEM_ACTOR_EN,
            }).catch(() => null);
          }
        }

        await base44.asServiceRole.entities.AIOutputLedger.create({
          organization_id: committee.organization_id,
          committee_id: committee.id,
          output_type: 'summary',
          source_entity_type: 'Committee',
          source_entity_id: committee.id,
          source_title: committeeName,
          model_used: 'automatic',
          prompt_summary: `موجز متابعة تنفيذ القرارات — ${committeeName} (${today})، ${items.length} بندًا ضمن نافذة ${windowDays} يومًا`,
          output_summary: `${brief.headline_ar} — ${brief.brief_ar}`.slice(0, 4000),
          generated_at: now.toISOString(),
          generated_by_name: SYSTEM_ACTOR,
          status: 'generated',
        }).catch(() => null);

        await base44.asServiceRole.entities.AuditEvent.create({
          organization_id: committee.organization_id,
          committee_id: committee.id,
          actor_name: SYSTEM_ACTOR,
          action: 'ai_query',
          entity_type: 'Committee',
          entity_id: committee.id,
          entity_title: committeeName,
          description: `موجز متابعة تنفيذ آلي: ${items.length} بندًا، ${hasOverdue ? 'يشمل متأخرات' : 'دون متأخرات'}، أُرسل إلى ${recipients.length} مسؤولًا`,
          correlation_id: `followup_${today}_${committee.id}`,
        }).catch(() => null);
      }

      briefs.push({
        committee_id: committee.id,
        committee: committeeName,
        items: items.length,
        overdue_items: items.filter((i) => i.days < 0).length,
        execution_gaps: items.filter((i) => i.kind === 'execution_gap').length,
        recipients: recipients.map((r) => r.name),
        ai_generated: Boolean(brief.generated),
        headline: brief.headline_ar,
      });
    }

    return Response.json({
      status: 'ok',
      today,
      window_days: windowDays,
      dry_run: dryRun,
      committees_with_items: Object.keys(itemsByCommittee).length,
      committees_followed_up: briefs.length,
      skipped_by_cap: Math.max(0, Object.keys(recipientMap).length - committeeIds.length),
      unrouted_committees: unroutedCommittees,
      briefs,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}