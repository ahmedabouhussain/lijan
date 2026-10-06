import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { CHAINS, CHAIN_KEYS, AUDIT_CHAIN_VERSION, buildChain, trailVerdict, refusal } from '../../shared/auditChain.ts';

// GetRecordAuditTrail — G-5: the audit trail of ONE record as a chain, not as a list of rows.
//
// Governed read: the `read` right over the committee the subject belongs to. The subject record is
// loaded first so its committee is DERIVED from the record (never taken from the request), and the
// audit rows are read from that committee scope.
//
// Three rules the code enforces rather than describes:
//   • A read failure is reported with the source it belongs to: an empty trail is never returned for a
//     trail that could not be read.
//   • The chain is built by the contract, which reports an absent required step as a NAMED GAP and an
//     out-of-order event as such — nothing is inferred and nothing is re-sorted to read well.
//   • The response carries the contract's own caution: a trail shows what was recorded and proves
//     nothing about what did not happen.
//
// It writes nothing.

const MAX_EVENTS = 300;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};

    const chainKey = typeof body.chain === 'string' ? body.chain : 'decision';
    const spec = CHAINS[chainKey];
    if (!spec) {
      const r = refusal('chain_unknown', { supported: CHAIN_KEYS });
      return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code, supported: CHAIN_KEYS }, { status: r.status });
    }
    const subjectId = typeof body.subject_id === 'string' ? body.subject_id : (typeof body.entity_id === 'string' ? body.entity_id : '');
    if (!subjectId) {
      const r = refusal('subject_required');
      return Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code }, { status: r.status });
    }

    // Authority is established BEFORE anything is loaded, on the committee the caller names: a request
    // can then never be used to probe whether a record exists. The subject is read afterwards and its
    // OWN committee must agree with the committee the act was authorized on — a trail is never built
    // across a committee boundary.
    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Committee',
      target_id: typeof body.committee_id === 'string' ? body.committee_id : '',
    });
    if (!auth.allowed) return refusalResponse(auth);
    const derived = auth.trusted_target.derived_committee_id;

    const subject = await sr.entities[spec.subject].get(subjectId).catch(() => null);
    if (!subject) return Response.json({ error: 'The record whose trail was requested does not exist', error_ar: 'السجل المطلوب أثره غير موجود', code: 'subject_not_found' }, { status: 404 });
    if (subject.committee_id && subject.committee_id !== derived) {
      return Response.json({
        error: 'The record belongs to another committee, so no trail was built for it',
        error_ar: 'السجل يخصّ لجنة أخرى، ولم يُبنَ له أثر هنا',
        code: 'subject_out_of_scope',
      }, { status: 403 });
    }

    let rows = null;
    let unread = null;
    try {
      const res = await sr.entities.AuditEvent.filter({ committee_id: derived, entity_id: subjectId }, { limit: MAX_EVENTS, sort: 'created_date' });
      rows = Array.isArray(res) ? res : (res?.items || []);
      if (rows.length >= MAX_EVENTS) unread = { source: 'AuditEvent (bounded read)', reason: `the read stopped at ${MAX_EVENTS} events, so the trail is reported as incomplete rather than as complete` };
    } catch (e) {
      unread = { source: 'AuditEvent', reason: e?.message || 'read failed' };
    }

    const chain = buildChain({ chain: chainKey, events: rows || [], unread });

    return Response.json({
      status: 'ok',
      committee: { id: derived },
      authority: { capability: 'read', policy_version: auth.policy_version, effective_role: auth.effective_role },
      subject: {
        id: subjectId, type: spec.subject,
        title: subject.title_ar || subject.title || null,
        status: subject.status || null,
      },
      ...chain,
      verdict_line: trailVerdict(chain),
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: AUDIT_CHAIN_VERSION }, { status: 500 });
  }
}