import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';
import { logAuditEvent, generateCorrelationId } from '../../shared/recordGovernance.ts';

// ResetPageConfigurationToOrganization — removes the committee-specific page configuration
// so the system falls back to the organization-level template (or system default).
// Requires can_restore_configuration_version capability.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, page_key, reason } = body;
    if (!committee_id || !page_key || !reason) {
      return Response.json({ error: 'committee_id, page_key, and reason are required' }, { status: 400 });
    }

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    const capabilities = await resolveUserCapabilities(base44, user, committee);
    if (!capabilities.can_restore_configuration_version) {
      return Response.json({
        error: 'Forbidden: cannot reset configuration',
        required: 'can_restore_configuration_version',
        effective_role: capabilities.effective_committee_role,
      }, { status: 403 });
    }

    const correlationId = generateCorrelationId(`reset-${page_key}`);

    // Delete committee-specific config (draft + published) and versions
    await base44.asServiceRole.entities.PageConfiguration.deleteMany({
      committee_id: committee.id, page_key,
    }).catch(() => {});

    await base44.asServiceRole.entities.PageConfigurationVersion.deleteMany({
      committee_id: committee.id, page_key,
    }).catch(() => {});

    // Fetch org-level config as the new effective config
    let orgConfig = await base44.asServiceRole.entities.PageConfiguration
      .filter({ organization_id: committee.organization_id, committee_id: null, page_key, status: 'published' })
      .catch(() => []);
    orgConfig = (orgConfig || [])[0] || null;

    await logAuditEvent(base44, {
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_id: user.id,
      actor_name: user.full_name || user.email,
      action: 'delete',
      entity_type: 'PageConfiguration',
      entity_id: page_key,
      entity_title: `Page Configuration: ${page_key}`,
      description: `Reset page configuration to organization default. Reason: ${reason}`,
      authority_context: `capability:can_restore_configuration_version;role:${capabilities.effective_committee_role}`,
      correlation_id: correlationId,
    });

    return Response.json({
      reset: true,
      effective_config: orgConfig,
      is_org_default: !orgConfig,
      correlation_id: correlationId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}