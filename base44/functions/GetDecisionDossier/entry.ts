import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import {
  EVIDENCE_DOSSIER_VERSION, ROW_CAP, assembleDossier, dossierToMarkdown, dossierToPrintableHtml,
} from '../../shared/evidenceDossier.ts';

// GetDecisionDossier — the governed read behind the readable dossier (evidence-dossier-1.0.0, D-091).
//
// READ-ONLY. It reads through the SAME governed read path as every detail surface (resolvePrincipal +
// authorizeRead on the decision), so a record the requester cannot read is refused here too instead of
// being summarised into an export. The decision comes from the record itself — never from a scope in the
// payload — and the minutes are gated a SECOND time with the same rule, because a dossier must not become
// a way around the minutes' own read gate.
//
// Every read that fails names its source in `unread_sources` and marks its section unread. Nothing is
// written, and no zero is ever substituted for a source that could not be read (the D-054 rule).

const asArray = (value: any) => (Array.isArray(value) ? value : (value?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};
    const { decision_id, showcase_token } = body || {};

    if (!decision_id) return Response.json({ error: 'decision_id is required', code: 'missing_decision' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({ sr, body: { showcase_token }, callerUser });

    const decision: any = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision) return Response.json(refusalBody('not_found'), { status: 404 });

    const allowed: any = await authorizeRead({ base44, sr, principal, record: decision });
    if (!allowed.allowed) {
      return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });
    }

    const unread: any[] = [];
    const read = async (source: string, label: string, fn: () => Promise<any>) => {
      try {
        const value = await fn();
        if (value === null || value === undefined) { unread.push({ source, reason: `${label}: no value returned` }); return null; }
        return value;
      } catch (e) {
        unread.push({ source, reason: `${label}: ${(e as Error)?.message || 'read failed'}` });
        return null;
      }
    };

    const meeting = decision.meeting_id
      ? await read('meeting', 'Meeting', async () => await sr.entities.Meeting.get(decision.meeting_id))
      : null;

    const electorate = await read('electorate', 'EligibleVoterSnapshot', async () =>
      asArray(await sr.entities.EligibleVoterSnapshot.filter({ decision_id }, { sort: 'round', limit: 20 })));
    const votes = await read('votes', 'Vote', async () =>
      asArray(await sr.entities.Vote.filter({ decision_id }, { limit: 200 })));
    const circulation = await read('circulation', 'CirculationRound', async () =>
      asArray(await sr.entities.CirculationRound.filter({ decision_id }, { sort: 'round_number', limit: 20 })));
    const circulationResponses = await read('circulation_responses', 'CirculationResponse', async () =>
      asArray(await sr.entities.CirculationResponse.filter({ decision_id }, { limit: 200 })));
    const issuance = await read('issuance', 'IssueSnapshot', async () =>
      asArray(await sr.entities.IssueSnapshot.filter({ decision_id }, { sort: 'snapshot_version', limit: 10 })));
    const actions = await read('actions', 'Action', async () =>
      asArray(await sr.entities.Action.filter({ committee_id: decision.committee_id, decision_id }, { limit: 100 })));
    const auditEvents = await read('audit_events', 'AuditEvent', async () =>
      asArray(await sr.entities.AuditEvent.filter({ entity_id: decision.id, entity_type: 'Decision' }, { sort: '-created_date', limit: 100 })));

    // The minutes are gated again: the dossier is not a way around their own read rule.
    let minutes: any = null;
    if (decision.meeting_id) {
      const rows = await read('minutes', 'MeetingMinutes', async () =>
        asArray(await sr.entities.MeetingMinutes.filter({ meeting_id: decision.meeting_id }, { limit: 5 })));
      if (rows && rows.length) {
        const gate: any = await authorizeRead({ base44, sr, principal, record: rows[0] });
        if (!gate.allowed) {
          unread.push({ source: 'minutes', reason: `authorizeRead refused the minutes record: ${gate.reason}` });
          minutes = null;
        } else {
          minutes = rows;
        }
      } else if (rows) {
        minutes = [];
      }
    } else {
      unread.push({ source: 'minutes', reason: 'the decision carries no meeting, so no minutes are attached' });
    }

    const assembledAt = new Date().toISOString();
    const records: any = {
      decision,
      meeting,
      electorate,
      votes,
      circulation,
      circulation_responses: circulationResponses,
      issuance,
      actions,
      minutes,
      audit_events: auditEvents,
    };

    const dossier = assembleDossier({ decision, records, unread, assembledAt });
    const markdown = dossierToMarkdown(dossier, 'ar');
    const html = dossierToPrintableHtml(dossier, 'ar');

    return Response.json({
      status: 'ok',
      contract_version: EVIDENCE_DOSSIER_VERSION,
      decision_id,
      committee_id: decision.committee_id || null,
      assembled_at: assembledAt,
      dossier,
      markdown,
      html,
      counts: {
        electorate_rounds: (electorate || []).length,
        votes: (votes || []).length,
        circulation_rounds: (circulation || []).length,
        circulation_responses: (circulationResponses || []).length,
        issuance_snapshots: (issuance || []).length,
        actions: (actions || []).length,
        minutes: (minutes || []).length,
        audit_events: (auditEvents || []).length,
      },
      row_cap: ROW_CAP,
      unread_sources: unread,
      read_gate: { allowed: true, rank: allowed.rank ?? null },
      decided: 'read_authorized',
      writes_performed: 0,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message, contract_version: EVIDENCE_DOSSIER_VERSION, writes_performed: 0 }, { status: 500 });
  }
}