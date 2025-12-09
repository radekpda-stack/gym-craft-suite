import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LanguageProvider } from "@/lib/i18n";
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
import AIAssistant from "./pages/AIAssistant";
import FeedbackPage from "./pages/FeedbackPage";
import Sales from "./pages/Sales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/feedback/:token" element={<FeedbackPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
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
                      <Route path="/ai-assistant" element={<AIAssistant />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
