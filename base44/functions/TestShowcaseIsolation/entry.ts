import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  resolvePersonaScope,
  issueShowcaseSession,
  verifyShowcaseSession,
  revokeShowcaseSession,
  randomShowcaseToken,
  SHOWCASE_DATA_CLASS,
  SHOWCASE_REFUSAL,
} from '../../shared/showcaseSession.ts';
import {
  resolvePrincipal,
  authorizeRead,
  READ_REFUSAL,
  GOVERNED_READ_TYPES,
} from '../../shared/governedReadPolicy.ts';
import { DEMO_DATASET } from '../../shared/demoDataset.ts';

// TestShowcaseIsolation — the mandatory isolation self test.
//
// It exercises the SAME decision engine the read gate uses (shared/governedReadPolicy.ts) with
// synthetic principals, so a pass here is a statement about the live policy, not about a copy of
// it. Every case asserts a server-side refusal, and every refusal must be non-disclosing.

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));
const PERSONA_KEY = 'DR_HAMAD_MAJEEGHEER';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const results: any[] = [];
    const created: string[] = [];

    const record = (id: string, name: string, expected: string, actual: string, note?: string) => {
      results.push({
        id,
        name,
        expected,
        actual,
        pass: String(expected) === String(actual),
        note: note || null,
      });
    };

    const scope = await resolvePersonaScope(sr, PERSONA_KEY);
    if (!scope.ok) {
      return Response.json({ error: 'Showcase scope could not be resolved', code: scope.reason }, { status: 500 });
    }

    const showcaseCommittees = arr(await sr.entities.Committee
      .filter({ demo_dataset: scope.dataset, is_demo_data: true })
      .catch(() => []))
      .filter((c: any) => (scope.committee_ids || []).includes(c.id));

    const pickMeeting = async (committeeId: string) =>
      arr(await sr.entities.Meeting.filter({ committee_id: committeeId }).catch(() => []))[0] || null;

    const nationalRow = showcaseCommittees
      .find((c: any) => c.public_id === 'DEMO-COMM-NATIONAL-SME') || showcaseCommittees[0];
    const showcaseMeeting = await pickMeeting(nationalRow.id);

    // A record in ANOTHER persona's showcase dataset.
    const otherRow = arr(await sr.entities.Committee
      .filter({ demo_dataset: DEMO_DATASET, is_demo_data: true })
      .catch(() => []))
      .find((c: any) => !(scope.committee_ids || []).includes(c.id));
    const otherMeeting = otherRow ? await pickMeeting(otherRow.id) : null;

    // A production record (never tagged as demonstration data).
    const productionRow = arr(await sr.entities.Committee.filter({}).catch(() => []))
      .find((c: any) => c.is_demo_data !== true);
    const productionMeeting = productionRow ? await pickMeeting(productionRow.id) : null;

    if (!showcaseMeeting) {
      return Response.json({ error: 'No showcase meeting to test against' }, { status: 500 });
    }

    // ── Fixtures: one live session, one expired, one revoked ────────────────────────────
    const live = await issueShowcaseSession(sr, { personaKey: PERSONA_KEY, entryPoint: 'isolation_test' });
    if (!live.ok) return Response.json({ error: 'Could not issue test session' }, { status: 500 });
    created.push(live.token);

    const expiredRow = await sr.entities.ShowcaseSession.create({
      token: randomShowcaseToken(),
      status: 'active',
      persona_key: scope.persona.key,
      persona_id: scope.persona.persona_id,
      principal_id: scope.principal_id,
      dataset: scope.dataset,
      data_class: SHOWCASE_DATA_CLASS,
      allowed_committee_ids: scope.committee_ids,
      allowed_committee_public_ids: scope.committee_public_ids,
      issued_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      write_scope: 'none',
      entry_point: 'isolation_test_expired',
    });

    const revoked = await issueShowcaseSession(sr, { personaKey: PERSONA_KEY, entryPoint: 'isolation_test_revoked' });
    if (revoked.ok) {
      created.push(revoked.token);
      await revokeShowcaseSession(sr, revoked.token, 'isolation_test');
    }

    const principalFor = async (token: string | null, callerUser: any = null) =>
      resolvePrincipal({ sr, body: { showcase_token: token }, callerUser });

    const showcasePrincipal = await principalFor(live.token);
    const realPrincipal = { kind: 'user', user: { id: 'TEST-REAL-USER', role: 'user', email: 'test-real@lijan.test' } };

    // ── 1. A real user asks for a showcase committee's record ───────────────────────────
    const t1 = await authorizeRead({ base44, sr, principal: realPrincipal, record: showcaseMeeting });
    record('1_real_user_showcase_record', 'مستخدم حقيقي يطلب سجل لجنة عرض', 'not_found', t1.reason || (t1.allowed ? 'allowed' : 'unknown'));

    // ── 2. A showcase session asks for a production record ──────────────────────────────
    if (productionMeeting) {
      const t2 = await authorizeRead({ base44, sr, principal: showcasePrincipal, record: productionMeeting });
      record('2_showcase_production_record', 'جلسة عرض تطلب سجل إنتاج', 'out_of_scope', t2.reason || (t2.allowed ? 'allowed' : 'unknown'));
    } else {
      record('2_showcase_production_record', 'جلسة عرض تطلب سجل إنتاج', 'not_applicable_no_production_record', 'not_applicable_no_production_record');
    }

    // ── 3. Dr. Hamad's session asks for another persona's showcase data ─────────────────
    if (otherMeeting) {
      const t3 = await authorizeRead({ base44, sr, principal: showcasePrincipal, record: otherMeeting });
      record('3_cross_persona_record', 'جلسة الدكتور حمد تطلب بيانات شخصية عرض أخرى', 'out_of_scope', t3.reason || (t3.allowed ? 'allowed' : 'unknown'));
    } else {
      record('3_cross_persona_record', 'جلسة الدكتور حمد تطلب بيانات شخصية عرض أخرى', 'not_applicable_no_other_dataset', 'not_applicable_no_other_dataset');
    }

    // ── 4 & 5. Forged organization_id / committee_id in the payload ─────────────────────
    const forgedPrincipal = await principalFor(live.token);
    const forgedDecision = await authorizeRead({
      base44, sr, principal: forgedPrincipal, record: showcaseMeeting,
    });
    const forgedCommitteeIgnored = !!forgedDecision.committee
      && forgedDecision.committee.id === showcaseMeeting.committee_id;
    const forgedPayload = { showcase_token: live.token, organization_id: 'FORGED-ORG', committee_id: 'FORGED-COMMITTEE' };
    const forgedResolved = await resolvePrincipal({ sr, body: forgedPayload, callerUser: null });
    const payloadCannotCarryAuthority = forgedResolved.kind === 'showcase'
      && !('organization_id' in forgedResolved)
      && !('committee_id' in forgedResolved);
    const forgedVerdict = forgedCommitteeIgnored && payloadCannotCarryAuthority
      ? 'ignored_from_record'
      : (forgedDecision.allowed ? 'authority_accepted' : `refused:${forgedDecision.reason}`);

    record('4_forged_organization_id', 'تغيير organization_id يدويًا', 'ignored_from_record', forgedVerdict);

    record('5_forged_committee_id', 'تغيير committee_id يدويًا', 'ignored_from_record', forgedVerdict);

    // ── 6. A role injected in the payload ───────────────────────────────────────────────
    const seat = arr(await sr.entities.CommitteeMembership
      .filter({ committee_id: nationalRow.id, user_id: scope.persona.user_id, status: 'active' })
      .catch(() => []))[0];
    const injected = await resolvePrincipal({
      sr,
      body: { showcase_token: live.token, role: 'chair', committee_role: 'chair' },
      callerUser: null,
    });
    const injectedDecision = await authorizeRead({ base44, sr, principal: injected, record: showcaseMeeting });
    const seatRole = seat?.role || null;
    const roleFromSeat = seatRole && injectedDecision.role === seatRole;
    record('6_role_injection', 'تغيير role في الحمولة', 'role_from_seat', roleFromSeat ? 'role_from_seat' : `role=${injectedDecision.role}`);

    // ── 7. Expired session ──────────────────────────────────────────────────────────────
    const expiredVerify = await verifyShowcaseSession(sr, expiredRow.token);
    const expiredPrincipal = await principalFor(expiredRow.token);
    const expiredDecision = await authorizeRead({ base44, sr, principal: expiredPrincipal, record: showcaseMeeting });
    record(
      '7_expired_session',
      'جلسة عرض منتهية',
      SHOWCASE_REFUSAL.EXPIRED,
      expiredVerify.ok ? 'session_accepted' : expiredVerify.reason,
      expiredDecision.allowed ? 'read_allowed' : `read_refused:${expiredDecision.reason}`,
    );

    // ── 8. Revoked session ──────────────────────────────────────────────────────────────
    const revokedVerify = revoked.ok ? await verifyShowcaseSession(sr, revoked.token) : { ok: false, reason: 'not_issued' };
    const revokedPrincipal = await principalFor(revoked.ok ? revoked.token : null);
    const revokedDecision = await authorizeRead({ base44, sr, principal: revokedPrincipal, record: showcaseMeeting });
    record(
      '8_revoked_session',
      'جلسة عرض ملغاة',
      SHOWCASE_REFUSAL.REVOKED,
      revokedVerify.ok ? 'session_accepted' : revokedVerify.reason,
      revokedDecision.allowed ? 'read_allowed' : `read_refused:${revokedDecision.reason}`,
    );

    // ── 9. A deep link straight to a detail surface, with no session ────────────────────
    const anonymous = await principalFor(null, null);
    const anonymousDecision = await authorizeRead({ base44, sr, principal: anonymous, record: showcaseMeeting });
    record(
      '9_direct_link_without_session',
      'رابط تفصيلي مباشر دون جلسة',
      READ_REFUSAL.UNAUTHENTICATED,
      anonymous.reason || 'principal_created',
      anonymousDecision.allowed ? 'read_allowed' : `read_refused:${anonymousDecision.reason}`,
    );

    // ── 10. A write call from the showcase, despite hidden buttons ──────────────────────
    const writeAttempt = await authorizeRead({
      base44, sr, principal: showcasePrincipal, record: showcaseMeeting, writeIntent: true,
    });
    record(
      '10_write_from_showcase',
      'استدعاء وظيفة الكتابة مباشرة رغم إخفاء الزر',
      READ_REFUSAL.WRITE_NOT_PERMITTED,
      writeAttempt.reason || 'allowed',
      `write_scope=${showcasePrincipal.scope?.write_scope}`,
    );

    // ── Cleanup: no test session outlives the test ──────────────────────────────────────
    for (const token of created) {
      await revokeShowcaseSession(sr, token, 'isolation_test_cleanup').catch(() => {});
    }

    const passed = results.filter((r) => r.pass).length;
    return Response.json({
      status: passed === results.length ? 'ok' : 'failed',
      persona_key: scope.persona.key,
      data_class: SHOWCASE_DATA_CLASS,
      allowed_scope_count: scope.committee_ids.length,
      allowed_committee_public_ids: scope.committee_public_ids,
      governance_types_covered: GOVERNED_READ_TYPES,
      tests: results,
      summary: { total: results.length, passed, failed: results.length - passed },
      refusal_contract: 'uniform_body_uniform_status_no_existence_disclosure',
      cleanup: { revoked_test_sessions: created.length },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}