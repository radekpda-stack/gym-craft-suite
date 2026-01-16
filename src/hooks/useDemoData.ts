// Demo-aware data hooks
// These hooks wrap the real data hooks and return demo data when in demo mode

import { useMemo } from 'react';
import { useDemoMode } from '@/contexts/DemoContext';
import { useClients as useRealClients, Client } from './useClients';
import { useTrainingSessions as useRealTrainingSessions, TrainingSession } from './useTrainingSessions';
import { useDashboardStats as useRealDashboardStats, DashboardStats } from './useDashboardStats';
import { toast } from './use-toast';

// Convert demo client to Client type
function demoClientToClient(demoClient: ReturnType<typeof useDemoMode>['demoClient']): Client | null {
  if (!demoClient) return null;
  
  return {
    id: demoClient.id,
    name: demoClient.name,
    first_name: demoClient.name.split(' ')[0] || null,
    last_name: demoClient.name.split(' ').slice(1).join(' ') || null,
    email: demoClient.email,
    phone: demoClient.phone,
    training_goals: demoClient.training_goals,
    notes: demoClient.notes,
    health_restrictions: demoClient.health_restrictions,
    credit_balance: demoClient.credit_balance,
    birth_date: demoClient.birth_date,
    is_favorite: demoClient.is_favorite,
    is_archived: demoClient.is_archived,
    feedback_enabled: true,
    gender: demoClient.gender as 'male' | 'female' | null,
    payment_mode: 'credit' as const,
    created_at: demoClient.created_at,
    updated_at: demoClient.updated_at,
    user_id: 'demo-admin-0001',
    training_start_date: null,
    // Custom pricing
    custom_training_price: null,
    custom_price_note: null,
    custom_price_credit_limit: null,
    // Extended personal data fields
    handedness: null,
    occupation: null,
    sitting_hours_daily: null,
    sports_history: null,
    current_activities: null,
    sleep_hours: null,
    stress_level: null,
    dietary_restrictions: null,
    supplements: null,
    // Pre-diagnostic data fields
    height: null,
    weight: null,
    sleep_quality: null,
    pain_areas: null,
    injury_history: null,
    surgery_history: null,
    movement_frequency: null,
    daily_activity_type: null,
    training_dislikes: null,
    // Price transition fields
    grandfathered_credit: null,
    grandfathered_at: null,
    use_legacy_pricing: false,
  };
}

// Convert demo training to TrainingSession type
function demoTrainingToSession(demoTraining: ReturnType<typeof useDemoMode>['demoTraining']): TrainingSession | null {
  if (!demoTraining) return null;
  
  return {
    id: demoTraining.id,
    client_id: demoTraining.client_id,
    date: demoTraining.date,
    duration: demoTraining.duration,
    notes: demoTraining.notes,
    subjective_rating: demoTraining.subjective_rating,
    status: demoTraining.status as 'scheduled' | 'completed' | 'canceled',
    canceled_at: null,
    is_late_cancellation: false,
    cancellation_reason: null,
    participant_count: demoTraining.participant_count,
    recurrence_type: null,
    recurrence_end_date: null,
    parent_session_id: null,
    created_at: demoTraining.created_at,
    updated_at: demoTraining.updated_at,
    user_id: 'demo-admin-0001',
    payment_status: demoTraining.payment_status,
    final_price: demoTraining.final_price,
    payment_method: null,
    training_type: demoTraining.training_type,
    training_goal: demoTraining.training_goal,
    rpe: null,
    rir: null,
    total_volume: null,
    intensity_notes: null,
    subjective_difficulty: null,
    trainer_went_well: null,
    trainer_problems: null,
    trainer_recommendations: null,
    prep_notes: null,
    pain_reported: false,
    pain_notes: null,
    client_rpe: null,
    training_load: null,
  };
}

// Convert demo stats to DashboardStats type
function demoStatsToStats(demoStats: ReturnType<typeof useDemoMode>['demoDashboardStats']): DashboardStats | null {
  if (!demoStats) return null;
  
  return {
    totalClients: demoStats.totalClients,
    sessionsThisWeek: demoStats.weeklyTrainings,
    sessionsThisMonth: demoStats.completedTrainings,
    sessionsThisYear: demoStats.totalTrainings,
    sessionsAllTime: demoStats.totalTrainings,
    averagePerWeek: demoStats.weeklyTrainings,
    averageRating: demoStats.averageRating,
    canceledSessions: 2,
    lateCancellations: 1,
  };
}

// Demo-aware useClients hook
export function useDemoClients() {
  const { isDemo, demoClient } = useDemoMode();
  const realQuery = useRealClients();
  
  const demoData = useMemo(() => {
    if (!isDemo) return null;
    const client = demoClientToClient(demoClient);
    return client ? [client] : [];
  }, [isDemo, demoClient]);
  
  if (isDemo) {
    return {
      data: demoData,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: async () => ({ data: demoData, error: null }),
    };
  }
  
  return realQuery;
}

// Demo-aware useTrainingSessions hook
export function useDemoTrainingSessions(clientId?: string) {
  const { isDemo, demoTraining } = useDemoMode();
  const realQuery = useRealTrainingSessions(clientId);
  
  const demoData = useMemo(() => {
    if (!isDemo) return null;
    const session = demoTrainingToSession(demoTraining);
    if (!session) return [];
    if (clientId && session.client_id !== clientId) return [];
    return [session];
  }, [isDemo, demoTraining, clientId]);
  
  if (isDemo) {
    return {
      data: demoData,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: async () => ({ data: demoData, error: null }),
    };
  }
  
  return realQuery;
}

// Demo-aware useDashboardStats hook
export function useDemoDashboardStats() {
  const { isDemo, demoDashboardStats } = useDemoMode();
  const realQuery = useRealDashboardStats();
  
  const demoData = useMemo(() => {
    if (!isDemo) return null;
    return demoStatsToStats(demoDashboardStats);
  }, [isDemo, demoDashboardStats]);
  
  if (isDemo) {
    return {
      data: demoData,
      isLoading: false,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: true,
      refetch: async () => ({ data: demoData, error: null }),
    };
  }
  
  return realQuery;
}

// Helper to block demo actions with toast
export function useDemoActionGuard() {
  const { isDemo, canCreateClient, canCreateTraining, isDemoBlocked } = useDemoMode();
  
  const guardCreateClient = () => {
    if (isDemo && !canCreateClient) {
      toast({
        title: "Demo omezení",
        description: "V demo režimu lze vytvořit pouze 1 klienta.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };
  
  const guardCreateTraining = () => {
    if (isDemo && !canCreateTraining) {
      toast({
        title: "Demo omezení",
        description: "V demo režimu lze vytvořit pouze 1 trénink.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };
  
  const guardBlockedAction = (action: 'payment' | 'email' | 'notification' | 'export' | 'realData') => {
    if (isDemoBlocked(action)) {
      const messages: Record<typeof action, string> = {
        payment: "Platby nejsou v demo režimu dostupné.",
        email: "Odesílání emailů není v demo režimu dostupné.",
        notification: "Notifikace nejsou v demo režimu dostupné.",
        export: "Export dat není v demo režimu dostupný.",
        realData: "Tato akce vyžaduje reálná data.",
      };
      
      toast({
        title: "Demo omezení",
        description: messages[action],
        variant: "destructive",
      });
      return false;
    }
    return true;
  };
  
  return {
    isDemo,
    guardCreateClient,
    guardCreateTraining,
    guardBlockedAction,
  };
}
