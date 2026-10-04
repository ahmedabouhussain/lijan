import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { issueShowcaseSession, resolvePersonaForDataset } from '../../shared/showcaseSession.ts';

// EnterExploration — the governed transition from a real account to the isolated exploration session.
//
// Founder decision (2026-10-04): a real account NEVER reads a demonstration record, and an
// administrator is not an exception. When such a link is opened, the server mints an exploration
// session instead, and the caller is returned to the SAME record inside it.
//
// Nothing in the request selects the persona, the dataset or the committee scope. The path only
// names the target; the committee is resolved from it here, the persona is resolved from that
// committee's dataset, and the scope is whatever the issue step grants. A target outside that
// granted scope is refused — a link can never widen the session it creates.

// One app-relative committee path, nothing else: no absolute URL, no protocol, no traversal.
const COMMITTEE_PATH = /^\/o\/[A-Za-z0-9_.~%-]+\/c\/([A-Za-z0-9_.~%-]+)(?:\/[A-Za-z0-9_.~%/-]*)?$/;

const refuse = (code: string, status = 404) =>
  Response.json({ error: 'Not available', code }, { status });

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    const raw = typeof body?.target_path === 'string' ? body.target_path.trim() : '';
    if (!raw || raw.length > 300 || raw.includes('//') || raw.includes('\\') || raw.includes('..')) {
      return Response.json({ error: 'Unsupported target', code: 'invalid_request' }, { status: 400 });
    }
    const path = raw.split('?')[0].split('#')[0];
    const match = path.match(COMMITTEE_PATH);
    if (!match) {
      return Response.json({ error: 'Unsupported target', code: 'invalid_request' }, { status: 400 });
    }
    const committeeRef = decodeURIComponent(match[1]);

    // The reference may be a public id, a slug or a record id — resolved on the server only.
    let committee: any = null;
    const byPublicId = await sr.entities.Committee.filter({ public_id: committeeRef }).catch(() => []);
    committee = (byPublicId || [])[0] || null;
    if (!committee) {
      const bySlug = await sr.entities.Committee.filter({ slug: committeeRef }).catch(() => []);
      committee = (bySlug || [])[0] || null;
    }
    if (!committee) committee = await sr.entities.Committee.get(committeeRef).catch(() => null);

    // Uniform refusal. This door opens onto tagged demonstration committees only: a production
    // committee, an unknown reference and a merged legacy record all answer the same way.
    if (!committee || committee.is_demo_data !== true || committee.merge_status === 'merged_duplicate') {
      return refuse('not_found');
    }

    const persona = resolvePersonaForDataset(committee.demo_dataset, committee.public_id);
    if (!persona) return refuse('not_found');

    const user = await base44.auth.me().catch(() => null);
    const issued: any = await issueShowcaseSession(sr, {
      personaKey: persona.key,
      issuedTo: user,
      entryPoint: 'record_transition',
    });
    if (!issued.ok) return refuse(issued.reason || 'not_found');

    // The target must be inside the scope the server has just granted.
    if (!(issued.allowed_committee_public_ids || []).includes(committee.public_id)) {
      return refuse('out_of_scope');
    }

    // Audited WITHOUT the token: the record of the transition names the session, never the secret.
    await sr.entities.AuditEvent.create({
      action: 'showcase_session_issued',
      entity_type: 'ShowcaseSession',
      entity_id: issued.session_id,
      entity_title: committee.name_ar || committee.public_id,
      actor_user_id: user?.id || 'anonymous',
      actor_name: user?.full_name || 'زائر',
      actor_email: user?.email || 'anonymous@visitor',
      description: `Exploration session issued to reopen a demonstration record from a real account (${committee.public_id})`,
      authority_context: `entry_point:record_transition,persona:${issued.persona_key},data_class:${issued.data_class}`,
      organization_id: committee.organization_id || null,
      committee_id: committee.id,
      correlation_id: `showcase-${issued.session_id}`,
      is_sample: false,
    }).catch(() => {});

    return Response.json({
      status: 'ok',
      showcase_token: issued.token,
      session_id: issued.session_id,
      persona_key: issued.persona_key,
      persona_id: issued.persona_id,
      dataset: issued.dataset,
      data_class: issued.data_class,
      allowed_scope_count: issued.allowed_scope_count,
      allowed_committee_public_ids: issued.allowed_committee_public_ids,
      write_scope: issued.write_scope,
      expires_at: issued.expires_at,
      // The caller is returned to the SAME record — not to a home page.
      target: raw.length <= 300 ? raw : path,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}