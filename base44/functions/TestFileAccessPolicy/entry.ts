import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { evaluateAccess, type ActorDescriptor } from '../../shared/fileAccessPolicy.ts';

/**
 * TestFileAccessPolicy — isolation self-test for the governed file path.
 *
 * The environment cannot open a second authenticated session, so this test uses
 * LIMITED SYNTHETIC ACTORS (never real user identities, never operational data
 * writes) and runs them through the same decision engine the server gate uses.
 * It is read-only: the only record it touches is an optional read of a real
 * record's shape, and it never mints or returns a link.
 */

const SYNTHETIC: Array<{ key: string; expect: string; actor: ActorDescriptor }> = [
  { key: 'anonymous', expect: 'deny:unauthenticated', actor: { kind: 'anonymous' } },
  {
    key: 'other_org_member',
    expect: 'deny:out_of_scope',
    actor: { kind: 'synthetic', user_id: 'test-other-org', email: 'test.other.org@example.invalid', active_org_id: 'org-test-other', platform_role: 'user', memberships: [] },
  },
  {
    key: 'other_committee_member',
    expect: 'deny:not_a_member',
    actor: { kind: 'synthetic', user_id: 'test-other-committee', email: 'test.other.committee@example.invalid', active_org_id: 'MATCH_ORG', platform_role: 'user', memberships: [] },
  },
  {
    key: 'revoked_member',
    expect: 'deny:membership_not_active',
    actor: {
      kind: 'synthetic',
      user_id: 'test-resigned',
      email: 'test.resigned@example.invalid',
      active_org_id: 'MATCH_ORG',
      platform_role: 'user',
      memberships: [{ committee_id: 'MATCH_COMMITTEE', role: 'member', status: 'resigned', user_id: 'test-resigned' }],
    },
  },
  {
    key: 'active_member_internal',
    expect: 'allow:member_member',
    actor: {
      kind: 'synthetic',
      user_id: 'test-member',
      email: 'test.member@example.invalid',
      active_org_id: 'MATCH_ORG',
      platform_role: 'user',
      memberships: [{ committee_id: 'MATCH_COMMITTEE', role: 'member', status: 'active', user_id: 'test-member' }],
    },
  },
  {
    key: 'member_on_highly_restricted',
    expect: 'deny:insufficient_role',
    actor: {
      kind: 'synthetic',
      user_id: 'test-member',
      email: 'test.member@example.invalid',
      active_org_id: 'MATCH_ORG',
      platform_role: 'user',
      memberships: [{ committee_id: 'MATCH_COMMITTEE', role: 'member', status: 'active', user_id: 'test-member' }],
    },
    classification: 'highly_restricted',
  } as any,
  {
    key: 'chair_on_highly_restricted',
    expect: 'allow:member_chair',
    actor: {
      kind: 'synthetic',
      user_id: 'test-chair',
      email: 'test.chair@example.invalid',
      active_org_id: 'MATCH_ORG',
      platform_role: 'user',
      memberships: [{ committee_id: 'MATCH_COMMITTEE', role: 'chair', status: 'active', user_id: 'test-chair' }],
    },
    classification: 'highly_restricted',
  } as any,
  {
    key: 'share_confidential_without_purpose',
    expect: 'deny:purpose_required',
    actor: {
      kind: 'synthetic',
      user_id: 'test-chair',
      email: 'test.chair@example.invalid',
      active_org_id: 'MATCH_ORG',
      platform_role: 'user',
      memberships: [{ committee_id: 'MATCH_COMMITTEE', role: 'chair', status: 'active', user_id: 'test-chair' }],
    },
    classification: 'confidential',
    action: 'share',
  } as any,
  {
    key: 'uploader_draft_owner',
    expect: 'allow:uploader_draft',
    actor: { kind: 'synthetic', user_id: 'test-uploader', email: 'test.uploader@example.invalid', platform_role: 'user', memberships: [] },
    uploader_owned: true,
  } as any,
];

export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const caller = await base44.auth.me().catch(() => null);
  if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Optional real record, read-only, used only for its scope fields and classification.
  let record: Record<string, any> | null = null;
  if (body.entity_type && body.entity_id) {
    record = await base44.asServiceRole.entities[body.entity_type]?.get(body.entity_id).catch(() => null);
  }
  const scenario = {
    record: record || { id: 'synthetic', organization_id: 'MATCH_ORG', committee_id: 'MATCH_COMMITTEE', classification: 'internal' },
    refField: body.ref_field || 'file_url',
    refValue: body.ref_value_kind === 'legacy' ? 'https://legacy.example.invalid/old.pdf' : 'private/synthetic/probe.pdf',
    record_real: Boolean(record),
  };

  const results = SYNTHETIC.map((item) => {
    const classification = (item as any).classification || scenario.record.classification || 'internal';
    const verdict = evaluateAccess({
      actor: item.actor,
      refField: scenario.refField,
      refValue: scenario.refValue,
      record: { ...scenario.record, classification },
      classification,
      action: (item as any).action || 'preview',
      purpose: '',
      uploaderOwned: (item as any).uploader_owned === true,
    });
    const observed = verdict.decision === 'allow' ? `allow:${verdict.reason}` : `deny:${verdict.reason}`;
    return { actor: item.key, expected: item.expect, observed, pass: observed === item.expect };
  });

  // Legacy policy: a sensitive field holding a public link is never served.
  const legacy = evaluateAccess({
    actor: { kind: 'synthetic', user_id: 'test-chair', email: 't@example.invalid', active_org_id: 'MATCH_ORG', platform_role: 'user', memberships: [{ committee_id: 'MATCH_COMMITTEE', role: 'chair', status: 'active' }] },
    refField: scenario.refField,
    refValue: 'https://legacy.example.invalid/old.pdf',
    record: scenario.record,
    action: 'preview',
  });

  // Public asset policy: an approved logo field is not a governed file.
  const publicAsset = evaluateAccess({
    actor: { kind: 'synthetic', user_id: 'test-chair', email: 't@example.invalid', active_org_id: 'MATCH_ORG', platform_role: 'user', memberships: [] },
    refField: 'logo_url',
    refValue: 'https://media.example/logo.png',
    record: scenario.record,
    action: 'preview',
  });

  return Response.json({
    ran_with_real_record: scenario.record_real,
    actors: results,
    all_passed: results.every((r) => r.pass),
    legacy_field_state: legacy.state || legacy.reason,
    legacy_never_served: legacy.decision !== 'allow',
    public_asset_state: publicAsset.state || publicAsset.reason,
    public_asset_not_signed: publicAsset.decision !== 'allow',
    note: 'Synthetic actors only. No link was minted and no operational record was modified.',
  });
}