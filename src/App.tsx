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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DemoPage from "./pages/DemoPage";
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
import Reminders from "./pages/Reminders";
import AppUsageStats from "./pages/AppUsageStats";
import Statistics from "./pages/Statistics";
// import TrainingPlans from "./pages/TrainingPlans"; // Hidden
// import TrainingPlanDetail from "./pages/TrainingPlanDetail"; // Hidden
import NotFound from "./pages/NotFound";

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
              <Route path="/feedback/:token" element={<FeedbackPage />} />
              <Route path="/nutrition-log/:token" element={<PublicNutritionLog />} />
              {/* Demo route - public, no auth required */}
              <Route path="/demo/*" element={<DemoPage />} />
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
                          <Route path="/reminders" element={<Reminders />} />
                          <Route path="/app-usage" element={<AppUsageStats />} />
                          <Route path="/statistics" element={<Statistics />} />
                          {/* <Route path="/training-plans" element={<TrainingPlans />} /> */} {/* Hidden */}
                          {/* <Route path="/training-plans/:id" element={<TrainingPlanDetail />} /> */} {/* Hidden */}
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
