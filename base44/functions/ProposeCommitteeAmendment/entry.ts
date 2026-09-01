import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ProposeCommitteeAmendment — creates a governed amendment draft with impact analysis.
// Does NOT apply any change. The amendment remains in draft/review until approved.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, amendment_type, description,
      source_instrument_id, source_instrument_ref,
      after_state, effective_date,
    } = body;

    if (!committee_id || !amendment_type) {
      return Response.json({ error: 'committee_id and amendment_type are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.manage' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);

    // Capture before-state
    const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id, status: 'active' }).catch(() => []);
    const beforeState = {
      name_ar: committee.name_ar,
      name_en: committee.name_en,
      mandate: committee.mandate,
      scope: committee.scope,
      quorum_count: committee.quorum_count,
      voting_rule: committee.voting_rule,
      classification: committee.classification,
      term_start: committee.term_start,
      term_end: committee.term_end,
      members: (activeMembers || []).map((m) => ({
        full_name: m.full_name, role: m.role, institution_name: m.institution_name,
      })),
    };

    // Impact analysis
    const impacts = [];
    const memberNames = (activeMembers || []).map((m) => m.full_name);
    const afterMembers = after_state?.members || [];
    const removedNames = memberNames.filter((n) => !afterMembers.some((m) => m.full_name === n));
    const addedNames = afterMembers.map((m) => m.full_name).filter((n) => !memberNames.includes(n));

    if (removedNames.length > 0) {
      impacts.push(`إزالة ${removedNames.length} عضو — قد يؤثر على النصاب والتصويت`);
    }
    if (addedNames.length > 0) {
      impacts.push(`إضافة ${addedNames.length} عضو — يتطلب تحديث الصلاحيات`);
    }
    if (after_state?.name_ar && after_state.name_ar !== committee.name_ar) {
      impacts.push('إعادة تسمية — الواجهة الحالية تتغير، السجلات التاريخية تحتفظ بالاسم القديم');
    }
    if (after_state?.mandate && after_state.mandate !== committee.mandate) {
      impacts.push('تعديل الصلاحية — النسخة الجديدة تسري مستقبلاً، القرارات السابقة تبقى مرتبطة بصلاحية وقتها');
    }
    if (after_state?.quorum_count && after_state.quorum_count !== committee.quorum_count) {
      impacts.push('تغيير النصاب — قد يؤثر على الاجتماعات القادمة');
    }
    if (after_state?.voting_rule && after_state.voting_rule !== committee.voting_rule) {
      impacts.push('تغيير قاعدة التصويت — قد يؤثر على التصويتات المفتوحة');
    }

    const impactSummary = impacts.length > 0
      ? impacts.join('؛ ')
      : 'لا تأثيرات جوهرية متوقعة';

    const amendment = await base44.asServiceRole.entities.CommitteeAmendment.create({
      organization_id: auth.organization_id,
      committee_id,
      amendment_type,
      source_instrument_id: source_instrument_id || null,
      source_instrument_ref: source_instrument_ref || null,
      description: description || null,
      before_state: JSON.stringify(beforeState),
      after_state: after_state ? JSON.stringify(after_state) : null,
      impact_analysis: JSON.stringify({ impacts, removedNames, addedNames }),
      impact_summary: impactSummary,
      effective_date: effective_date || null,
      status: 'draft',
      proposed_by_user_id: auth.user.id,
      proposed_by_name: auth.user.full_name || auth.user.email,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'create', entity_type: 'CommitteeAmendment', entity_id: amendment.id,
      entity_title: description || amendment_type,
      description: `اقتراح تعديل: ${amendment_type}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', amendment, impact_summary: impactSummary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}