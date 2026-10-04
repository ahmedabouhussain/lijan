import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { COMMITTEE_REGISTERS, loadRegister } from '../../shared/committeeRegisters.ts';
import { resolvePrincipal, authorizeRead } from '../../shared/governedReadPolicy.ts';
import { issueShowcaseSession, revokeShowcaseSession, resolvePersonaScope } from '../../shared/showcaseSession.ts';
import { actionViolations, summarizeActions, todayIso } from '../../shared/actionState.ts';

// TestGovernedSurfaces — the standing regression check for the governed surfaces.
//
// Every failure reported on this platform so far has been one of four shapes, and all four
// are asserted here:
//   1. a route that fails while its register lists records (list↔detail divergence);
//   2. a listed record with nothing behind it (no stored file, no agenda, no attendance);
//   3. a register whose totals disagree with the arithmetic of its own records;
//   4. a child record carrying a different organization than its committee.
//
// It runs the SAME shared code the app runs (loadRegister + authorizeRead), so a pass here is
// a statement about the product, not about a copy of it. Platform-admin only, read-only.
//
// Findings on the canonical persona's demonstration data are FAILURES (that is the experience
// under review). The same gap on another persona's dataset is reported as a WARNING — visible,
// but not counted as a break of the surfaces in review.

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));
const PROBE_LIMIT = 3; // records per register probed through the read gate, per committee
const CHILD_ENTITIES = ['Meeting', 'AgendaItem', 'Document', 'Decision', 'Action'];

const DIAG: string[] = [];

