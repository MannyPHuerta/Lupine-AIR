import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { WorkingBranchProvider } from '@/lib/WorkingBranchContext';
import { base44 } from '@/api/base44Client';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import Store from "./pages/Store";
import EventStore from "./pages/EventStore";
import AIRWebsite from "./pages/AIRWebsite";
import AIRental from "./pages/AIRental";
import AIREvents from "./pages/AIREvents";
import AIRfq from "./pages/AIRfq";
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
import AvailabilityCalendar from "./pages/AvailabilityCalendar";
import Customers from "./pages/Customers";
import DeliveryMatrixPage from "./pages/DeliveryMatrixPage";
import DiscountManager from "./pages/DiscountManager";
import DepreciationReport from "./pages/DepreciationReport";
import CategoryManager from "./pages/CategoryManager";
import AvailabilityConfigPage from "./pages/AvailabilityConfigPage.jsx";
import RoleManager from "./pages/RoleManager";
import AuditLogDashboard from "./pages/AuditLogDashboard";
import BrandingSettings from "./pages/BrandingSettings";
import Counter from "./pages/Counter";
import ManagerDashboard from "./pages/ManagerDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import DeliveryDetail from "./pages/DeliveryDetail";
import DeliveryAssignment from "./pages/DeliveryAssignment";
import RecoveryDetail from "./pages/RecoveryDetail";
import DispatchBoard from "./pages/DispatchBoard";
import AIReports from "./pages/AIReports";
import EventPlanner from "./pages/EventPlanner";
import AccountingDashboard from "./pages/AccountingDashboard";
import DailyOps from "./pages/DailyOps";
import PlannerQueue from "./pages/PlannerQueue";
import AIRepair from "./pages/AIRepair";
import GitHubPRDashboard from "./pages/GitHubPRDashboard";
import RepairManagerReport from "./pages/RepairManagerReport";
import ShopFloor from "./pages/ShopFloor";
import PartsProcurementReport from "./pages/PartsProcurementReport";
import InspectionQueue from "./pages/InspectionQueue";
import EmployeeProfileManager from "./pages/EmployeeProfileManager";
import LaundryDashboard from "./pages/LaundryDashboard";
import AppLayout from "./components/AppLayout";
import InventoryExport from "./pages/InventoryExport";
import EquipmentSpecsEditor from "./pages/EquipmentSpecsEditor";
import RentalAgreementManager from "./pages/RentalAgreementManager";
import LoyaltyManager from "./pages/LoyaltyManager";
import AIRoads from "./pages/AIRoads";
import LaundryReport from "./pages/LaundryReport";
import DriverReport from "./pages/DriverReport";
import RFQManager from "./pages/RFQManager";
import RFQDetail from "./pages/RFQDetail";
import RFQTemplates from "./pages/RFQTemplates";
import AgreementSigningFlow from "./pages/AgreementSigningFlow";
import Timesheets from "./pages/Timesheets";
import ClockIn from "./pages/ClockIn";
import AIRecovery from "./pages/AIRecovery";
import GPSProviderSettings from "./pages/GPSProviderSettings";
import UserManagement from "./pages/UserManagement";
import DataExport from "./pages/DataExport";
import DemoManager from "./pages/DemoManager";
import Leaderboard from "./pages/Leaderboard";
import SignIn from "./pages/SignIn";
import AITraining from "./pages/AITraining";
import FeatureMatrix from "./pages/FeatureMatrix";
import RFIDSettings from "./pages/RFIDSettings";
import RtoDashboard from "./pages/RtoDashboard";
import DemoDataSeeder from "./pages/DemoDataSeeder";
import SupabaseTest from "./pages/SupabaseTest";

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

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (!isLoadingAuth && !isAuthenticated) {
    base44.auth.redirectToLogin(window.location.pathname);
    return null;
  }

  // Render the main app
  return (
    <Routes>
      {/* All internal routes wrapped in sidebar layout */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<DailyOps />} />
        <Route path="/about" element={<About />} />
        <Route path="/accounting" element={<AccountingDashboard />} />
        <Route path="/agreement-signing" element={<AgreementSigningFlow />} />
        <Route path="/airecovery" element={<AIRecovery />} />
        <Route path="/aireports" element={<AIReports />} />
        <Route path="/airepair" element={<AIRepair />} />
        <Route path="/airoads" element={<AIRoads />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/assign-deliveries" element={<DeliveryAssignment />} />
        <Route path="/audit-logs" element={<AuditLogDashboard />} />
        <Route path="/availability" element={<AvailabilityManager />} />
        <Route path="/availability-calendar" element={<AvailabilityCalendar />} />
        <Route path="/availability-config" element={<AvailabilityConfigPage />} />
        <Route path="/branding" element={<BrandingSettings />} />
        <Route path="/branch-settings" element={<BranchSettingsPage />} />
        <Route path="/catalog-review" element={<CatalogReview />} />
        <Route path="/categories" element={<CategoryManager />} />
        <Route path="/company-settings" element={<CompanySettingsPage />} />
        <Route path="/contact-review" element={<ContactReview />} />
        <Route path="/converter" element={<DbfConverter />} />
        <Route path="/counter" element={<Counter />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/data-export" element={<DataExport />} />
        <Route path="/delivery/:id" element={<DeliveryDetail />} />
        <Route path="/delivery-matrix" element={<DeliveryMatrixPage />} />
        <Route path="/demand-patterns" element={<DemandPatterns />} />
        <Route path="/demo-manager" element={<DemoManager />} />
        <Route path="/dependencies-editor" element={<DependenciesEditor />} />
        <Route path="/depreciation" element={<DepreciationReport />} />
        <Route path="/discounts" element={<DiscountManager />} />
        <Route path="/dispatch" element={<DispatchBoard />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/driver-report" element={<DriverReport />} />
        <Route path="/employee-profiles" element={<EmployeeProfileManager />} />
        <Route path="/equipment/:id" element={<EquipmentDetail />} />
        <Route path="/equipment-specs" element={<EquipmentSpecsEditor />} />
        <Route path="/equipment-status" element={<EquipmentStatusManager />} />
        <Route path="/event-planner" element={<EventPlanner />} />
        <Route path="/event-planner/:planId" element={<EventPlanner />} />
        <Route path="/github-prs" element={<GitHubPRDashboard />} />
        <Route path="/gps-settings" element={<GPSProviderSettings />} />
        <Route path="/history" element={<ReportHistory />} />
        <Route path="/inspection-queue" element={<InspectionQueue />} />
        <Route path="/inventory-export" element={<InventoryExport />} />
        <Route path="/inventory-health" element={<InventoryHealth />} />
        <Route path="/laundry" element={<LaundryDashboard />} />
        <Route path="/laundry-report" element={<LaundryReport />} />
        <Route path="/legacy-mapper" element={<LegacyMapper />} />
        <Route path="/loyalty-manager" element={<LoyaltyManager />} />
        <Route path="/lupine" element={<LupinePlan />} />
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/parts-procurement" element={<PartsProcurementReport />} />
        <Route path="/pending" element={<PendingReports />} />
        <Route path="/planner-queue" element={<PlannerQueue />} />
        <Route path="/pricing-editor" element={<PricingEditor />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/recovery/:id" element={<RecoveryDetail />} />
        <Route path="/rental-agreement" element={<RentalAgreementManager />} />
        <Route path="/rental-history" element={<RentalHistory />} />
        <Route path="/repair-manager-report" element={<RepairManagerReport />} />
        <Route path="/report-form" element={<ReportForm />} />
        <Route path="/rfq" element={<RFQManager />} />
        <Route path="/rfq/templates" element={<RFQTemplates />} />
        <Route path="/rfq/:id" element={<RFQDetail />} />
        <Route path="/roles" element={<RoleManager />} />
        <Route path="/shop-floor" element={<ShopFloor />} />
        <Route path="/staff-phones" element={<StaffPhoneManager />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/ai-training" element={<AITraining />} />
        <Route path="/feature-matrix" element={<FeatureMatrix />} />
        <Route path="/rfid-settings" element={<RFIDSettings />} />
        <Route path="/rto-dashboard" element={<RtoDashboard />} />
        <Route path="/demo-seeder" element={<DemoDataSeeder />} />
        <Route path="/supabase-test" element={<SupabaseTest />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <WorkingBranchProvider>
        <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Public routes - no auth required */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/store" element={<Store />} />
            <Route path="/store/events" element={<EventStore />} />
            <Route path="/air" element={<AIRWebsite />} />
            <Route path="/airental" element={<AIRental />} />
            <Route path="/airevents" element={<AIREvents />} />
            <Route path="/airfq" element={<AIRfq />} />
            <Route path="/report/:id" element={<ReportView />} />
            <Route path="/clockin" element={<ClockIn />} />
            {/* All other routes require authentication */}
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
      </WorkingBranchProvider>
    </AuthProvider>
  )
}

export default App