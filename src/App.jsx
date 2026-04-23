import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import ReportForm from "./pages/ReportForm";
import PendingReports from "./pages/PendingReports";
import ReportHistory from "./pages/ReportHistory";
import About from "./pages/About";
import Marketplace from "./pages/Marketplace";
import Analytics from "./pages/Analytics";
import ReportView from "./pages/ReportView";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, checkAppState } = useAuth();

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
      navigateToLogin();
      return null;
    } else {
      // Unknown/network error — show a retry screen instead of crashing
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
          <p className="text-lg font-semibold text-gray-700">Unable to load app</p>
          <p className="text-sm text-gray-500">{authError.message || "Please check your connection and try again."}</p>
          <button
            className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            onClick={() => checkAppState()}
          >
            Retry
          </button>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Add your page Route elements here */}
      <Route path="/" element={<ReportForm />} />
      <Route path="/pending" element={<PendingReports />} />
      <Route path="/history" element={<ReportHistory />} />
      <Route path="/about" element={<About />} />
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public route - no auth required */}
            <Route path="/report/:id" element={<ReportView />} />
            {/* All other routes require authentication */}
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App