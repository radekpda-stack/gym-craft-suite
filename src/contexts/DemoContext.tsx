import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getDemoClient, getDemoTraining, getDemoDashboardStats, getDemoExercises, getDemoTags, resetDemoData, updateDemoClientData, updateDemoTrainingData, DemoClient, DemoTraining, DemoDashboardStats, DemoExercise, DemoTag } from '@/lib/demo-data';

// Virtual demo user - never stored in database
export const DEMO_USER = {
  id: 'demo-admin-0001',
  email: 'demo@internal.local',
  name: 'DEMO – Trainer',
  role: 'admin' as const,
  isDemo: true,
} as const;

// Admin email that can see demo link
export const DEMO_ADMIN_EMAIL = 'radek.pda@gmail.com';

// Demo mode limits
export const DEMO_LIMITS = {
  maxClients: 1,
  maxTrainings: 1,
  maxHistoryRecords: 1,
} as const;

interface DemoContextType {
  isDemo: boolean;
  demoUser: typeof DEMO_USER | null;
  
  // Demo data
  demoClient: DemoClient | null;
  demoTraining: DemoTraining | null;
  demoDashboardStats: DemoDashboardStats | null;
  demoExercises: DemoExercise[];
  demoTags: DemoTag[];
  
  // Demo actions
  updateDemoClient: (updates: Partial<DemoClient>) => void;
  updateDemoTraining: (updates: Partial<DemoTraining>) => void;
  resetDemo: () => void;
  
  // Validation
  canCreateClient: boolean;
  canCreateTraining: boolean;
  
  // Check if action is blocked
  isDemoBlocked: (action: 'payment' | 'email' | 'notification' | 'export' | 'realData') => boolean;
}

const DemoContext = createContext<DemoContextType | null>(null);

interface DemoProviderProps {
  children: ReactNode;
}

export function DemoProvider({ children }: DemoProviderProps) {
  const location = useLocation();
  
  // Detect demo mode from URL
  const isDemo = location.pathname.startsWith('/demo') || 
                 new URLSearchParams(location.search).get('mode') === 'demo_internal';
  
  // Demo state
  const [demoClient, setDemoClient] = useState<DemoClient | null>(null);
  const [demoTraining, setDemoTraining] = useState<DemoTraining | null>(null);
  const [demoDashboardStats, setDemoDashboardStats] = useState<DemoDashboardStats | null>(null);
  const [demoExercises, setDemoExercises] = useState<DemoExercise[]>([]);
  const [demoTags, setDemoTags] = useState<DemoTag[]>([]);
  
  // Initialize demo data when entering demo mode
  useEffect(() => {
    if (isDemo) {
      setDemoClient(getDemoClient());
      setDemoTraining(getDemoTraining());
      setDemoDashboardStats(getDemoDashboardStats());
      setDemoExercises(getDemoExercises());
      setDemoTags(getDemoTags());
    } else {
      // Clean up demo data when leaving demo mode
      setDemoClient(null);
      setDemoTraining(null);
      setDemoDashboardStats(null);
      setDemoExercises([]);
      setDemoTags([]);
    }
  }, [isDemo]);
  
  // Reset demo data on page reload (handled by React state reset)
  
  const updateDemoClient = useCallback((updates: Partial<DemoClient>) => {
    const updated = updateDemoClientData(updates);
    setDemoClient(updated);
  }, []);
  
  const updateDemoTraining = useCallback((updates: Partial<DemoTraining>) => {
    const updated = updateDemoTrainingData(updates);
    setDemoTraining(updated);
  }, []);
  
  const resetDemo = useCallback(() => {
    resetDemoData();
    setDemoClient(getDemoClient());
    setDemoTraining(getDemoTraining());
    setDemoDashboardStats(getDemoDashboardStats());
    setDemoExercises(getDemoExercises());
    setDemoTags(getDemoTags());
  }, []);
  
  const isDemoBlocked = useCallback((action: 'payment' | 'email' | 'notification' | 'export' | 'realData') => {
    if (!isDemo) return false;
    // All these actions are blocked in demo mode
    return true;
  }, [isDemo]);
  
  const value: DemoContextType = {
    isDemo,
    demoUser: isDemo ? DEMO_USER : null,
    demoClient,
    demoTraining,
    demoDashboardStats,
    demoExercises,
    demoTags,
    updateDemoClient,
    updateDemoTraining,
    resetDemo,
    canCreateClient: !isDemo || !demoClient, // Can only create if no demo client exists
    canCreateTraining: !isDemo || !demoTraining, // Can only create if no demo training exists
    isDemoBlocked,
  };
  
  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (!context) {
    // Return default non-demo state if used outside provider
    return {
      isDemo: false,
      demoUser: null,
      demoClient: null,
      demoTraining: null,
      demoDashboardStats: null,
      demoExercises: [],
      demoTags: [],
      updateDemoClient: () => {},
      updateDemoTraining: () => {},
      resetDemo: () => {},
      canCreateClient: true,
      canCreateTraining: true,
      isDemoBlocked: () => false,
    };
  }
  return context;
}

// Helper to check if current user can see demo link
export function canSeeDemoLink(userEmail: string | null | undefined): boolean {
  return userEmail === DEMO_ADMIN_EMAIL;
}
