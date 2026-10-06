import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  evaluateConsistency, auditConsistencyContract, RECORD_CONSISTENCY_VERSION,
} from '../../shared/recordConsistency.ts';

// CheckRecordConsistency — المادة و: فحص الاتساق بين سجلات اللجنة (قراءة محكومة، بلا كتابة).
//
// What it does: reads a BOUNDED page of the records the consistency rules speak about, then evaluates
// the declared rules over them. What it never does: it writes nothing, corrects nothing, and stops
// nothing — prevention lives in the governed commands, and this report exists so a divergence between a
// record and its own rule is visible to the owner instead of being discovered by refusal.
//
// Two honesty rules, both enforced here:
//   • A source that failed to read is NAMED, and every rule that rests on it is reported as NOT
//     EVALUATED — never as "no violation". A failed read is not an absence.
//   • The read scope is declared: the per-source limit, and which sources were capped, so a partial
//     page never passes for the whole register.

const MAX_ROWS = 200;

// A record list may come back as an array or as an options-form PAGE ({items, …}): the D-086 lesson.
const rows = (r: any): any[] => (Array.isArray(r) ? r : (r?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({})) || {};

    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Committee',
      target_id: typeof body.committee_id === 'string' ? body.committee_id : '',
    });
    if (!auth.allowed) return refusalResponse(auth);

    const committeeId = auth.scope?.committee_id || body.committee_id;
    const unreadable: any[] = [];
    const capped: string[] = [];

    const read = async (source: string, promise: Promise<any>) => {
      try {
        const result = await promise;
        const list = rows(result);
        if (list.length >= MAX_ROWS) capped.push(source);
        return list;
      } catch (e) {
        unreadable.push({ source, reason: (e as Error)?.message || 'read failed' });
        return [];
      }
    };

    const [actions, decisions, snapshots, votes, attendance, rounds, electorates, handovers, dispositions, memberships] = await Promise.all([
      read('actions', base44.entities.Action.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('decisions', base44.entities.Decision.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('snapshots', base44.entities.IssueSnapshot.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('votes', base44.entities.Vote.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('attendance', base44.entities.Attendance.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('rounds', base44.entities.CirculationRound.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('electorates', base44.entities.EligibleVoterSnapshot.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('handovers', base44.entities.HandoverPack.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('dispositions', base44.entities.ChangeDisposition.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
      read('memberships', base44.entities.CommitteeMembership.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
    ]);

    const report = evaluateConsistency({
      actions, decisions, snapshots, votes, attendance, rounds, electorates, handovers, dispositions, memberships,
      unreadable,
    });

    return Response.json({
      status: 'ok',
      contract_version: RECORD_CONSISTENCY_VERSION,
      committee_id: committeeId,
      report,
      contract_check: auditConsistencyContract(),
      read_scope: {
        per_source_limit: MAX_ROWS,
        sources_read: 10 - unreadable.length,
        capped,
        unreadable,
      },
      writes_performed: 0,
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: RECORD_CONSISTENCY_VERSION }, { status: 500 });
  }
}