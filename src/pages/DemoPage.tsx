import { useEffect } from 'react';
import { useDemoMode } from '@/contexts/DemoContext';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DemoDashboard, DemoClients, DemoTrainings, DemoSettings, DemoLayout } from '@/components/demo';

export default function DemoPage() {
  const { isDemo } = useDemoMode();
  const location = useLocation();

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
    return <Navigate to="/login" replace />;
  }

  return (
    <DemoLayout>
      <Routes>
        <Route path="/" element={<DemoDashboard />} />
        <Route path="/clients" element={<DemoClients />} />
        <Route path="/trainings" element={<DemoTrainings />} />
        <Route path="/settings" element={<DemoSettings />} />
        <Route path="*" element={<Navigate to="/demo" replace />} />
      </Routes>
    </DemoLayout>
  );
}
