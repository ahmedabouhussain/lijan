import React, { useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import SplashScreen from '@/components/raqeem/SplashScreen';
import ProtectedRoute from '@/components/ProtectedRoute';
import { LanguageProvider } from '@/lib/LanguageContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Page imports
import EntryPortal from '@/pages/EntryPortal';
import CreatePortal from '@/pages/CreatePortal';
import Profile from '@/pages/Profile';
import FounderVault from '@/pages/FounderVault';
import MeetingDetail from '@/pages/MeetingDetail';
import DecisionDetail from '@/pages/DecisionDetail';
import MinutesArchive from '@/pages/MinutesArchive';
import NotificationPreferences from '@/pages/NotificationPreferences';
import VerifyRecord from '@/pages/VerifyRecord';

// Organization Portal (Level 2)
import OrgLayout from '@/components/raqeem/OrgLayout';
import OrgPortal from '@/pages/OrgPortal';
import OrgCommittees from '@/pages/OrgCommittees';
import OrgNotifications from '@/pages/OrgNotifications';
import OrgAdmin from '@/pages/OrgAdmin';
import CommitteeCreateV2 from '@/pages/CommitteeCreateV2';

// Committee Workspace (Level 3)
import CommitteeLayout from '@/components/raqeem/CommitteeLayout';
import CommitteeHome from '@/pages/committee/CommitteeHome';
import CommitteeMembers from '@/pages/committee/CommitteeMembers';
import CommitteeFormation from '@/pages/committee/CommitteeFormation';
import CommitteeEstablishment from '@/pages/committee/CommitteeEstablishment';
import FormationHistory from '@/pages/committee/FormationHistory';
import CommitteeAmendments from '@/pages/committee/CommitteeAmendments';
import CommitteeRoles from '@/pages/committee/CommitteeRoles';
import CommitteeDelegations from '@/pages/committee/CommitteeDelegations';
import CommitteeAlternates from '@/pages/committee/CommitteeAlternates';
import CommitteeRecusals from '@/pages/committee/CommitteeRecusals';
import CommitteeMeetings from '@/pages/committee/CommitteeMeetings';
import CommitteeCalendar from '@/pages/committee/CommitteeCalendar';
import CommitteeAgenda from '@/pages/committee/CommitteeAgenda';
import CommitteePacks from '@/pages/committee/CommitteePacks';
import CommitteeAttendance from '@/pages/committee/CommitteeAttendance';
import CommitteeDocuments from '@/pages/committee/CommitteeDocuments';
import CommitteeMinutes from '@/pages/committee/CommitteeMinutes';
import CommitteeSignatures from '@/pages/committee/CommitteeSignatures';
import CommitteeDecisions from '@/pages/committee/CommitteeDecisions';
import CommitteeActions from '@/pages/committee/CommitteeActions';
import CommitteeVoting from '@/pages/committee/CommitteeVoting';
import CommitteeEvidence from '@/pages/committee/CommitteeEvidence';
import CommitteeDependencies from '@/pages/committee/CommitteeDependencies';
import CommitteeEscalations from '@/pages/committee/CommitteeEscalations';
import CommitteeRisks from '@/pages/committee/CommitteeRisks';
import CommitteeReports from '@/pages/committee/CommitteeReports';
import CommitteeMemory from '@/pages/committee/CommitteeMemory';
import CommitteeAI from '@/pages/committee/CommitteeAI';
import CommitteeAudit from '@/pages/committee/CommitteeAudit';
import CommitteeMandate from '@/pages/committee/CommitteeMandate';
import CommitteeGovernanceRules from '@/pages/committee/CommitteeGovernanceRules';
import CommitteeIntegrations from '@/pages/committee/CommitteeIntegrations';
import CommitteeNotifications from '@/pages/committee/CommitteeNotifications';
import CommitteeClosure from '@/pages/committee/CommitteeClosure';
import CommitteeSettings from '@/pages/committee/CommitteeSettings';
import ProductCatalog from '@/pages/committee/ProductCatalog';
import ReportCenter from '@/pages/committee/ReportCenter';
import PeopleFormationHub from '@/pages/committee/hubs/PeopleFormationHub';
import MeetingsHub from '@/pages/committee/hubs/MeetingsHub';
import RecordsHub from '@/pages/committee/hubs/RecordsHub';
import ExecutionHub from '@/pages/committee/hubs/ExecutionHub';
import IntelligenceHub from '@/pages/committee/hubs/IntelligenceHub';
import GovernanceHub from '@/pages/committee/hubs/GovernanceHub';
import DocumentationHub from '@/pages/committee/DocumentationHub';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<EntryPortal />} />
      <Route path="/create-portal" element={<CreatePortal />} />
      <Route path="/verify/:type/:id" element={<VerifyRecord />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Organization Portal (Level 2) */}
        <Route element={<OrgLayout />}>
          <Route path="/o/:orgRef" element={<OrgPortal />} />
          <Route path="/o/:orgRef/committees" element={<OrgCommittees />} />
          <Route path="/o/:orgRef/notifications" element={<OrgNotifications />} />
          <Route path="/o/:orgRef/admin" element={<OrgAdmin />} />
          <Route path="/o/:orgRef/create-committee" element={<CommitteeCreateV2 />} />
        </Route>

        {/* Committee Workspace (Level 3) */}
        <Route element={<CommitteeLayout />}>
          <Route path="/o/:orgRef/c/:committeeRef" element={<CommitteeHome />} />
          {/* People */}
          <Route path="/o/:orgRef/c/:committeeRef/members" element={<CommitteeMembers />} />
          <Route path="/o/:orgRef/c/:committeeRef/formation" element={<CommitteeFormation />} />
          <Route path="/o/:orgRef/c/:committeeRef/establishment" element={<CommitteeEstablishment />} />
          <Route path="/o/:orgRef/c/:committeeRef/formation-history" element={<FormationHistory />} />
          <Route path="/o/:orgRef/c/:committeeRef/amendments" element={<CommitteeAmendments />} />
          <Route path="/o/:orgRef/c/:committeeRef/roles" element={<CommitteeRoles />} />
          <Route path="/o/:orgRef/c/:committeeRef/delegations" element={<CommitteeDelegations />} />
          <Route path="/o/:orgRef/c/:committeeRef/alternates" element={<CommitteeAlternates />} />
          <Route path="/o/:orgRef/c/:committeeRef/recusals" element={<CommitteeRecusals />} />
          {/* Meetings */}
          <Route path="/o/:orgRef/c/:committeeRef/meetings" element={<MeetingsHub />} />
          <Route path="/o/:orgRef/c/:committeeRef/people" element={<PeopleFormationHub />} />
          <Route path="/o/:orgRef/c/:committeeRef/records" element={<RecordsHub />} />
          <Route path="/o/:orgRef/c/:committeeRef/execution" element={<ExecutionHub />} />
          <Route path="/o/:orgRef/c/:committeeRef/intelligence" element={<IntelligenceHub />} />
          <Route path="/o/:orgRef/c/:committeeRef/governance" element={<GovernanceHub />} />
          <Route path="/o/:orgRef/c/:committeeRef/meetings/:id" element={<MeetingDetail />} />
          <Route path="/o/:orgRef/c/:committeeRef/calendar" element={<CommitteeCalendar />} />
          <Route path="/o/:orgRef/c/:committeeRef/agenda" element={<CommitteeAgenda />} />
          <Route path="/o/:orgRef/c/:committeeRef/packs" element={<CommitteePacks />} />
          <Route path="/o/:orgRef/c/:committeeRef/attendance" element={<CommitteeAttendance />} />
          {/* Official Records */}
          <Route path="/o/:orgRef/c/:committeeRef/documents" element={<CommitteeDocuments />} />
          <Route path="/o/:orgRef/c/:committeeRef/minutes" element={<CommitteeMinutes />} />
          <Route path="/o/:orgRef/c/:committeeRef/voting" element={<CommitteeVoting />} />
          <Route path="/o/:orgRef/c/:committeeRef/decisions" element={<CommitteeDecisions />} />
          <Route path="/o/:orgRef/c/:committeeRef/decisions/:id" element={<DecisionDetail />} />
          <Route path="/o/:orgRef/c/:committeeRef/signatures" element={<CommitteeSignatures />} />
          {/* Execution */}
          <Route path="/o/:orgRef/c/:committeeRef/actions" element={<CommitteeActions />} />
          <Route path="/o/:orgRef/c/:committeeRef/evidence" element={<CommitteeEvidence />} />
          <Route path="/o/:orgRef/c/:committeeRef/risks" element={<CommitteeRisks />} />
          <Route path="/o/:orgRef/c/:committeeRef/dependencies" element={<CommitteeDependencies />} />
          <Route path="/o/:orgRef/c/:committeeRef/escalations" element={<CommitteeEscalations />} />
          {/* Intelligence & Reporting */}
          <Route path="/o/:orgRef/c/:committeeRef/reports" element={<CommitteeReports />} />
          <Route path="/o/:orgRef/c/:committeeRef/memory" element={<CommitteeMemory />} />
          <Route path="/o/:orgRef/c/:committeeRef/ai" element={<CommitteeAI />} />
          <Route path="/o/:orgRef/c/:committeeRef/audit" element={<CommitteeAudit />} />
          {/* Administration */}
          <Route path="/o/:orgRef/c/:committeeRef/mandate" element={<CommitteeMandate />} />
          <Route path="/o/:orgRef/c/:committeeRef/governance-rules" element={<CommitteeGovernanceRules />} />
          <Route path="/o/:orgRef/c/:committeeRef/integrations" element={<CommitteeIntegrations />} />
          <Route path="/o/:orgRef/c/:committeeRef/notifications" element={<CommitteeNotifications />} />
          <Route path="/o/:orgRef/c/:committeeRef/closure" element={<CommitteeClosure />} />
          <Route path="/o/:orgRef/c/:committeeRef/settings" element={<CommitteeSettings />} />
          <Route path="/o/:orgRef/c/:committeeRef/products" element={<ProductCatalog />} />
          <Route path="/o/:orgRef/c/:committeeRef/reports" element={<ReportCenter />} />
          <Route path="/o/:orgRef/c/:committeeRef/documentation" element={<DocumentationHub />} />
        </Route>

        {/* Deliberations Archive */}
        <Route path="/minutes-archive" element={<MinutesArchive />} />

        {/* Notification Preferences */}
        <Route path="/notification-preferences" element={<NotificationPreferences />} />

        {/* Legacy detail routes (still accessible) */}
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/decisions/:id" element={<DecisionDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/founder-vault" element={<FounderVault />} />

        {/* Legacy flat routes → redirect to org portal */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/committees" element={<Navigate to="/" replace />} />
        <Route path="/decisions" element={<Navigate to="/" replace />} />
        <Route path="/minutes" element={<Navigate to="/" replace />} />
        <Route path="/execution" element={<Navigate to="/" replace />} />
        <Route path="/calendar" element={<Navigate to="/" replace />} />
        <Route path="/memory" element={<Navigate to="/" replace />} />
        <Route path="/ai-ledger" element={<Navigate to="/" replace />} />
        <Route path="/dependencies" element={<Navigate to="/" replace />} />
        <Route path="/scenarios" element={<Navigate to="/" replace />} />
        <Route path="/integrations" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <LanguageProvider>
          <Router>
            <ScrollToTop />
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </LanguageProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App