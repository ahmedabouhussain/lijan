import React, { useState, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { EffectiveActorProvider, useEffectiveActor } from '@/lib/EffectiveActorContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AutoFullscreen from '@/components/AutoFullscreen';
import NativeAppShell from '@/components/NativeAppShell';
import SplashScreen from '@/components/raqeem/SplashScreen';
import ProtectedRoute from '@/components/ProtectedRoute';
import { LanguageProvider } from '@/lib/LanguageContext';
import { AmeenProvider } from '@/lib/AmeenContext';
import AmeenLauncher from '@/components/ameen/AmeenLauncher';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Page imports
import EntryPortal from '@/pages/EntryPortal';
import ExploreGateway from '@/pages/ExploreGateway';
import ExploreSession from '@/pages/ExploreSession';
import CreatePortal from '@/pages/CreatePortal';
import Profile from '@/pages/Profile';
import FounderVault from '@/pages/FounderVault';
const MeetingDetail = lazy(() => import('@/pages/MeetingDetail'));
const DecisionDetail = lazy(() => import('@/pages/DecisionDetail'));
import MinutesArchive from '@/pages/MinutesArchive';
import NotificationPreferences from '@/pages/NotificationPreferences';
import VerifyRecord from '@/pages/VerifyRecord';
import GuestItemView from '@/pages/GuestItemView';
import ActionExtractView from '@/pages/ActionExtractView';
import GovernancePolicies from '@/pages/GovernancePolicies';
import SovereignStandards from '@/pages/SovereignStandards';
import ActivityLog from '@/pages/ActivityLog';
import AuditTrail from '@/pages/AuditTrail';
import PublicCommittees from '@/pages/PublicCommittees';
import PublicAIRegister from '@/pages/PublicAIRegister';
import NationalAdoptionShowcase from '@/pages/NationalAdoptionShowcase';
import LegacyCommitteeRedirect from '@/components/routing/LegacyCommitteeRedirect';
import LegacyRecordRedirect from '@/components/routing/LegacyRecordRedirect';
import ParamRedirect from '@/components/routing/ParamRedirect';
// Central institutional identity register — platform administration only.
const OrganizationAssetsAdmin = lazy(() => import('@/pages/OrganizationAssetsAdmin'));

// Organization Portal (Level 2) — loaded on entering the portal, not on first paint.
const OrgLayout = lazy(() => import('@/components/raqeem/OrgLayout'));
const OrgPortal = lazy(() => import('@/pages/OrgPortal'));
const OrgCommittees = lazy(() => import('@/pages/OrgCommittees'));
const OrgNotifications = lazy(() => import('@/pages/OrgNotifications'));
const OrgAdmin = lazy(() => import('@/pages/OrgAdmin'));
const CommitteeCreateV2 = lazy(() => import('@/pages/CommitteeCreateV2'));

// Committee Workspace (Level 3) — the whole shell is code-split: ~40 surfaces load only
// when a committee route is actually opened.
const CommitteeLayout = lazy(() => import('@/components/raqeem/CommitteeLayout'));
const CommitteeHome = lazy(() => import('@/pages/committee/CommitteeHome'));
const CommitteeMembers = lazy(() => import('@/pages/committee/CommitteeMembers'));
const CommitteeFormation = lazy(() => import('@/pages/committee/CommitteeFormation'));
const CommitteeEstablishment = lazy(() => import('@/pages/committee/CommitteeEstablishment'));
const FormationHistory = lazy(() => import('@/pages/committee/FormationHistory'));
const CommitteeAmendments = lazy(() => import('@/pages/committee/CommitteeAmendments'));
const CommitteeRoles = lazy(() => import('@/pages/committee/CommitteeRoles'));
const CommitteeDelegations = lazy(() => import('@/pages/committee/CommitteeDelegations'));
const CommitteeAlternates = lazy(() => import('@/pages/committee/CommitteeAlternates'));
const CommitteeRecusals = lazy(() => import('@/pages/committee/CommitteeRecusals'));
const CommitteeCalendar = lazy(() => import('@/pages/committee/CommitteeCalendar'));
const CommitteeAgenda = lazy(() => import('@/pages/committee/CommitteeAgenda'));
const CommitteePacks = lazy(() => import('@/pages/committee/CommitteePacks'));
const CommitteeAttendance = lazy(() => import('@/pages/committee/CommitteeAttendance'));
const CommitteeDocuments = lazy(() => import('@/pages/committee/CommitteeDocuments'));
const DocumentDetail = lazy(() => import('@/pages/committee/DocumentDetail'));
const CommitteeMinutes = lazy(() => import('@/pages/committee/CommitteeMinutes'));
const CommitteeSignatures = lazy(() => import('@/pages/committee/CommitteeSignatures'));
const CommitteeDecisions = lazy(() => import('@/pages/committee/CommitteeDecisions'));
const CommitteeActions = lazy(() => import('@/pages/committee/CommitteeActions'));
const CommitteeVoting = lazy(() => import('@/pages/committee/CommitteeVoting'));
const CommitteeEvidence = lazy(() => import('@/pages/committee/CommitteeEvidence'));
const CommitteeDependencies = lazy(() => import('@/pages/committee/CommitteeDependencies'));
const CommitteeEscalations = lazy(() => import('@/pages/committee/CommitteeEscalations'));
const CommitteeRisks = lazy(() => import('@/pages/committee/CommitteeRisks'));
const CommitteeReports = lazy(() => import('@/pages/committee/CommitteeReports'));
const CommitteeMemory = lazy(() => import('@/pages/committee/CommitteeMemory'));
const CommitteeAI = lazy(() => import('@/pages/committee/CommitteeAI'));
const CommitteeAudit = lazy(() => import('@/pages/committee/CommitteeAudit'));
const CommitteeMandate = lazy(() => import('@/pages/committee/CommitteeMandate'));
const CommitteeGovernanceRules = lazy(() => import('@/pages/committee/CommitteeGovernanceRules'));
const CommitteeIntegrations = lazy(() => import('@/pages/committee/CommitteeIntegrations'));
const CommitteeNotifications = lazy(() => import('@/pages/committee/CommitteeNotifications'));
const CommitteeClosure = lazy(() => import('@/pages/committee/CommitteeClosure'));
const CommitteeSettings = lazy(() => import('@/pages/committee/CommitteeSettings'));
const ProductCatalog = lazy(() => import('@/pages/committee/ProductCatalog'));
const CommitteeWorkstreams = lazy(() => import('@/pages/committee/CommitteeWorkstreams'));
const WorkstreamDetail = lazy(() => import('@/pages/committee/WorkstreamDetail'));
const PeopleFormationHub = lazy(() => import('@/pages/committee/hubs/PeopleFormationHub'));
const MeetingsHub = lazy(() => import('@/pages/committee/hubs/MeetingsHub'));
const RecordsHub = lazy(() => import('@/pages/committee/hubs/RecordsHub'));
const ExecutionHub = lazy(() => import('@/pages/committee/hubs/ExecutionHub'));
const IntelligenceHub = lazy(() => import('@/pages/committee/hubs/IntelligenceHub'));
const GovernanceHub = lazy(() => import('@/pages/committee/hubs/GovernanceHub'));
const DocumentationHub = lazy(() => import('@/pages/committee/DocumentationHub'));

// Route-level code splitting: a lazily loaded surface shows this while its chunk arrives.
const RouteLoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const { isDemoMode } = useEffectiveActor();

  // Demo mode bypasses auth loading/error checks — falls through to the same
  // <Routes> below. ProtectedRoute (already updated) lets demo mode through.
  if (!isDemoMode && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isDemoMode && authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
    <Routes>
      <Route path="/" element={<EntryPortal />} />
      {/* Explore LIJAN — one gateway, one governed session, one stable route per persona */}
      <Route path="/explore" element={<ExploreGateway />} />
      <Route path="/explore/:personaSlug" element={<ExploreSession />} />
      <Route path="/create-portal" element={<CreatePortal />} />
      <Route path="/governance-policies" element={<GovernancePolicies />} />
      <Route path="/sovereign-standards" element={<SovereignStandards />} />
      <Route path="/committees-registry" element={<PublicCommittees />} />
      <Route path="/ai-register" element={<PublicAIRegister />} />
      <Route path="/verify/:type/:id" element={<VerifyRecord />} />
      {/* Item-scoped guest invitation link — no account, no app role: the token is the capability. */}
      <Route path="/guest/:token" element={<GuestItemView />} />
      {/* Obligation-scoped execution extract — one act of execution, reached by a capability link. */}
      <Route path="/extract/:token" element={<ActionExtractView />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Retired public routes → their current home */}
      <Route path="/institutions/new" element={<Navigate to="/create-portal" replace />} />
      <Route path="/dr-hamad-experience/*" element={<Navigate to="/explore/dr-hamad" replace />} />

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
          <Route path="/o/:orgRef/c/:committeeRef/workstreams" element={<CommitteeWorkstreams />} />
          <Route path="/o/:orgRef/c/:committeeRef/workstreams/:workstreamId" element={<WorkstreamDetail />} />
          {/* Work Groups — the same governed surfaces under their published name */}
          <Route path="/o/:orgRef/c/:committeeRef/work-groups" element={<CommitteeWorkstreams />} />
          <Route path="/o/:orgRef/c/:committeeRef/work-groups/:workstreamId" element={<WorkstreamDetail />} />
          <Route path="/o/:orgRef/c/:committeeRef/meetings/:id" element={<MeetingDetail />} />
          <Route path="/o/:orgRef/c/:committeeRef/calendar" element={<CommitteeCalendar />} />
          <Route path="/o/:orgRef/c/:committeeRef/agenda" element={<CommitteeAgenda />} />
          <Route path="/o/:orgRef/c/:committeeRef/packs" element={<CommitteePacks />} />
          <Route path="/o/:orgRef/c/:committeeRef/attendance" element={<CommitteeAttendance />} />
          {/* Official Records */}
          <Route path="/o/:orgRef/c/:committeeRef/documents" element={<CommitteeDocuments />} />
          <Route path="/o/:orgRef/c/:committeeRef/documents/:documentId" element={<DocumentDetail />} />
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
          <Route path="/o/:orgRef/c/:committeeRef/documentation" element={<DocumentationHub />} />
        </Route>

        {/* Central institutional identity register */}
        <Route path="/organization-assets" element={<OrganizationAssetsAdmin />} />

        {/* Administrative oversight logs */}
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/audit-trail" element={<AuditTrail />} />

        {/* Deliberations Archive */}
        <Route path="/minutes-archive" element={<MinutesArchive />} />

        {/* Notification Preferences */}
        <Route path="/notification-preferences" element={<NotificationPreferences />} />

        {/* National Committee Adoption & Impact Showcase — founder/admin only */}
        <Route path="/national-adoption-showcase" element={<NationalAdoptionShowcase />} />

        {/* Legacy detail routes — scope is recovered from the record itself, server-authorized */}
        <Route path="/meetings/:id" element={<LegacyRecordRedirect kind="meetings" />} />
        <Route path="/decisions/:id" element={<LegacyRecordRedirect kind="decisions" />} />
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
        <Route path="/admin/*" element={<Navigate to="/" replace />} />
        <Route path="/committees/new" element={<Navigate to="/" replace />} />
        <Route path="/committees/:id" element={<LegacyCommitteeRedirect />} />
        <Route path="/o/:orgRef/c/:committeeRef/charter" element={<ParamRedirect to="/o/:orgRef/c/:committeeRef/establishment" />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <LanguageProvider>
          <EffectiveActorProvider>
          <Router>
            <ScrollToTop />
            <AutoFullscreen />
            <NativeAppShell />
            <AmeenProvider>
              {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
              <AuthenticatedApp />
              <AmeenLauncher />
            </AmeenProvider>
          </Router>
          <Toaster />
          </EffectiveActorProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App