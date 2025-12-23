import { useEffect } from 'react';
import { useDemoMode } from '@/contexts/DemoContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardFiltersProvider } from '@/contexts/DashboardFiltersContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import Index from './Index';
import Clients from './Clients';
import Trainings from './Trainings';
import Settings from './Settings';
import NotFound from './NotFound';

export default function DemoPage() {
  const { isDemo } = useDemoMode();

  // Set noindex meta tag for demo
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'DEMO Mode - Trainer App';
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  if (!isDemo) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardFiltersProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/trainings" element={<Trainings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </DashboardFiltersProvider>
  );
}
