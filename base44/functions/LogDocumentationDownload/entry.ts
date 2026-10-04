import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Server-side authorization gate, link issuer and audit trail for documentation access.
// A document is released to the caller only when the session is authenticated and the requested
// document belongs to the ACTIVE release. The short-lived link is minted HERE, after that decision:
// the client never signs a storage reference of its own, so a request can never be pointed at a
// file the release does not publish. The log records whether a link was actually issued.
const ACTIONS = ['download', 'preview', 'pack_download', 'language_selected', 'category_selected'];
const FORMATS = ['pdf', 'docx', 'pptx', 'xlsx', 'zip'];
const LINK_TTL_SECONDS = 300;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    if (!user) {
      return Response.json({ allowed: false, error: 'Authentication required', code: 'unauthenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const releaseId = typeof body?.release_id === 'string' ? body.release_id : null;
    const assetKey = typeof body?.asset_key === 'string' ? body.asset_key : null;
    const language = body?.language === 'ar' || body?.language === 'en' ? body.language : 'en';
    const action = ACTIONS.includes(body?.action) ? body.action : 'download';
    const requestedResult = ['success', 'failure', 'denied'].includes(body?.result) ? body.result : 'success';
    const errorReference = typeof body?.error_reference === 'string' ? body.error_reference.slice(0, 120) : null;
    const category = typeof body?.category === 'string' ? body.category.slice(0, 60) : null;

    if (!releaseId) {
      return Response.json({ allowed: false, error: 'Invalid request', code: 'invalid_request' }, { status: 400 });
    }

    const releases = await base44.asServiceRole.entities.DocumentationRelease.filter({ release_id: releaseId, status: 'active' });
    if (releases.length === 0) {
      return Response.json({ allowed: false, error: 'Release not available', code: 'not_found' }, { status: 404 });
    }
    const release = releases[0];

    let asset = null;
    if (assetKey) {
      const found = await base44.asServiceRole.entities.DocumentationAsset.filter({ asset_key: assetKey, release_id: releaseId, status: 'active' });
      if (found.length === 0) {
        return Response.json({ allowed: false, error: 'Document not available', code: 'not_found' }, { status: 404 });
      }
      asset = found[0];
    } else if (action === 'download' || action === 'preview') {
      return Response.json({ allowed: false, error: 'Invalid request', code: 'invalid_request' }, { status: 400 });
    }

    const formatValue = typeof body?.format === 'string' && FORMATS.includes(body.format)
      ? body.format
      : asset?.format || (action === 'pack_download' ? 'zip' : null);

    // A file action the client reports as a success is a REQUEST for a link. The link is minted
    // only now, and the logged result says whether it actually was.
    const wantsLink = requestedResult === 'success' && ['download', 'preview', 'pack_download'].includes(action);
    const fileUri = action === 'pack_download' ? release.zip_file_uri : asset?.file_uri;
    let signedUrl = null;
    let result = requestedResult;
    let reference = errorReference;
    if (wantsLink) {
      if (!fileUri) {
        result = 'failure';
        reference = 'file_reference_missing';
      } else {
        const signed = await base44.asServiceRole.integrations.Core
          .CreateFileSignedUrl({ file_uri: fileUri, expires_in: LINK_TTL_SECONDS })
          .catch(() => null);
        signedUrl = signed?.signed_url || null;
        if (!signedUrl) {
          result = 'failure';
          reference = 'signing_failed';
        }
      }
    }

    const payload = {
      release_id: releaseId,
      asset_key: assetKey,
      category: category || asset?.category || null,
      user_id: user.id,
      user_name: user.full_name || null,
      user_email: user.email || null,
      document_key: assetKey || `${releaseId}|complete-pack`,
      document_title: asset ? asset.title_en : release.title_en,
      language,
      version: asset?.version || release.version,
      action,
      result,
      error_reference: reference,
      downloaded_at: new Date().toISOString(),
    };
    if (formatValue) payload.format = formatValue;

    const log = await base44.entities.DocumentationDownloadLog.create(payload);

    if (wantsLink && !signedUrl) {
      return Response.json({ allowed: false, error: 'File unavailable', code: reference, log_id: log?.id || null }, { status: 502 });
    }

    return Response.json({
      allowed: true,
      log_id: log?.id || null,
      release_status: release.status,
      ...(signedUrl
        ? {
          signed_url: signedUrl,
          expires_in: LINK_TTL_SECONDS,
          filename: action === 'pack_download' ? release.zip_filename : asset?.filename,
        }
        : {}),
    });
  } catch (error) {
    return Response.json({ allowed: false, error: 'Unable to complete the request', code: 'server_error' }, { status: 500 });
  }
}