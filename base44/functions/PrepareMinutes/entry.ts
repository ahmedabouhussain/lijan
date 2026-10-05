import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { minutesEditable, minutesContentRefusal, MEETING_LIFECYCLE_VERSION } from '../../shared/meetingLifecycle.ts';
import { sanitizeServerRichText, isEmptyRichText } from '../../shared/serverRichText.ts';

// PrepareMinutes — the ONLY writer of minutes CONTENT (D-020).
//
// Minutes text used to be written straight from the browser: the client cleaned the markup and then
// wrote the record, so the authority on what entered a governance document was the browser. The
// content is now prepared through a governed command, and the SERVER applies the text policy before
// storing — a client that skips its own cleaning, or is replaced by another client, cannot put markup
// into the record.
//
// Two conditions beyond authority: the minutes must still be correctable (draft or in review — an
// approved or issued minutes is corrected by a later amendment, never overwritten), and there must be
// content to store.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { minutes_id, body: minutesBody, body_en, summary_ar, summary_en } = body;

    if (!minutes_id) {
      return Response.json({ error: 'minutes_id is required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee is derived from the minutes record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'minutes.draft',
      target_type: 'MeetingMinutes',
      target_id: minutes_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const minutes = auth.target;

    if (!minutesEditable(minutes.status)) {
      return Response.json(minutesContentRefusal(minutes.status), { status: 409 });
    }

    const cleanBody = sanitizeServerRichText(minutesBody !== undefined ? minutesBody : minutes.body);
    if (isEmptyRichText(cleanBody)) {
      return Response.json({
        error: 'No displayable content to store',
        code: 'minutes_content_empty',
        message: {
          ar: 'لا يوجد محتوى محضر صالح للحفظ.',
          en: 'There is no valid minutes content to save.',
        },
        meeting_lifecycle_version: MEETING_LIFECYCLE_VERSION,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const patch: any = {
      body: cleanBody,
      summary_ar: sanitizeServerRichText(summary_ar !== undefined ? summary_ar : minutes.summary_ar),
      // A human touched the text: the draft is no longer the machine's output as stored.
      generated_by_ai: false,
    };
    if (body_en !== undefined) patch.body_en = sanitizeServerRichText(body_en);
    if (summary_en !== undefined) patch.summary_en = sanitizeServerRichText(summary_en);
    if (!minutes.drafted_by_name) patch.drafted_by_name = auth.user.full_name || auth.user.email;

    await base44.asServiceRole.entities.MeetingMinutes.update(minutes_id, patch);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: 'minutes.prepare',
      entity_type: 'MeetingMinutes',
      entity_id: minutes_id,
      entity_title: minutes.minutes_number || '',
      description: `Minutes content prepared by ${auth.effective_role} in state '${minutes.status}' (right exercised: minutes.draft); markup stripped server-side before storage`,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      minutes_id,
      state: minutes.status,
      edited_by: auth.user.full_name || auth.user.email,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}