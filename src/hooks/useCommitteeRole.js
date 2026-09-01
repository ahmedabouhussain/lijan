import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Detects the current user's role within a specific committee.
 * Priority: CommitteeMember.email match > chair_name > secretary_name > admin fallback > member.
 */
export function useCommitteeRole(committee, members) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const role = useMemo(() => {
    if (!currentUser) return "member";
    // Resolve from stored backend assignments (user_id or email match), no admin→oversight fallback.
    const myMemberships = members.filter(
      (m) =>
        (m.user_id && m.user_id === currentUser.id) ||
        (m.user_email && currentUser.email && m.user_email.toLowerCase() === currentUser.email.toLowerCase())
    );
    if (myMemberships.length > 0) {
      const rolePriority = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };
      const sorted = myMemberships.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
      return sorted[0].role;
    }
    return "member";
  }, [currentUser, members, committee]);

  return role;
}