import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useCommitteeSafe } from "@/lib/CommitteeContext";

/**
 * useCommitteeAdmin — resolves backend-governed capabilities for the current user
 * within the active committee. Platform Admin does NOT automatically gain
 * operational committee authority.
 *
 * Returns explicit capability flags resolved server-side by GetCommitteeCapabilities.
 */
export function useCommitteeAdmin() {
  const { data } = useCommitteeSafe() || {};
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);

  const committeeId = data?.committee?.id;

  const load = useCallback(async () => {
    if (!committeeId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke("GetCommitteeCapabilities", { committee_id: committeeId });
      const caps = res.data?.capabilities || res.capabilities;
      setCapabilities(caps);
    } catch (e) {
      setCapabilities(null);
    }
    setLoading(false);
  }, [committeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const canConfigure = !!capabilities?.can_configure_committee_pages;
  const canEditDrafts = !!capabilities?.can_edit_page_drafts;
  const canPublish = !!capabilities?.can_publish_page_configuration;
  const canRestore = !!capabilities?.can_restore_configuration_version;
  const canManageRecords = !!capabilities?.can_manage_committee_records;
  const canManageMembership = !!capabilities?.can_manage_membership;
  const canManageMeetings = !!capabilities?.can_manage_meetings;
  const canManageDocuments = !!capabilities?.can_manage_documents;
  const canManageMinutes = !!capabilities?.can_manage_minutes;
  const canManageDecisions = !!capabilities?.can_manage_decisions;
  const canManageExecution = !!capabilities?.can_manage_execution;
  const canManageNotifications = !!capabilities?.can_manage_notifications;
  const canManageGovernance = !!capabilities?.can_manage_governance;
  const canManageIntegrations = !!capabilities?.can_manage_integrations;
  const canSupersede = !!capabilities?.can_supersede_official_records;
  const canViewAudit = !!capabilities?.can_view_audit;

  return {
    capabilities,
    loading,
    canConfigure,
    canEditDrafts,
    canPublish,
    canRestore,
    canManageRecords,
    canManageMembership,
    canManageMeetings,
    canManageDocuments,
    canManageMinutes,
    canManageDecisions,
    canManageExecution,
    canManageNotifications,
    canManageGovernance,
    canManageIntegrations,
    canSupersede,
    canViewAudit,
    reload: load,
  };
}