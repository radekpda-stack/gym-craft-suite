import { Suspense, lazy } from "react";
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
import { PageLoader } from "@/components/PageLoader";

// Eagerly loaded (critical path)
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - Main app
const Index = lazy(() => import("./pages/Index"));
const DemoPage = lazy(() => import("./pages/DemoPage"));
const WaitingForApproval = lazy(() => import("./pages/WaitingForApproval"));
const UserApprovals = lazy(() => import("./pages/admin/UserApprovals"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const Trainings = lazy(() => import("./pages/Trainings"));
const TrainingDetail = lazy(() => import("./pages/TrainingDetail"));
const Records = lazy(() => import("./pages/Records"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const CanceledTrainings = lazy(() => import("./pages/CanceledTrainings"));
const Settings = lazy(() => import("./pages/Settings"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const FeedbackOverview = lazy(() => import("./pages/FeedbackOverview"));
const PublicNutritionLog = lazy(() => import("./pages/PublicNutritionLog"));
const Sales = lazy(() => import("./pages/Sales"));
const PRHistory = lazy(() => import("./pages/PRHistory"));
const AppUsageStats = lazy(() => import("./pages/AppUsageStats"));
const Statistics = lazy(() => import("./pages/Statistics"));
const PreDiagnosticFormPage = lazy(() => import("./pages/PreDiagnosticFormPage"));
const ClientIntakePage = lazy(() => import("./pages/ClientIntakePage"));
const Exercises = lazy(() => import("./pages/Exercises"));
const ExerciseDetail = lazy(() => import("./pages/ExerciseDetail"));
const ExerciseAnalytics = lazy(() => import("./pages/ExerciseAnalytics"));
const ClientAnalytics = lazy(() => import("./pages/ClientAnalytics"));
const Tests = lazy(() => import("./pages/Tests"));
const TestDetail = lazy(() => import("./pages/TestDetail"));
const FinanceAnalytics = lazy(() => import("./pages/FinanceAnalytics"));
const NutritionOverview = lazy(() => import("./pages/NutritionOverview"));
const NutritionCampaigns = lazy(() => import("./pages/NutritionCampaigns"));
const NutritionCampaignDetail = lazy(() => import("./pages/NutritionCampaignDetail"));
const NutritionAnalysis = lazy(() => import("./pages/NutritionAnalysis"));
const NutritionTemplate = lazy(() => import("./pages/NutritionTemplate"));
const NutritionQuestionnaires = lazy(() => import("./pages/NutritionQuestionnaires"));
const NutritionInfographics = lazy(() => import("./pages/NutritionInfographics"));
const TrainingTemplates = lazy(() => import("./pages/TrainingTemplates"));
const ClientPortalAdmin = lazy(() => import("./pages/ClientPortalAdmin"));
const Challenges = lazy(() => import("./pages/Challenges"));

// Lazy loaded pages - Client Portal
const ClientPortalLogin = lazy(() => import("./pages/client-portal/ClientPortalLogin"));
const ClientPortalOverview = lazy(() => import("./pages/client-portal/ClientPortalOverview"));
const ClientPortalProgress = lazy(() => import("./pages/client-portal/ClientPortalProgress"));
const ClientPortalAttendance = lazy(() => import("./pages/client-portal/ClientPortalAttendance"));
const ClientPortalCredit = lazy(() => import("./pages/client-portal/ClientPortalCredit"));
const ClientPortalNutrition = lazy(() => import("./pages/client-portal/ClientPortalNutrition"));
const ClientPortalProfile = lazy(() => import("./pages/client-portal/ClientPortalProfile"));
const ClientPortalSettings = lazy(() => import("./pages/client-portal/ClientPortalSettings"));
const ClientPortalChallenges = lazy(() => import("./pages/client-portal/ClientPortalChallenges"));
const ClientPortalWorkoutDiary = lazy(() => import("./pages/client-portal/ClientPortalWorkoutDiary"));

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
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
              {/* Public feedback routes (no auth) */}
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/feedback/:token" element={<FeedbackPage />} />
              <Route path="/nutrition-log/:token" element={<PublicNutritionLog />} />
              <Route path="/pre-diagnostic/:token" element={<PreDiagnosticFormPage />} />
              <Route path="/intake/:token" element={<ClientIntakePage />} />
              {/* Demo route - public, no auth required */}
              <Route path="/demo/*" element={<DemoPage />} />
              
              {/* Client Portal Routes - Short URL /zona */}
              <Route path="/zona/login" element={<ClientPortalLogin />} />
              <Route path="/zona" element={<ClientPortalShell />}>
                <Route index element={<ClientPortalOverview />} />
                <Route path="progress" element={<ClientPortalProgress />} />
                <Route path="diary" element={<ClientPortalWorkoutDiary />} />
                <Route path="attendance" element={<ClientPortalAttendance />} />
                <Route path="credit" element={<ClientPortalCredit />} />
                <Route path="nutrition" element={<ClientPortalNutrition />} />
                <Route path="challenges" element={<ClientPortalChallenges />} />
                <Route path="profile" element={<ClientPortalProfile />} />
                <Route path="settings" element={<ClientPortalSettings />} />
              </Route>
              
              {/* Legacy Client Portal Routes - Redirect to /zona */}
              <Route path="/client/login" element={<ClientPortalLogin />} />
              <Route path="/client" element={<ClientPortalShell />}>
                <Route index element={<ClientPortalOverview />} />
                <Route path="progress" element={<ClientPortalProgress />} />
                <Route path="diary" element={<ClientPortalWorkoutDiary />} />
                <Route path="attendance" element={<ClientPortalAttendance />} />
                <Route path="credit" element={<ClientPortalCredit />} />
                <Route path="nutrition" element={<ClientPortalNutrition />} />
                <Route path="challenges" element={<ClientPortalChallenges />} />
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
                          <Route path="/feedback-overview" element={<FeedbackOverview />} />
                          <Route path="/sales" element={<Sales />} />
                          <Route path="/pr-history" element={<PRHistory />} />
                          <Route path="/app-usage" element={<AppUsageStats />} />
                          <Route path="/statistics" element={<Statistics />} />
                          <Route path="/statistics/analytics" element={<FinanceAnalytics />} />
                          <Route path="/clients/analytics" element={<ClientAnalytics />} />
                          <Route path="/exercises" element={<Exercises />} />
                          <Route path="/exercises/analytics" element={<ExerciseAnalytics />} />
                          <Route path="/exercises/:id" element={<ExerciseDetail />} />
                          <Route path="/tests" element={<Tests />} />
                          <Route path="/tests/:id" element={<TestDetail />} />
                          <Route path="/nutrition" element={<NutritionOverview />} />
                          <Route path="/nutrition/campaigns" element={<NutritionCampaigns />} />
                          <Route path="/nutrition/campaigns/:id" element={<NutritionCampaignDetail />} />
                          <Route path="/nutrition/analysis" element={<NutritionAnalysis />} />
                          <Route path="/nutrition/template" element={<NutritionTemplate />} />
                          <Route path="/nutrition/questionnaires" element={<NutritionQuestionnaires />} />
                          <Route path="/nutrition/infographics" element={<NutritionInfographics />} />
                          <Route path="/training-templates" element={<TrainingTemplates />} />
                          <Route path="/client-portal" element={<ClientPortalAdmin />} />
                          <Route path="/challenges" element={<Challenges />} />
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
            </Suspense>
            </DemoProvider>
          </BrowserRouter>
          </TooltipProvider>
        </UndoProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
