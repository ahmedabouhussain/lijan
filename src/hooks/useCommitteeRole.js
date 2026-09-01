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
    const memberRecord = members.find(
      (m) => m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (memberRecord) return memberRecord.role;
    if (committee?.chair_name && currentUser.full_name === committee.chair_name) return "chair";
    if (committee?.secretary_name && currentUser.full_name === committee.secretary_name) return "secretary";
    if (currentUser.role === "admin") return "chair";
    return "member";
  }, [currentUser, members, committee]);

  return role;
}