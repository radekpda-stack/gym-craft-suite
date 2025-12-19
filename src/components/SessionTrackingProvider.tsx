import { useSessionTracking } from '@/hooks/useSessionTracking';

interface SessionTrackingProviderProps {
  children: React.ReactNode;
}

export function SessionTrackingProvider({ children }: SessionTrackingProviderProps) {
  // Initialize session tracking
  useSessionTracking();
  
  return <>{children}</>;
}
