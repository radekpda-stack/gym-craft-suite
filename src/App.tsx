import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Trainings from "./pages/Trainings";
import TrainingDetail from "./pages/TrainingDetail";
import Diagnostics from "./pages/Diagnostics";
import Measurements from "./pages/Measurements";
import CalendarPage from "./pages/CalendarPage";
import CanceledTrainings from "./pages/CanceledTrainings";
import Settings from "./pages/Settings";
import AIAssistant from "./pages/AIAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
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
                    <Route path="/diagnostics" element={<Diagnostics />} />
                    <Route path="/measurements" element={<Measurements />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/canceled" element={<CanceledTrainings />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/ai-assistant" element={<AIAssistant />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