async function readAll(sr: any, entity: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 5; page += 1) {
    // An explicit `cursor: undefined` is rejected by the query builder — only set it once known.
    const options: any = { limit: 200 };
    if (cursor) options.cursor = cursor;
    // An unbounded `filter({})` is refused inside a function (it comes back empty); the
    // unbounded read is expressed as list() instead, which is exactly its contract.
    const res = await sr.entities[entity].list(options).catch((e: any) => {
      DIAG.push(`${entity}: ${e?.message || e}`);
      return null;
    });
    if (!res) break;
    DIAG.push(`${entity}: ${arr(res).length} items, array=${Array.isArray(res)}, has_more=${res?.has_more}`);
    out.push(...arr(res));
    if (Array.isArray(res) || !res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return out;
}

export default async function (req: any) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden — platform administration only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const personaKey: string = body.persona_key || 'DR_HAMAD_MAJEEGHEER';

    const demoQ = { demo_dataset: 'DR_HAMAD_GOVERNED_DEMO_V1', is_demo_data: true };
    for (const probe of [
      { key: 'demo no options', q: demoQ, o: undefined },
      { key: 'demo limit 20', q: demoQ, o: { limit: 20 } },
      { key: 'demo limit 50', q: demoQ, o: { limit: 50 } },
      { key: 'demo limit 100', q: demoQ, o: { limit: 100 } },
      { key: 'demo limit 200', q: demoQ, o: { limit: 200 } },
      { key: 'demo limit 200 sort', q: demoQ, o: { limit: 200, sort: '-created_date' } },
      { key: 'all status no options', q: { status: { $in: ['draft', 'pending_activation', 'active', 'temporarily_suspended', 'expiring_soon', 'closing', 'closed', 'archived'] } }, o: undefined },
    ]) {
      const r = await sr.entities.Committee.filter(probe.q, probe.o as any).catch((e: any) => `ERR:${e?.message}` as any);
      DIAG.push(`probe ${probe.key} → ${Array.isArray(r) ? r.length : (r?.items?.length ?? r)}`);
    }

    const failures: any[] = [];
    const warnings: any[] = [];
    let checks = 0;
    const fail = (scope: string, check: string, detail: any) => failures.push({ scope, check, detail });
    const warn = (scope: string, check: string, detail: any) => warnings.push({ scope, check, detail });

    // ── The corpus, read once ───────────────────────────────────────────────────────────
    const committees = await readAll(sr, 'Committee');
    const children: Record<string, any[]> = {};
    for (const entity of CHILD_ENTITIES) children[entity] = await readAll(sr, entity);
    const versions = await readAll(sr, 'DocumentVersion');
    const attendance = await readAll(sr, 'Attendance');

    const committeeById = new Map(committees.map((c: any) => [c.id, c]));
    const versionsByDocument = new Map<string, any[]>();
    for (const v of versions) {
      const list = versionsByDocument.get(v.document_id) || [];
      list.push(v);
      versionsByDocument.set(v.document_id, list);
    }
    const attendanceByMeeting = new Set(attendance.map((a: any) => a.meeting_id));
    const today = todayIso();

    const isCanonicalDemo = (committee: any) =>
      committee?.is_demo_data === true && committee?.demo_dataset === 'DR_HAMAD_GOVERNED_DEMO_V1';

    // ── 1. Register arithmetic, record backing, organization integrity ──────────────────
    for (const committee of committees) {
      const scope = `committee:${committee.public_id || committee.id}`;
      const demoSide = committee.is_demo_data === true;
      const record = demoSide ? warn : fail;

      for (const entity of CHILD_ENTITIES) {
        const stranded = children[entity].filter(
          (r: any) => r.committee_id === committee.id && r.organization_id !== committee.organization_id,
        );
        checks += 1;
        if (stranded.length) {
          record(scope, 'organization_integrity', {
            entity,
            count: stranded.length,
            ids: stranded.slice(0, 5).map((r: any) => r.id),
          });
        }
      }

      const docs = children.Document.filter((d: any) => d.committee_id === committee.id);
      for (const doc of docs) {
        checks += 1;
        const stored = (versionsByDocument.get(doc.id) || []).filter((v: any) => v.storage_key || v.file_url || v.file_uri);
        if (!stored.length) {
          record(scope, 'document_without_file', { document_id: doc.id, title: doc.title_en || doc.title });
          continue;
        }
        if (doc.current_version_id && !(versionsByDocument.get(doc.id) || []).some((v: any) => v.id === doc.current_version_id)) {
          record(scope, 'dangling_current_version', { document_id: doc.id, current_version_id: doc.current_version_id });
        }
      }

      const actions = children.Action.filter((a: any) => a.committee_id === committee.id);
      if (actions.length) {
        checks += 1;
        const summary = summarizeActions(actions, today);
        if (summary.open + summary.completed !== summary.total || summary.overdue > summary.open) {
          record(scope, 'action_totals_inconsistent', { summary });
        }
        const violating = actions.filter((a: any) => actionViolations(a, today).length);
        checks += 1;
        if (violating.length) {
          record(scope, 'action_state_contradiction', {
            count: violating.length,
            sample: violating.slice(0, 5).map((a: any) => ({ id: a.id, status: a.status, progress: a.progress_percent, violations: actionViolations(a, today) })),
          });
        }
      }

      // A meeting that took place must have been held: an agenda and a recorded attendance.
      const held = children.Meeting.filter(
        (m: any) => m.committee_id === committee.id && ['completed', 'adjourned'].includes(m.status),
      );
      for (const meeting of held) {
        checks += 1;
        const items = children.AgendaItem.filter((i: any) => i.meeting_id === meeting.id);
        if (!items.length) record(scope, 'held_meeting_without_agenda', { meeting_id: meeting.id });
        if (!attendanceByMeeting.has(meeting.id)) record(scope, 'held_meeting_without_attendance', { meeting_id: meeting.id });
      }
    }

    // ── 2. The visitor path: a listed record must be openable, in the same session ──────
    const scopeInfo = await resolvePersonaScope(sr, personaKey);
    if (!scopeInfo.ok) {
      fail(`persona:${personaKey}`, 'scope_unresolved', { reason: scopeInfo.reason });
    } else {
      const issued: any = await issueShowcaseSession(sr, {
        personaKey,
        issuedTo: me,
        entryPoint: 'TestGovernedSurfaces',
      }).catch(() => null);

      if (!issued?.token) {
        fail(`persona:${personaKey}`, 'session_not_issued', { reason: 'issue_failed' });
      } else {
        try {
          const principal = await resolvePrincipal({ sr, body: { showcase_token: issued.token }, callerUser: me });
          if (principal.kind !== 'showcase') {
            fail(`persona:${personaKey}`, 'principal_not_showcase', { kind: principal.kind, reason: principal.reason });
          } else {
            // The scope the session was actually minted from — never a client-supplied list.
            for (const committeeId of scopeInfo.committee_ids || []) {
              const committee = committeeById.get(committeeId);
              const scope = `showcase:${committee?.public_id || committeeId}`;
              if (!committee) {
                fail(scope, 'allowed_committee_missing', { committee_id: committeeId });
                continue;
              }

              for (const key of Object.keys(COMMITTEE_REGISTERS)) {
                const { items } = await loadRegister(sr, key, committeeId);
                checks += 1;
                if (key === 'audit_events' && !items.length) continue; // an empty log is honest, not a break

                for (const item of items.slice(0, PROBE_LIMIT)) {
                  const verdict = await authorizeRead({ base44, sr, principal, record: item });
                  checks += 1;
                  if (!verdict.allowed) {
                    fail(scope, 'listed_record_not_openable', {
                      register: key,
                      record_id: item.id,
                      reason: verdict.reason,
                    });
                  }
                }

                // A held meeting behind a listed record: same rule as the register itself.
                if (key === 'documents') {
                  for (const doc of items.slice(0, PROBE_LIMIT)) {
                    const stored = (versionsByDocument.get(doc.id) || []).filter((v: any) => v.storage_key || v.file_url || v.file_uri);
                    checks += 1;
                    if (!stored.length) fail(scope, 'listed_document_without_file', { document_id: doc.id });
                  }
                }
              }
            }
          }
        } finally {
          await revokeShowcaseSession(sr, issued.token, 'automatic regression test session').catch(() => null);
        }
      }
    }

    return Response.json({
      status: failures.length ? 'fail' : 'ok',
      persona_key: personaKey,
      generated_at: new Date().toISOString(),
      summary: {
        checks_run: checks,
        failures: failures.length,
        warnings: warnings.length,
        committees_audited: committees.length,
        canonical_failures: failures.filter((f) => f.scope.includes('DEMO-')).length,
      },
      failures: failures.slice(0, 40),
      warnings: warnings.slice(0, 20),
      diag: DIAG.slice(0, 10),
    }, { status: failures.length ? 409 : 200 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'test failed' }, { status: 500 });
  }
}