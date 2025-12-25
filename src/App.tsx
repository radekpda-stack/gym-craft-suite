import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LanguageProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SessionTrackingProvider } from "@/components/SessionTrackingProvider";
import { DashboardFiltersProvider } from "@/contexts/DashboardFiltersContext";
import { UndoProvider } from "@/contexts/UndoContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { UndoToast } from "@/components/ui/UndoToast";
import { ClientPortalShell } from "@/components/client-portal/ClientPortalShell";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DemoPage from "./pages/DemoPage";
import WaitingForApproval from "./pages/WaitingForApproval";
import UserApprovals from "./pages/admin/UserApprovals";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Trainings from "./pages/Trainings";
import TrainingDetail from "./pages/TrainingDetail";
import Records from "./pages/Records";
import CalendarPage from "./pages/CalendarPage";
import CanceledTrainings from "./pages/CanceledTrainings";
import Settings from "./pages/Settings";
// import AIAssistant from "./pages/AIAssistant"; // Hidden - AI feature disabled
import FeedbackPage from "./pages/FeedbackPage";
import FeedbackOverview from "./pages/FeedbackOverview";
import PublicNutritionLog from "./pages/PublicNutritionLog";
import Sales from "./pages/Sales";
import PRHistory from "./pages/PRHistory";
// Reminders feature removed
import AppUsageStats from "./pages/AppUsageStats";
import Statistics from "./pages/Statistics";
import PreDiagnosticFormPage from "./pages/PreDiagnosticFormPage";
import Exercises from "./pages/Exercises";
import ExerciseDetail from "./pages/ExerciseDetail";
import ExerciseAnalytics from "./pages/ExerciseAnalytics";
import ClientAnalytics from "./pages/ClientAnalytics";
import FinanceAnalytics from "./pages/FinanceAnalytics";
// import TrainingPlans from "./pages/TrainingPlans"; // Hidden
// import TrainingPlanDetail from "./pages/TrainingPlanDetail"; // Hidden
import NutritionOverview from "./pages/NutritionOverview";
import NutritionCampaigns from "./pages/NutritionCampaigns";
import NutritionCampaignDetail from "./pages/NutritionCampaignDetail";
import NutritionAnalysis from "./pages/NutritionAnalysis";
import NutritionTemplate from "./pages/NutritionTemplate";
import NutritionQuestionnaires from "./pages/NutritionQuestionnaires";
import NutritionInfographics from "./pages/NutritionInfographics";
import TrainingTemplates from "./pages/TrainingTemplates";
import ClientPortalAdmin from "./pages/ClientPortalAdmin";
import NotFound from "./pages/NotFound";

// Client Portal Pages
import ClientPortalLogin from "./pages/client-portal/ClientPortalLogin";
import ClientPortalOverview from "./pages/client-portal/ClientPortalOverview";
import ClientPortalProgress from "./pages/client-portal/ClientPortalProgress";
import ClientPortalAttendance from "./pages/client-portal/ClientPortalAttendance";
import ClientPortalCredit from "./pages/client-portal/ClientPortalCredit";
import ClientPortalNutrition from "./pages/client-portal/ClientPortalNutrition";
import ClientPortalProfile from "./pages/client-portal/ClientPortalProfile";
import ClientPortalSettings from "./pages/client-portal/ClientPortalSettings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - data is fresh
      gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      retry: 1, // Only retry once on failure
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <UndoProvider>
          <TooltipProvider>
            <OfflineBanner />
            <Toaster />
            <Sonner />
            <UndoToast />
          <BrowserRouter>
            <DemoProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
              {/* Public feedback routes (no auth) */}
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/feedback/:token" element={<FeedbackPage />} />
              <Route path="/nutrition-log/:token" element={<PublicNutritionLog />} />
              <Route path="/pre-diagnostic/:token" element={<PreDiagnosticFormPage />} />
              {/* Demo route - public, no auth required */}
              <Route path="/demo/*" element={<DemoPage />} />
              
              {/* Client Portal Routes */}
              <Route path="/client/login" element={<ClientPortalLogin />} />
              <Route path="/client" element={<ClientPortalShell />}>
                <Route index element={<ClientPortalOverview />} />
                <Route path="progress" element={<ClientPortalProgress />} />
                <Route path="attendance" element={<ClientPortalAttendance />} />
                <Route path="credit" element={<ClientPortalCredit />} />
                <Route path="nutrition" element={<ClientPortalNutrition />} />
                <Route path="profile" element={<ClientPortalProfile />} />
                <Route path="settings" element={<ClientPortalSettings />} />
              </Route>
              
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardFiltersProvider>
                      <SessionTrackingProvider>
                        <Layout>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/clients" element={<Clients />} />
                          <Route path="/clients/:id" element={<ClientDetail />} />
                          <Route path="/trainings" element={<Trainings />} />
                          <Route path="/trainings/:id" element={<TrainingDetail />} />
                          <Route path="/records" element={<Records />} />
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/canceled" element={<CanceledTrainings />} />
                          <Route path="/settings" element={<Settings />} />
                          {/* <Route path="/ai-assistant" element={<AIAssistant />} /> */} {/* Hidden - AI feature disabled */}
                          <Route path="/feedback-overview" element={<FeedbackOverview />} />
                          <Route path="/sales" element={<Sales />} />
                          <Route path="/pr-history" element={<PRHistory />} />
                          {/* Reminders route removed */}
                          <Route path="/app-usage" element={<AppUsageStats />} />
                          <Route path="/statistics" element={<Statistics />} />
                          <Route path="/statistics/analytics" element={<FinanceAnalytics />} />
                          <Route path="/clients/analytics" element={<ClientAnalytics />} />
                          <Route path="/exercises" element={<Exercises />} />
                          <Route path="/exercises/analytics" element={<ExerciseAnalytics />} />
                          <Route path="/exercises/:id" element={<ExerciseDetail />} />
                          <Route path="/nutrition" element={<NutritionOverview />} />
                          <Route path="/nutrition/campaigns" element={<NutritionCampaigns />} />
                          <Route path="/nutrition/campaigns/:id" element={<NutritionCampaignDetail />} />
                          <Route path="/nutrition/analysis" element={<NutritionAnalysis />} />
                          <Route path="/nutrition/template" element={<NutritionTemplate />} />
                          <Route path="/nutrition/questionnaires" element={<NutritionQuestionnaires />} />
                          <Route path="/nutrition/infographics" element={<NutritionInfographics />} />
                          <Route path="/training-templates" element={<TrainingTemplates />} />
                          <Route path="/client-portal" element={<ClientPortalAdmin />} />
                          {/* <Route path="/training-plans/:id" element={<TrainingPlanDetail />} /> */} {/* Hidden */}
                          <Route path="/admin/user-approvals" element={<UserApprovals />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Layout>
                    </SessionTrackingProvider>
                  </DashboardFiltersProvider>
                </ProtectedRoute>
                }
              />
            </Routes>
            </DemoProvider>
          </BrowserRouter>
          </TooltipProvider>
        </UndoProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
