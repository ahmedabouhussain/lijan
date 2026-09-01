// recordGovernance.ts — Shared logic for governed committee record operations.
// Enforces Level 2 (operational editing in editable states) and Level 3 (protected official records).
// Platform Admin does NOT gain operational authority. Org Admin does NOT become chair/secretary.

import { resolveUserCapabilities } from './committeeAuth.ts';

// Entity type → required capability mapping
export const ENTITY_CAPABILITY_MAP: Record<string, string> = {
  Meeting: 'can_manage_meetings',
  AgendaItem: 'can_manage_meetings',
  Attendance: 'can_manage_meetings',
  MeetingMinutes: 'can_manage_minutes',
  Document: 'can_manage_documents',
  Decision: 'can_manage_decisions',
  Vote: 'can_manage_decisions',
  Action: 'can_manage_execution',
  Signature: 'can_manage_minutes',
  Delegation: 'can_manage_committee_records',
  AuthorityDelegation: 'can_manage_committee_records',
  Recusal: 'can_manage_committee_records',
  CrossEntityDependency: 'can_manage_committee_records',
  PolicyScenario: 'can_manage_committee_records',
};

// States where records can be directly edited (Level 2)
export const EDITABLE_STATES = [
  'draft', 'returned', 'under_preparation', 'pending_internal_review', 'in_review', 'proposed',
];

// States where records are protected (Level 3) — require governed commands
export const PROTECTED_STATES = [
  'approved', 'issued', 'certified', 'signed', 'closed', 'completed',
  'voting', 'verified', 'published', 'executing', 'superseded', 'archived',
];

export function isEditable(status: string): boolean {
  return EDITABLE_STATES.includes(status);
}

export function isProtected(status: string): boolean {
  return PROTECTED_STATES.includes(status);
}

export async function authorizeForRecord(base44: any, user: any, committeeId: string, requiredCapability: string) {
  const committee = await base44.asServiceRole.entities.Committee.get(committeeId).catch(() => null);
  if (!committee) return { error: { status: 404, message: 'Committee not found' } };

  const capabilities = await resolveUserCapabilities(base44, user, committee);

  if (!capabilities[requiredCapability]) {
    return {
      error: {
        status: 403,
        message: 'Forbidden: insufficient capability',
        required: requiredCapability,
        effective_role: capabilities.effective_committee_role,
        is_org_admin: capabilities.is_org_admin,
        is_platform_admin: capabilities.is_platform_admin,
      },
    };
  }

  return { committee, capabilities };
}

export async function logAuditEvent(base44: any, params: any) {
  await base44.asServiceRole.entities.AuditEvent.create({
    organization_id: params.organization_id,
    committee_id: params.committee_id,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    entity_title: params.entity_title,
    description: params.description,
    old_value: params.old_value ? JSON.stringify(params.old_value) : null,
    new_value: params.new_value ? JSON.stringify(params.new_value) : null,
    authority_context: params.authority_context,
    correlation_id: params.correlation_id,
  }).catch(() => {});
}

export function generateCorrelationId(prefix = 'gov'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function checkConcurrency(record: any, expectedVersion?: number) {
  if (expectedVersion !== undefined && record.version !== undefined && record.version !== expectedVersion) {
    return { conflict: true, current_version: record.version, expected_version: expectedVersion };
  }
  return { conflict: false };
}

export function getRecordTitle(record: any, entityType: string): string {
  return record.title || record.title_ar || record.name || record.full_name || entityType;
}