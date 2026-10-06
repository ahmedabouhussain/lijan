import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import { AUTHORITY_POLICY_VERSION } from '../../shared/authorityKernel.ts';
import { assessSeatedReadiness, summarizeReadiness, SEATED_RUNS, SEATED_READINESS_VERSION, USER_DIRECTORY_LABEL } from '../../shared/seatedReadiness.ts';

// GetSeatedActorReadiness — S22: the blocker, MEASURED instead of asserted.
//
// The register said "no authorized seated actor exists" (D-064). True, but a sentence — nothing in the
// platform could answer, from the records, which committee can run a positive round today and what is
// missing. This read answers it per committee, under the `read` right over the committee itself.
//
// It writes nothing. It computes the eligible electorate THROUGH THE VOTE COMMAND'S OWN RULE, counts a
// seat as workable only when it is bound to a real account, and names every source it could not read —
// so an unreadable committee reads 'unverifiable' rather than zero, and no run is ever reported ready
// on a source that failed to load.

const MAX_COMMITTEES = 20;
const SEAT_LIMIT = 500;
const RECUSAL_LIMIT = 200;

const asArray = (r: any) => (Array.isArray(r) ? r : (r && r.items) || []);

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = (await req.json().catch(() => ({}))) || {};
    const sr = base44.asServiceRole;

    const ids = [...new Set((Array.isArray(body.committee_ids) ? body.committee_ids : []).filter((x) => typeof x === 'string' && x))];
    if (ids.length === 0) {
      return Response.json({ error: 'Name at least one committee to measure', error_ar: 'سمِّ لجنة واحدة على الأقل للقياس', code: 'no_committee_named' }, { status: 400 });
    }
    if (ids.length > MAX_COMMITTEES) {
      return Response.json({ error: `At most ${MAX_COMMITTEES} committees in one measure`, error_ar: `الحد ${MAX_COMMITTEES} لجنة في القياس الواحد`, code: 'too_many_committees' }, { status: 400 });
    }

    // The directory is read ONCE for the whole call: "bound to an account" is checked, never assumed.
    // It cannot fail the read — a directory that could not be read is declared as an unread source and
    // makes the affected committees unmeasurable instead of silently "unbound".
    let users_known = null;
    let users_unread = null;
    try {
      const rawDirectory = await sr.entities.User.list();
      const list = asArray(rawDirectory);
      users_known = new Set(list.map((u) => u.id).filter(Boolean));
      // A PARTIAL page is not an empty directory: if the read did not exhaust the directory, the binding
      // test cannot be established, so it is declared unread rather than reporting "nobody holds a seat"
      // — the false-zero class this measure exists to prevent.
      if (!Array.isArray(rawDirectory) && rawDirectory && rawDirectory.has_more === true) {
        users_known = null;
        users_unread = USER_DIRECTORY_LABEL;
      }
    } catch (_e) {
      users_unread = USER_DIRECTORY_LABEL;
    }

    const claims = requestClaims(body);
    const day = new Date().toISOString().slice(0, 10);
    const committees = [];

    for (const id of ids) {
      const auth = await authorizeCommand(base44, {
        capability: 'read',
        target_type: 'Committee',
        target_id: id,
        ...claims,
      });
      if (!auth.allowed) {
        // A committee this caller may not read is NAMED as unread, never counted as zero.
        committees.push({
          committee_id: id,
          readable: false,
          measured: false,
          code: auth.code || null,
          status: auth.status || null,
          reason_text: { ar: auth.reason_ar || null, en: auth.reason || null },
        });
        continue;
      }

      const committee = auth.target || {};
      const unread_sources = [];

      let seats = [];
      try {
        seats = asArray(await sr.entities.CommitteeMembership.filter({ committee_id: id, status: 'active' }, { limit: SEAT_LIMIT }));
      } catch (_e) {
        unread_sources.push('CommitteeMembership (سجل المقاعد)');
      }

      let recusals = [];
      try {
        recusals = asArray(await sr.entities.Recusal.filter({ committee_id: id, status: 'active' }, { limit: RECUSAL_LIMIT }));
      } catch (_e) {
        unread_sources.push('Recusal (سجل التنحّي)');
      }

      // The institution's OWN policy row (the one SetCirculationPolicy writes, the one the round reads).
      let policy_present = null;
      let policy_unread = false;
      try {
        const rows = asArray(await sr.entities.GovernanceConfig.filter({ config_key: `circulation_policy:${id}` }, { limit: 1 }));
        const row = rows[0] || null;
        policy_present = !!(row && row.payload && row.payload.enabled === true);
      } catch (_e) {
        policy_unread = true;
      }

      // The institution's own voting basis (the row SetPrincipalBasis writes, the one every round reads).
      // No basis recorded is NOT an error here: it becomes an answer only where a dual-seat holder is
      // actually bound — otherwise it changes nothing (D-083).
      let basis = null;
      let basis_reference = null;
      try {
        const rows = asArray(await sr.entities.GovernanceConfig.filter({ config_key: `principal_basis:${id}` }, { limit: 1 }));
        const row = rows[0] || null;
        basis = row && row.payload ? row.payload.basis || null : null;
        basis_reference = row && row.payload ? row.payload.basis_reference || null : null;
      } catch (_e) {
        unread_sources.push('GovernanceConfig (أساس التصويت)');
      }

      // One open obligation is enough for the extract run; the count is never invented.
      let open_obligations = null;
      let obligations_unread = false;
      try {
        open_obligations = await sr.entities.Action.count({ committee_id: id, status: { $ne: 'closed' } });
      } catch (_e) {
        obligations_unread = true;
      }

      const assessed = assessSeatedReadiness({
        committee, seats, recusals, users_known, users_unread,
        policy_present, policy_unread, open_obligations, obligations_unread,
        basis, basis_reference,
        sources_unread: unread_sources, day,
      });

      committees.push({
        ...assessed,
        measured: true,
        committee_id: id,
        name_ar: committee.name_ar || committee.name || null,
        name_en: committee.name_en || null,
        status: committee.status || null,
      });
    }

    const summary = summarizeReadiness(committees);

    return Response.json({
      status: 'ok',
      contract_version: SEATED_READINESS_VERSION,
      generated_at: new Date().toISOString(),
      authority: { capability: 'read', policy_version: AUTHORITY_POLICY_VERSION, effective_role: null },
      day,
      runs: SEATED_RUNS.map((r) => ({
        id: r.id, ar: r.ar, en: r.en, proves_ar: r.proves_ar, proves_en: r.proves_en,
        steps: r.steps, authority_command: r.authority_command, requires: r.requires,
        precondition_ar: r.precondition_ar, precondition_en: r.precondition_en,
        enabling_ar: r.enabling_ar, enabling_en: r.enabling_en,
      })),
      committees,
      summary,
      no_write: true,
      honesty_note: {
        ar: "لا يُعلن صفر لسجل لم يُقرأ: كل مصدر فشل يُسمّى، واللجنة التي تعذّر قياسها تُقرأ «غير قابلة للقياس». والمقاعد المؤهلة تُحتسب بقاعدة التصويت نفسها، والقدرة على العمل تستلزم ارتباطًا بحساب مستخدم.",
        en: "A register that could not be read is never reported as zero: every failed source is named and the committee it affects reads 'unmeasurable'. Eligible seats come from the voting rule itself, and ability to act requires a bound user account.",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: SEATED_READINESS_VERSION }, { status: 500 });
  }
}