import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import ReportForm from "./pages/ReportForm";
import PendingReports from "./pages/PendingReports";
import ReportHistory from "./pages/ReportHistory";
import About from "./pages/About";
import Marketplace from "./pages/Marketplace";
import Analytics from "./pages/Analytics";
import ReportView from "./pages/ReportView";
import DbfConverter from "./pages/DbfConverter";
import LegacyMapper from "./pages/LegacyMapper";
import ContactReview from "./pages/ContactReview";
import StaffPhoneManager from "./pages/StaffPhoneManager";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import LupinePlan from "./pages/LupinePlan";
import CatalogReview from "./pages/CatalogReview";
import AvailabilityManager from "./pages/AvailabilityManager.jsx";
import RentalHistory from "./pages/RentalHistory";
import PricingEditor from "./pages/PricingEditor";
import DependenciesEditor from "./pages/DependenciesEditor";
import BranchSettingsPage from "./pages/BranchSettingsPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import InventoryHealth from "./pages/InventoryHealth";
import DemandPatterns from "./pages/DemandPatterns";
import EquipmentStatusManager from "./pages/EquipmentStatusManager";
import EquipmentDetail from "./pages/EquipmentDetail";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, checkAppState } = useAuth();

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
    }
    if (authError.type === 'auth_required') {
      base44.auth.redirectToLogin();
      return null;
    }
  }

  // If no token at all, redirect to login
  if (!isLoadingAuth && !isAuthenticated) {
    base44.auth.redirectToLogin();
    return null;
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
      <Route path="/converter" element={<DbfConverter />} />
      <Route path="/legacy-mapper" element={<LegacyMapper />} />
      <Route path="/contact-review" element={<ContactReview />} />
      <Route path="/staff-phones" element={<StaffPhoneManager />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/lupine" element={<LupinePlan />} />
      <Route path="/catalog-review" element={<CatalogReview />} />
      <Route path="/availability" element={<AvailabilityManager />} />
      <Route path="/rental-history" element={<RentalHistory />} />
      <Route path="/pricing-editor" element={<PricingEditor />} />
      <Route path="/dependencies-editor" element={<DependenciesEditor />} />
      <Route path="/branch-settings" element={<BranchSettingsPage />} />
      <Route path="/company-settings" element={<CompanySettingsPage />} />
      <Route path="/inventory-health" element={<InventoryHealth />} />
      <Route path="/demand-patterns" element={<DemandPatterns />} />
      <Route path="/equipment-status" element={<EquipmentStatusManager />} />
      <Route path="/equipment/:id" element={<EquipmentDetail />} />
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