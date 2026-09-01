import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
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

// Organization Portal (Level 2)
import OrgLayout from '@/components/raqeem/OrgLayout';
import OrgPortal from '@/pages/OrgPortal';
import OrgCommittees from '@/pages/OrgCommittees';
import CommitteeCreateV2 from '@/pages/CommitteeCreateV2';

// Committee Workspace (Level 3)
import CommitteeLayout from '@/components/raqeem/CommitteeLayout';
import CommitteeHome from '@/pages/committee/CommitteeHome';
import CommitteeMembers from '@/pages/committee/CommitteeMembers';
import CommitteeMeetings from '@/pages/committee/CommitteeMeetings';
import CommitteeMinutes from '@/pages/committee/CommitteeMinutes';
import CommitteeDecisions from '@/pages/committee/CommitteeDecisions';
import CommitteeActions from '@/pages/committee/CommitteeActions';
import CommitteeVoting from '@/pages/committee/CommitteeVoting';
import CommitteeRisks from '@/pages/committee/CommitteeRisks';
import CommitteeReports from '@/pages/committee/CommitteeReports';
import CommitteeAudit from '@/pages/committee/CommitteeAudit';
import CommitteeSettings from '@/pages/committee/CommitteeSettings';

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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* Organization Portal (Level 2) */}
        <Route element={<OrgLayout />}>
          <Route path="/o/:orgRef" element={<OrgPortal />} />
          <Route path="/o/:orgRef/committees" element={<OrgCommittees />} />
          <Route path="/o/:orgRef/create-committee" element={<CommitteeCreateV2 />} />
        </Route>

        {/* Committee Workspace (Level 3) */}
        <Route element={<CommitteeLayout />}>
          <Route path="/o/:orgRef/c/:committeeRef" element={<CommitteeHome />} />
          <Route path="/o/:orgRef/c/:committeeRef/members" element={<CommitteeMembers />} />
          <Route path="/o/:orgRef/c/:committeeRef/meetings" element={<CommitteeMeetings />} />
          <Route path="/o/:orgRef/c/:committeeRef/minutes" element={<CommitteeMinutes />} />
          <Route path="/o/:orgRef/c/:committeeRef/decisions" element={<CommitteeDecisions />} />
          <Route path="/o/:orgRef/c/:committeeRef/actions" element={<CommitteeActions />} />
          <Route path="/o/:orgRef/c/:committeeRef/voting" element={<CommitteeVoting />} />
          <Route path="/o/:orgRef/c/:committeeRef/risks" element={<CommitteeRisks />} />
          <Route path="/o/:orgRef/c/:committeeRef/reports" element={<CommitteeReports />} />
          <Route path="/o/:orgRef/c/:committeeRef/audit" element={<CommitteeAudit />} />
          <Route path="/o/:orgRef/c/:committeeRef/settings" element={<CommitteeSettings />} />
        </Route>

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
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <LanguageProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </LanguageProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App