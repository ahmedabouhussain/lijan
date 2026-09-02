import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { extractDomain } from '../../shared/orgIdentityResolver.ts';

// RequestOrganizationAccess — submits a join request for an existing organization.
// Does NOT create a membership — the org owner/admin must approve first.
// Notifies the organization owner via email.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { organization_id, requested_role, job_title, department, justification } = body;

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Verify org exists and is not merged
    const org = await base44.asServiceRole.entities.Organization.get(organization_id);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }
    if (org.status === 'merged_duplicate' || org.merge_status === 'merged_duplicate') {
      // Redirect to canonical org
      if (org.merged_into_organization_id) {
        const canonical = await base44.asServiceRole.entities.Organization.get(org.merged_into_organization_id);
        if (canonical) {
          return Response.json({
            redirect: true,
            canonical_organization_id: canonical.id,
            portal_url: `/o/${canonical.slug}--${canonical.public_id}`,
          });
        }
      }
      return Response.json({ error: 'Organization has been merged' }, { status: 410 });
    }

    // Check if already a member
    const existingMembership = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: org.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    if (existingMembership && existingMembership.length > 0) {
      return Response.json({
        status: 'already_member',
        portal_url: `/o/${org.slug}--${org.public_id}`,
      });
    }

    // Check for existing pending request
    const existingRequest = await base44.asServiceRole.entities.OrganizationAccessRequest
      .filter({ organization_id: org.id, requester_user_id: user.id })
      .catch(() => []);
    const pending = (existingRequest || []).find(
      (r) => r.status === 'pending_review' || r.status === 'pending_email_verification'
    );
    if (pending) {
      return Response.json({
        status: 'request_pending',
        request_id: pending.id,
        message: 'You already have a pending access request for this organization',
      });
    }

    // Check official domain match
    const userDomain = extractDomain(user.email || '');
    const orgDomain = extractDomain(org.owner_email || org.contact_email || '');
    const domainMatch = !!(userDomain && orgDomain && userDomain === orgDomain);

    // Create access request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day expiry

    const accessRequest = await base44.asServiceRole.entities.OrganizationAccessRequest.create({
      organization_id: org.id,
      directory_key: org.directory_key || null,
      requester_user_id: user.id,
      requester_email: user.email,
      requester_name: user.full_name || user.email,
      requested_role: requested_role || 'member',
      job_title: job_title || null,
      department: department || null,
      justification: justification || null,
      official_domain_match: domainMatch,
      verification_method: domainMatch ? 'email_domain' : 'manual_review',
      status: 'pending_review',
      expires_at: expiresAt.toISOString(),
    });

    // Notify org owner
    if (org.owner_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: org.owner_email,
          subject: `طلب انضمام جديد إلى ${org.name_ar || org.name_en}`,
          body: `<div dir="rtl" style="font-family: sans-serif; font-size: 14px;">
            <p>مرحباً ${org.owner_name || ''}،</p>
            <p>تلقى ${org.name_ar || org.name_en} طلب انضمام جديد:</p>
            <table style="margin: 16px 0; font-size: 13px;">
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">الاسم:</td><td>${user.full_name || user.email}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">البريد:</td><td>${user.email}</td></tr>
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">الدور المطلوب:</td><td>${requested_role || 'عضو'}</td></tr>
              ${job_title ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">المسمى:</td><td>${job_title}</td></tr>` : ''}
              ${department ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">الإدارة:</td><td>${department}</td></tr>` : ''}
              ${justification ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">المبرر:</td><td>${justification}</td></tr>` : ''}
              <tr><td style="padding: 4px 12px 4px 0; color: #666;">تطابق النطاق:</td><td>${domainMatch ? 'نعم ✓' : 'لا'}</td></tr>
            </table>
            <p>يرجى مراجعة الطلب واعتماده أو رفضه من بوابة المنظمة.</p>
          </div>`,
        });
      } catch {}
    }

    // Audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: org.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'create',
      entity_type: 'OrganizationAccessRequest',
      entity_id: accessRequest.id,
      entity_title: org.name_ar || org.name_en,
      description: 'User submitted a join request for this organization',
      correlation_id: 'accessreq_' + accessRequest.id,
    });

    return Response.json({
      status: 'request_submitted',
      request_id: accessRequest.id,
      message: 'Your access request has been submitted. The organization owner will review it.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}