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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
import TrainingPlans from "./pages/TrainingPlans";
import TrainingPlanDetail from "./pages/TrainingPlanDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <OfflineBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/feedback/:token" element={<FeedbackPage />} />
              <Route path="/nutrition-log/:token" element={<PublicNutritionLog />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <SessionTrackingProvider>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/clients" element={<Clients />} />
                          <Route path="/clients/:id" element={<ClientDetail />} />
                          <Route path="/trainings" element={<Trainings />} />
                          <Route path="/trainings/:id" element={<TrainingDetail />} />
                          <Route path="/records" element={<Records />} />
                          {/* Redirects for old routes */}
                          <Route path="/measurements" element={<Navigate to="/records?tab=measurements" replace />} />
                          <Route path="/diagnostics" element={<Navigate to="/records?tab=diagnostics" replace />} />
                          <Route path="/progress" element={<Navigate to="/records?tab=progress" replace />} />
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/canceled" element={<CanceledTrainings />} />
                          <Route path="/settings" element={<Settings />} />
                          {/* <Route path="/ai-assistant" element={<AIAssistant />} /> */} {/* Hidden - AI feature disabled */}
                          <Route path="/feedback-overview" element={<FeedbackOverview />} />
                          <Route path="/sales" element={<Sales />} />
                          <Route path="/pr-history" element={<PRHistory />} />
                          <Route path="/reminders" element={<Reminders />} />
                          <Route path="/training-plans" element={<TrainingPlans />} />
                          <Route path="/training-plans/:id" element={<TrainingPlanDetail />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Layout>
                    </SessionTrackingProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
