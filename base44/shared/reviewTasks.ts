import { capabilitiesForRole } from './authorityKernel.ts';

// Review tasks — «ما المطلوب مني الآن؟» for document review.
//
// A review task EXISTS only when all of the following are true:
//   1. a review request is open (status pending) for this committee,
//   2. the reviewed document still exists in that committee,
//   3. that request names a specific document VERSION that still exists,
//   4. that version carries a stored file (a private reference, never a bare URL),
//   5. the request is assigned to this actor — by identity link, or to their ROLE.
//
// Anything less is not a task: it is a label with nothing behind it. The list surfaced to
// the interface is therefore resolved on the server, never assembled from a separate
// client-side view of the same records.

const REVIEWER_ROLES = {
  chair: ['chair'],
  vice_chair: ['vice_chair'],
  secretary: ['secretary'],
};

function roleCanReview(role) {
  // Any committee seat may respond to a review (the server grants `read` for that);
  // chair/vice_chair/secretary are additionally addressable as a ROLE rather than a person.
  return (capabilitiesForRole(role) || []).includes('read');
}

export async function resolveMyReviewTasks(sr, { committee_id, user_id, role }) {
  if (!committee_id) return [];
  const requests = await sr.entities.ReviewRequest
    .filter({ committee_id, status: 'pending' })
    .catch(() => []);
  const open = requests || [];
  if (!open.length) return [];

  const mine = open.filter((r) => {
    // Identity link first — a request addressed to this seat.
    if (user_id && r.reviewer_user_id === user_id) return true;
    // Otherwise a request addressed to the role this seat holds.
    const addressedRoles = REVIEWER_ROLES[r.reviewer_role] || (r.reviewer_role ? [r.reviewer_role] : []);
    return addressedRoles.includes(role) && roleCanReview(role);
  });
  if (!mine.length) return [];

  const tasks = [];
  for (const r of mine) {
    const doc = await sr.entities.Document.get(r.document_id).catch(() => null);
    // A request whose document vanished is not a task.
    if (!doc || doc.committee_id !== committee_id) continue;
    const versionId = r.document_version_id || doc.current_version_id || null;
    if (!versionId) continue;
    const version = await sr.entities.DocumentVersion.get(versionId).catch(() => null);
    // A request whose version vanished, or whose version has no stored file, is not a task.
    if (!version || version.document_id !== doc.id) continue;
    if (!version.file_url && !version.storage_key) continue;
    tasks.push({
      review_request_id: r.id,
      document_id: doc.id,
      document_version_id: versionId,
      version_number: version.version_number || doc.current_version_number || 1,
      document_title: doc.title || doc.title_en || doc.title_ar || '',
      document_title_ar: doc.title_ar || doc.title || '',
      document_title_en: doc.title_en || doc.title || '',
      document_type: doc.document_type || null,
      classification: doc.classification || null,
      requested_by_name: r.requested_by_name || null,
      review_note: r.instructions || r.review_note || null,
      deadline: r.due_date || r.deadline || null,
      has_file: !!(version.file_url || version.storage_key),
    });
  }
  return tasks;
}