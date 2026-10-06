import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';
import { isSandboxCommittee } from '../../shared/ameenScopeResolver.ts';
import { DONE_STATUSES } from '../../shared/actionState.ts';
import {
  METRIC_DEFINITIONS_VERSION, DISCLOSURE_FLOOR, assessMetric, selfCheck,
} from '../../shared/metricDefinitions.ts';

// GetCommitteeMetrics — the governed read behind the metric surface (metric-definitions-1.0.0, D-088).
//
// READ-ONLY. Every figure is computed on the SERVER with `count` queries — never from a page of records
// loaded into a view, which is how the same screen could show two different percentages for the same
// committee. A count that could not be read makes its metric UNREAD and names the source: an unreadable
// source is never rendered as zero (the D-054 rule), and a figure below the disclosure floor is withheld
// with its floor named instead of being printed as a rate.
//
// Authority: the caller must hold a READ right on the committee (resolved from their own seats — never
// from an organization identifier or a role in the payload). Exploration mode resolves against the
// persona's sandbox dataset only.

const ISSUED_STATES = ['issued', 'executing', 'completed', 'closed'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const { committee_id } = body;
    const demoMode = body.demo_mode === true;

    if (!committee_id) return Response.json({ error: 'committee_id is required', code: 'missing_committee' }, { status: 400 });

    const committee: any = await sr.entities.Committee.get(committee_id).catch(() => null);
    if (!committee) return Response.json({ error: 'Committee not found', error_ar: 'اللجنة غير موجودة', code: 'not_found' }, { status: 404 });

    if (demoMode) {
      const persona = resolveDemoPersona(body.demo_persona);
      if (!persona) return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
      if (!isSandboxCommittee(committee, persona)) {
        return Response.json({ error: 'Committee is outside this exploration dataset', error_ar: 'اللجنة خارج مجموعة العرض هذه', code: 'out_of_scope', decided: 'refused_before_read' }, { status: 403 });
      }
    } else {
      const verdict: any = await resolveAuthority(base44, { capability: 'read', committee_id });
      if (!verdict.allowed) {
        return Response.json({
          error: verdict.reason || 'Read refused',
          error_ar: null,
          code: verdict.code || 'refused',
          authority_context: verdict.authority_context || null,
          policy_version: verdict.policy_version || null,
          correlation_id: verdict.correlation_id || null,
          decided: 'refused_before_read',
        }, { status: 403 });
      }
    }

    // ── Counts, each named so a failure is reported instead of becoming a zero ──
    const unreadSources: any[] = [];
    const count = async (entity: string, query: any, label: string) => {
      try {
        const n = await sr.entities[entity].count(query);
        return typeof n === 'number' ? n : null;
      } catch (e) {
        unreadSources.push({ source: label, reason: (e as Error)?.message || 'read failed' });
        return null;
      }
    };

    const today = new Date().toISOString().slice(0, 10);
    const decisionsTotal = await count('Decision', { committee_id }, 'Decision (كل القرارات)');
    const decisionsIssued = await count('Decision', { committee_id, status: { $in: ISSUED_STATES } }, 'Decision (القرارات الصادرة)');
    const decisionsPackaged = await count('Decision', { committee_id, status: { $in: ISSUED_STATES }, issuance_state: 'complete' }, 'Decision (حزم الإصدار المكتملة)');
    const actionsTotal = await count('Action', { committee_id }, 'Action (كل الإجراءات)');
    const actionsClosed = await count('Action', { committee_id, status: 'closed' }, 'Action (الإجراءات المغلقة)');
    const actionsOpen = await count('Action', { committee_id, status: { $nin: DONE_STATUSES } }, 'Action (الإجراءات المفتوحة)');
    const actionsOverdue = await count('Action', { committee_id, status: { $nin: DONE_STATUSES }, deadline: { $lt: today } }, 'Action (المفتوحة المتأخرة)');
    const evidenceAccepted = await count('Action', { committee_id, verification_state: 'accepted' }, 'Action (الأدلة المقبولة)');
    const evidenceFirstPass = await count('Action', { committee_id, verification_state: 'accepted', return_reason: { $exists: false } }, 'Action (المقبولة من أول تقديم)');
    const minutesTotal = await count('MeetingMinutes', { committee_id }, 'MeetingMinutes (كل المحاضر)');
    const minutesApproved = await count('MeetingMinutes', { committee_id, status: { $in: ['approved', 'issued'] } }, 'MeetingMinutes (المعتمدة)');

    const metrics = [
      assessMetric({ key: 'decision_issuance_rate', numerator: decisionsIssued, denominator: decisionsTotal }),
      assessMetric({ key: 'decision_package_completeness', numerator: decisionsPackaged, denominator: decisionsIssued }),
      assessMetric({ key: 'action_closure_rate', numerator: actionsClosed, denominator: actionsTotal }),
      assessMetric({ key: 'open_overdue_rate', numerator: actionsOverdue, denominator: actionsOpen }),
      assessMetric({ key: 'evidence_first_pass_rate', numerator: evidenceFirstPass, denominator: evidenceAccepted }),
      assessMetric({ key: 'minutes_approval_rate', numerator: minutesApproved, denominator: minutesTotal }),
    ];

    const summary = { computed: 0, suppressed: 0, no_records: 0, unread: 0, refused: 0 };
    for (const m of metrics) {
      if (m.state === 'computed') summary.computed += 1;
      else if (m.state === 'suppressed') summary.suppressed += 1;
      else if (m.state === 'no_records') summary.no_records += 1;
      else if (m.state === 'unread') summary.unread += 1;
      else summary.refused += 1;
    }

    return Response.json({
      status: 'ok',
      contract_version: METRIC_DEFINITIONS_VERSION,
      committee_id,
      committee_name: { ar: committee.name_ar || committee.name_en, en: committee.name_en || committee.name_ar },
      is_demo_mode: demoMode,
      computed_at: new Date().toISOString(),
      disclosure_floor: DISCLOSURE_FLOOR,
      basis: 'قراءة حيّة من سجلات اللجنة عند الطلب، ولا تُقرأ من صفحة محمَّلة في المتصفح.',
      metrics,
      summary,
      counts_performed: 11,
      unread_sources: unreadSources,
      registry_self_check: selfCheck(),
      correlation_id: null,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message, contract_version: METRIC_DEFINITIONS_VERSION }, { status: 500 });
  }
}