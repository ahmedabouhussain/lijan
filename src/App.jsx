import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import Layout from '@/components/raqeem/Layout';
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
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/committees" element={<Committees />} />
        <Route path="/committees/new" element={<CommitteeCreate />} />
        <Route path="/committees/:id" element={<CommitteeDetail />} />
        <Route path="/decisions" element={<Decisions />} />
        <Route path="/execution" element={<Execution />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/founder-vault" element={<FounderVault />} />
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