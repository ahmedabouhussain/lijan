import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  ANNOTATION_CONTRACT_VERSION, ANNOTATION_IDENTITY_BOUND, OFFICIAL_OUTPUT_EXCLUSION,
  anchorDigest, validateNoteInput, currentVersionOf, assessCreate, versionChange,
  noteContinuity, assessCarryForward, visibleNotes,
} from '../../shared/annotationContinuity.ts';
import { HANDOVER_EXCLUDED } from '../../shared/continuityContract.ts';
import { ACTOR_IDENTITY_REQUIRED } from '../../shared/commandGuard.ts';

// TestAnnotationContinuity — contract tests for annotation-continuity-1.0.0 (S15). Pure: no record is
// read and nothing is written. It proves the RULES the commands consume, not a persisted journey.

const DOC = 'DOC-A';
const V1 = { id: 'V1', document_id: DOC, version_number: 1, status: 'superseded', content_hash: 'sha256:aaa', file_size_bytes: 1000 };
const V2 = { id: 'V2', document_id: DOC, version_number: 2, status: 'current', content_hash: 'sha256:bbb', file_size_bytes: 1200 };
const V2_SAME = { ...V2, id: 'V2S', content_hash: 'sha256:aaa' };
const V2_NOHASH = { ...V2, id: 'V2N', content_hash: null };
const OTHER = { id: 'VX', document_id: 'DOC-B', version_number: 5, status: 'current', content_hash: 'sha256:ccc' };
const NOTE = { id: 'N1', document_id: DOC, document_version_id: 'V1', version_number: 1, author_user_id: 'U1', is_private: true, status: 'active', body: 'check clause 4' };

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const d1 = await anchorDigest('  المبلغ   ١٠٠ ريال ');
    const d2 = await anchorDigest('المبلغ 100 ريال');
    const d3 = await anchorDigest('المبلغ 200 ريال');
    const before = JSON.stringify(NOTE);
    const cfIdentical = assessCarryForward({ note: NOTE, source_version: V1, target_version: V2_SAME, existing: [] });
    const cfChanged: any = assessCarryForward({ note: NOTE, source_version: V1, target_version: V2, existing: [] });
    const vis = visibleNotes([
      { id: 'a', author_user_id: 'U1', is_private: true, status: 'active' },
      { id: 'b', author_user_id: 'U2', is_private: true, status: 'active' },
      { id: 'c', author_user_id: 'U2', is_private: false, status: 'active' },
      { id: 'd', author_user_id: 'U1', is_private: false, status: 'deleted' },
      { id: 'e', author_user_id: 'U2', status: 'active' },
    ], 'U1').map((n) => n.id).join(',');

    const cases: [string, string, boolean][] = [
      ['AC-001', 'anchor fingerprint is stable across spacing and Arabic-Indic digits', !!d1 && d1 === d2],
      ['AC-002', 'anchor fingerprint changes when an amount changes', d2 !== d3],
      ['AC-003', 'an empty anchor has no fingerprint (never a fingerprint of nothing)', (await anchorDigest('   ')) === null],
      ['AC-004', 'a note without text is refused', validateNoteInput({ body: '  ' }).code === 'body_required'],
      ['AC-005', 'an over-long note is refused', validateNoteInput({ body: 'x'.repeat(4001) }).code === 'body_too_long'],
      ['AC-006', 'an invalid page number is refused', validateNoteInput({ body: 'ok', page_number: 0 }).code === 'page_invalid'],
      ['AC-007', 'the version in force follows the document pointer', currentVersionOf({ current_version_id: 'V1' }, [V1, V2])?.id === 'V1'],
      ['AC-008', 'without a pointer, the highest non-archived version is in force', currentVersionOf({}, [V1, V2])?.id === 'V2'],
      ['AC-009', 'a new note on a superseded version is refused', assessCreate({ version: V1, current: V2 }).code === 'version_superseded'],
      ['AC-010', 'a new note on the version in force is accepted', assessCreate({ version: V2, current: V2 }).ok === true],
      ['AC-011', 'a note on the version in force reads as current', noteContinuity({ ...NOTE, document_version_id: 'V2' }, { V1, V2 }, V2).state === 'current'],
      ['AC-012', 'a note on an older version stays there and names the change', (() => { const c: any = noteContinuity(NOTE, { V1, V2 }, V2); return c.state === 'superseded' && c.on_version === 1 && c.change.state === 'changed'; })()],
      ['AC-013', 'a note whose version cannot be read is reported, never moved', noteContinuity({ ...NOTE, document_version_id: 'GONE' }, { V1, V2 }, V2).state === 'version_unavailable'],
      ['AC-014', 'a legacy note with no version is reported as unbound', noteContinuity({ ...NOTE, document_version_id: null }, { V1 }, V1).state === 'unbound_legacy'],
      ['AC-015', 'identical fingerprints are the only basis for "unchanged"', versionChange(V1, V2_SAME).state === 'identical'],
      ['AC-016', 'a missing fingerprint is unknown, never identical', versionChange(V1, V2_NOHASH).state === 'unknown'],
      ['AC-017', 'carrying to identical content is marked identical_content', (cfIdentical as any).reanchor_state === 'identical_content'],
      ['AC-018', 'carrying to changed content is flagged unverified, not silently re-anchored', cfChanged.reanchor_state === 'unverified'],
      ['AC-019', 'a note is carried only to a NEWER version', assessCarryForward({ note: { ...NOTE, document_version_id: 'V2' }, source_version: V2, target_version: V1 }).code === 'not_newer_version'],
      ['AC-020', 'a note is never carried to another document', assessCarryForward({ note: NOTE, source_version: V1, target_version: OTHER }).code === 'other_document'],
      ['AC-021', 'a resolved note is not carried forward', assessCarryForward({ note: { ...NOTE, status: 'resolved' }, source_version: V1, target_version: V2 }).code === 'not_active'],
      ['AC-022', 'a repeated carry-forward returns the first copy (no duplicate)', (assessCarryForward({ note: NOTE, source_version: V1, target_version: V2, existing: [{ id: 'C1', carried_from_annotation_id: 'N1', document_version_id: 'V2', status: 'active' }] }) as any).existing_id === 'C1'],
      ['AC-023', 'assessment never mutates the original note', JSON.stringify(NOTE) === before],
      ['AC-024', 'visibility: own notes (any) + others\u2019 shared only; deleted and unmarked private excluded', vis === 'a,c'],
      ['AC-025', 'private notes are excluded from every official output and from handover', OFFICIAL_OUTPUT_EXCLUSION.private_notes === true && HANDOVER_EXCLUDED.some((x: any) => x.key === 'private_notes')],
      ['AC-026', 'the guard binds annotation.own to the author (read from this contract)', ANNOTATION_IDENTITY_BOUND['annotation.own'] === 'author_user_id' && (ACTOR_IDENTITY_REQUIRED as any)['annotation.own'] === 'author_user_id'],
    ];

    const rows = cases.map(([id, label, passed]) => ({ test_id: id, label, passed }));
    const failed = rows.filter((r) => !r.passed);
    return Response.json({
      contract_version: ANNOTATION_CONTRACT_VERSION,
      total: rows.length, passed: rows.length - failed.length, failed: failed.length,
      verdict: failed.length === 0 ? 'PASS' : 'FAIL',
      failures: failed, writes_performed: 0, records_read: 0, rows,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}