import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
// Add page imports here
import Layout from '@/components/raqeem/Layout';
import EntryPortal from '@/pages/EntryPortal';
import Home from '@/pages/Home';
import Committees from '@/pages/Committees';
import CommitteeCreate from '@/pages/CommitteeCreate';
import CommitteeDetail from '@/pages/CommitteeDetail';
import Decisions from '@/pages/Decisions';
import Execution from '@/pages/Execution';
import CalendarPage from '@/pages/CalendarPage';
import Memory from '@/pages/Memory';
import Admin from '@/pages/Admin';
import Integrations from '@/pages/Integrations';
import FounderVault from '@/pages/FounderVault';
import InstitutionCreate from '@/pages/InstitutionCreate';
import Profile from '@/pages/Profile';
import MeetingDetail from '@/pages/MeetingDetail';
import DecisionDetail from '@/pages/DecisionDetail';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<EntryPortal />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Home />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/committees/new" element={<CommitteeCreate />} />
          <Route path="/committees/:id" element={<CommitteeDetail />} />
          <Route path="/meetings/:id" element={<MeetingDetail />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/decisions/:id" element={<DecisionDetail />} />
          <Route path="/execution" element={<Execution />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/institutions/new" element={<InstitutionCreate />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/founder-vault" element={<FounderVault />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App