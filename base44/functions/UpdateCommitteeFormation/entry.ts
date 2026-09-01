import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// UpdateCommitteeFormation — DISABLED (Legacy Remediation).
//
// This function previously allowed DIRECT destructive operations:
//   - Direct committee renaming (overwriting Committee.name_ar/name_en)
//   - Direct mandate/scope editing (overwriting Committee.mandate/scope)
//   - Direct member creation (immediate active membership)
//   - One-click member removal (immediate status change)
//   - Full formation replacement (ending all members + creating new roster)
//   - Immediate email notification to all members after execution
//
// These behaviors violated RAQEEM governance, historical-integrity, authority
// and evidence requirements. This function is now permanently disabled.
//
// All formation changes must go through the governed amendment workflow:
//   - ProposeCommitteeAmendment (creates a draft, does NOT apply)
//   - TransitionAmendmentStatus (submit/return/reject/schedule/cancel)
//   - ApproveCommitteeAmendment (applies only after authorized approval)
//   - EndCommitteeMembership (non-destructive, governed termination)
//
// This endpoint now refuses all operations with a 410 Gone response.
// Existing records produced by prior direct operations are PRESERVED —
// they are not deleted; they are labeled as legacy in audit.

export default async function(req) {
  return Response.json({
    error: 'DISABLED: Direct formation updates are no longer permitted. Use the governed amendment workflow: ProposeCommitteeAmendment → TransitionAmendmentStatus → ApproveCommitteeAmendment. Existing legacy records are preserved.',
    disabled: true,
    remediation: 'governed_amendment_workflow',
    use_instead: [
      'ProposeCommitteeAmendment',
      'TransitionAmendmentStatus',
      'ApproveCommitteeAmendment',
      'EndCommitteeMembership',
    ],
  }, { status: 410 });
}