import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface DemoClientAccount {
  id: string;
  user_id: string;
  client_id: string;
  trainer_id: string;
  auth_user_id: string | null;
  is_active: boolean;
  last_portal_login: string | null;
  portal_settings: Record<string, unknown>;
  login_count: number;
  credentials_changed_at: string | null;
}

export interface DemoClientProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  credit_balance: number;
}

// Mock data for demo mode
const DEMO_CLIENT_ACCOUNT: DemoClientAccount = {
  id: 'demo-account-id',
  user_id: 'demo-user-id',
  client_id: 'demo-client-id',
  trainer_id: 'demo-trainer-id',
  auth_user_id: 'demo-auth-user-id',
  is_active: true,
  last_portal_login: new Date().toISOString(),
  portal_settings: {
    graphVisibility: {
      weight: true,
      bodyFat: true,
      trackedExercises: true,
      rowing500m: true,
      rowing1000m: true,
      running500m: true,
      running1000m: true,
    },
    comparisonDisplayMode: 'both',
  },
  login_count: 5,
  credentials_changed_at: null,
};

const DEMO_CLIENT_PROFILE: DemoClientProfile = {
  id: 'demo-client-id',
  name: 'Test Klient',
  email: 'test@demo.cz',
  phone: '+420 123 456 789',
  credit_balance: 2400,
};

export function useClientPortalDemo() {
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';

  return {
    isDemo,
    demoClientAccount: isDemo ? DEMO_CLIENT_ACCOUNT : null,
    demoClientProfile: isDemo ? DEMO_CLIENT_PROFILE : null,
    demoClientId: isDemo ? 'demo-client-id' : null,
  };
}
