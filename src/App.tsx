import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LanguageProvider } from "@/lib/i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SessionTrackingProvider } from "@/components/SessionTrackingProvider";
import { DashboardFiltersProvider } from "@/contexts/DashboardFiltersContext";
import { UndoProvider } from "@/contexts/UndoContext";
import { TrainingModeProvider } from "@/contexts/TrainingModeContext";
import { DemoProvider } from "@/contexts/DemoContext";
import { UndoToast } from "@/components/ui/UndoToast";
import { ClientPortalShell } from "@/components/client-portal/ClientPortalShell";
import { PageLoader } from "@/components/PageLoader";
import { ThemeProvider } from "@/hooks/useTheme";
import { InteractionTracker } from "@/lib/analytics/interaction";
import { LazyRouteWrapper } from "@/components/LazyRouteWrapper";
import { OrientationLock } from "@/components/OrientationLock";

// Eagerly loaded (critical path)
import UnifiedLogin from "./pages/UnifiedLogin";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - Main app
const Index = lazy(() => import("./pages/Index"));
const TrainingModePage = lazy(() => import("./pages/TrainingModePage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));
const WaitingForApproval = lazy(() => import("./pages/WaitingForApproval"));
const UserApprovals = lazy(() => import("./pages/admin/UserApprovals"));
const PerformanceImport = lazy(() => import("./pages/admin/PerformanceImport"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const TrainingDetail = lazy(() => import("./pages/TrainingDetail"));
const Records = lazy(() => import("./pages/Records"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const Settings = lazy(() => import("./pages/Settings"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const FeedbackOverview = lazy(() => import("./pages/FeedbackOverview"));
const PublicNutritionLog = lazy(() => import("./pages/PublicNutritionLog"));
const PublicChallenge = lazy(() => import("./pages/PublicChallenge"));
const Sales = lazy(() => import("./pages/Sales"));
// PRHistory is now integrated into PerformanceHub
const AppUsageStats = lazy(() => import("./pages/AppUsageStats"));
const Statistics = lazy(() => import("./pages/Statistics"));
const PreDiagnosticFormPage = lazy(() => import("./pages/PreDiagnosticFormPage"));
const ClientIntakePage = lazy(() => import("./pages/ClientIntakePage"));
const PerformanceHub = lazy(() => import("./pages/PerformanceHub"));
const ExerciseDetail = lazy(() => import("./pages/ExerciseDetail"));
// ExerciseAnalytics, ClientAnalytics, FinanceAnalytics removed - integrated into Statistics and PerformanceHub
const TestDetail = lazy(() => import("./pages/TestDetail"));
const NutritionPage = lazy(() => import("./pages/NutritionPage"));
const NutritionClientDetail = lazy(() => import("./pages/NutritionClientDetail"));
const TrainingTemplates = lazy(() => import("./pages/TrainingTemplates"));
const RxWorkouts = lazy(() => import("./pages/RxWorkouts"));
const ClientPortalAdmin = lazy(() => import("./pages/ClientPortalAdmin"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
// PriceMigration removed - migration completed
const Notes = lazy(() => import("./pages/Notes"));
const Expenses = lazy(() => import("./pages/Expenses"));
// FollowupsPage is now integrated into Dashboard via FollowupsSection

// Lazy loaded pages - Client Portal
const ClientPortalOverview = lazy(() => import("./pages/client-portal/ClientPortalOverview"));
const ClientPortalProgress = lazy(() => import("./pages/client-portal/ClientPortalProgress"));
const ClientPortalAttendance = lazy(() => import("./pages/client-portal/ClientPortalAttendance"));
const ClientPortalCredit = lazy(() => import("./pages/client-portal/ClientPortalCredit"));
const ClientPortalNutrition = lazy(() => import("./pages/client-portal/ClientPortalNutrition"));
const ClientPortalProfile = lazy(() => import("./pages/client-portal/ClientPortalProfile"));
const ClientPortalSettings = lazy(() => import("./pages/client-portal/ClientPortalSettings"));
// ClientPortalChallenges is now loaded via ClientPortalCompetitions wrapper
const ClientPortalWorkoutDiary = lazy(() => import("./pages/client-portal/ClientPortalWorkoutDiary"));
const ClientPortalBadges = lazy(() => import("./pages/client-portal/ClientPortalBadges"));
const ClientPortalLeaderboard = lazy(() => import("./pages/client-portal/ClientPortalLeaderboard"));
const ClientPortalCompetitions = lazy(() => import("./pages/client-portal/ClientPortalCompetitions"));
const ClientPortalRewards = lazy(() => import("./pages/client-portal/ClientPortalRewards"));
const ClientPortalPurchases = lazy(() => import("./pages/client-portal/ClientPortalPurchases"));
const ClientPortalHomework = lazy(() => import("./pages/client-portal/ClientPortalHomework"));
const ClientPortalChat = lazy(() => import("./pages/client-portal/ClientPortalChat"));
const ClientPortalDiagnostic = lazy(() => import("./pages/client-portal/ClientPortalDiagnostic"));

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
      <ThemeProvider>
        <LanguageProvider>
          <UndoProvider>
            <TooltipProvider>
              <OrientationLock />
              <OfflineBanner />
              <Toaster />
              <Sonner />
              <UndoToast />
            <TrainingModeProvider>
            <BrowserRouter>
            <InteractionTracker>
            <DemoProvider>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Unified login page */}
              <Route path="/login" element={<UnifiedLogin />} />
              {/* Legacy redirects */}
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/zona/login" element={<Navigate to="/login?mode=client" replace />} />
              <Route path="/client/login" element={<Navigate to="/login?mode=client" replace />} />
              
              <Route path="/waiting-for-approval" element={<WaitingForApproval />} />
              {/* Training Mode - standalone route without Layout */}
              <Route path="/training-mode" element={<ProtectedRoute><TrainingModePage /></ProtectedRoute>} />
              {/* Public feedback routes (no auth) */}
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/feedback/:token" element={<FeedbackPage />} />
              <Route path="/nutrition-log/:token" element={<PublicNutritionLog />} />
              <Route path="/pre-diagnostic/:token" element={<PreDiagnosticFormPage />} />
              <Route path="/intake/:token" element={<ClientIntakePage />} />
              {/* Public challenge page - no auth required */}
              <Route path="/challenge/:slug" element={<PublicChallenge />} />
              {/* Demo route - public, no auth required */}
              <Route path="/demo/*" element={<DemoPage />} />
              
              {/* Client Portal Routes - Short URL /zona */}
              <Route path="/zona" element={<LazyRouteWrapper><ClientPortalShell /></LazyRouteWrapper>}>
                <Route index element={<ClientPortalOverview />} />
                <Route path="progress" element={<ClientPortalProgress />} />
                <Route path="diary" element={<ClientPortalWorkoutDiary />} />
                <Route path="homework" element={<ClientPortalHomework />} />
                <Route path="attendance" element={<ClientPortalAttendance />} />
                <Route path="credit" element={<ClientPortalCredit />} />
                <Route path="purchases" element={<ClientPortalPurchases />} />
                <Route path="nutrition" element={<ClientPortalNutrition />} />
                {/* challenges redirects to competitions */}
                <Route path="challenges" element={<Navigate to="../competitions" replace />} />
                <Route path="badges" element={<ClientPortalBadges />} />
                <Route path="leaderboard" element={<ClientPortalLeaderboard />} />
                <Route path="competitions" element={<ClientPortalCompetitions />} />
                {/* odmeny is legacy, redirect to rewards */}
                <Route path="odmeny" element={<Navigate to="../rewards" replace />} />
                <Route path="rewards" element={<ClientPortalRewards />} />
                <Route path="profile" element={<ClientPortalProfile />} />
                <Route path="settings" element={<ClientPortalSettings />} />
                <Route path="chat" element={<ClientPortalChat />} />
                <Route path="diagnostic" element={<ClientPortalDiagnostic />} />
              </Route>
              
              {/* Legacy Client Portal Routes */}
              <Route path="/client" element={<LazyRouteWrapper><ClientPortalShell /></LazyRouteWrapper>}>
                <Route index element={<ClientPortalOverview />} />
                <Route path="progress" element={<ClientPortalProgress />} />
                <Route path="diary" element={<ClientPortalWorkoutDiary />} />
                <Route path="homework" element={<ClientPortalHomework />} />
                <Route path="attendance" element={<ClientPortalAttendance />} />
                <Route path="credit" element={<ClientPortalCredit />} />
                <Route path="purchases" element={<ClientPortalPurchases />} />
                <Route path="nutrition" element={<ClientPortalNutrition />} />
                {/* challenges redirects to competitions */}
                <Route path="challenges" element={<Navigate to="../competitions" replace />} />
                <Route path="badges" element={<ClientPortalBadges />} />
                <Route path="leaderboard" element={<ClientPortalLeaderboard />} />
                <Route path="competitions" element={<ClientPortalCompetitions />} />
                <Route path="rewards" element={<ClientPortalRewards />} />
                <Route path="profile" element={<ClientPortalProfile />} />
                <Route path="settings" element={<ClientPortalSettings />} />
                <Route path="chat" element={<ClientPortalChat />} />
              </Route>
              
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardFiltersProvider>
                      <SessionTrackingProvider>
                        <Layout>
                        <Routes>
                          <Route path="/" element={<LazyRouteWrapper><Index /></LazyRouteWrapper>} />
                          <Route path="/clients" element={<LazyRouteWrapper><Clients /></LazyRouteWrapper>} />
                          <Route path="/clients/:id" element={<LazyRouteWrapper><ClientDetail /></LazyRouteWrapper>} />
                          <Route path="/trainings/:id" element={<LazyRouteWrapper><TrainingDetail /></LazyRouteWrapper>} />
                          <Route path="/records" element={<LazyRouteWrapper><Records /></LazyRouteWrapper>} />
                          <Route path="/schedule" element={<LazyRouteWrapper><SchedulePage /></LazyRouteWrapper>} />
                          <Route path="/settings" element={<LazyRouteWrapper><Settings /></LazyRouteWrapper>} />
                          <Route path="/feedback-overview" element={<LazyRouteWrapper><FeedbackOverview /></LazyRouteWrapper>} />
                          <Route path="/sales" element={<LazyRouteWrapper><Sales /></LazyRouteWrapper>} />
                          {/* Legacy PR History redirect */}
                          <Route path="/pr-history" element={<Navigate to="/performance?tab=pr-history" replace />} />
                          <Route path="/app-usage" element={<LazyRouteWrapper><AppUsageStats /></LazyRouteWrapper>} />
                          <Route path="/statistics" element={<LazyRouteWrapper><Statistics /></LazyRouteWrapper>} />
                          {/* Legacy analytics routes - redirect to integrated modules */}
                          <Route path="/statistics/analytics" element={<Navigate to="/statistics?tab=finance" replace />} />
                          <Route path="/clients/analytics" element={<Navigate to="/statistics?tab=clients" replace />} />
                          <Route path="performance" element={<LazyRouteWrapper><PerformanceHub /></LazyRouteWrapper>} />
                          <Route path="exercises/analytics" element={<Navigate to="/performance?tab=analytics" replace />} />
                          <Route path="exercises/:id" element={<LazyRouteWrapper><ExerciseDetail /></LazyRouteWrapper>} />
                          <Route path="tests/:id" element={<LazyRouteWrapper><TestDetail /></LazyRouteWrapper>} />
                          <Route path="/nutrition" element={<LazyRouteWrapper><NutritionPage /></LazyRouteWrapper>} />
                          <Route path="/nutrition/client/:clientId" element={<LazyRouteWrapper><NutritionClientDetail /></LazyRouteWrapper>} />
                          {/* Legacy route - redirect to main nutrition page */}
                          <Route path="/nutrition/campaigns/:id" element={<Navigate to="/nutrition" replace />} />
                          <Route path="/training-templates" element={<LazyRouteWrapper><TrainingTemplates /></LazyRouteWrapper>} />
                          <Route path="/rx-workouts" element={<LazyRouteWrapper><RxWorkouts /></LazyRouteWrapper>} />
                          <Route path="/client-portal" element={<LazyRouteWrapper><ClientPortalAdmin /></LazyRouteWrapper>} />
                          
                          <Route path="/my-profile" element={<LazyRouteWrapper><MyProfile /></LazyRouteWrapper>} />
                          <Route path="/notes" element={<LazyRouteWrapper><Notes /></LazyRouteWrapper>} />
                          <Route path="/expenses" element={<LazyRouteWrapper><Expenses /></LazyRouteWrapper>} />
                          {/* Legacy followups redirect - now integrated in Dashboard */}
                          <Route path="/pripomenuti" element={<Navigate to="/" replace />} />
                          <Route path="/admin/user-approvals" element={<LazyRouteWrapper><UserApprovals /></LazyRouteWrapper>} />
                          <Route path="/admin/performance-import" element={<LazyRouteWrapper><PerformanceImport /></LazyRouteWrapper>} />
                          {/* PriceMigration removed - migration completed */}
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
            </InteractionTracker>
          </BrowserRouter>
            </TrainingModeProvider>
          </TooltipProvider>
        </UndoProvider>
      </LanguageProvider>
    </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
