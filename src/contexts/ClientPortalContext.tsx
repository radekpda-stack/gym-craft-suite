import React, { createContext, useContext, ReactNode } from 'react';
import { useClientPortalAuth, ClientAccount, ClientProfile } from '@/hooks/useClientPortalAuth';
import { User, Session } from '@supabase/supabase-js';

interface ClientPortalContextType {
  user: User | null;
  session: Session | null;
  clientAccount: ClientAccount | null;
  clientProfile: ClientProfile | null;
  clientId: string | null;
  loading: boolean;
  isClient: boolean;
  isAuthenticated: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export function ClientPortalProvider({ children }: { children: ReactNode }) {
  const auth = useClientPortalAuth();

  const value: ClientPortalContextType = {
    ...auth,
    clientId: auth.clientAccount?.client_id ?? null,
  };

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  );
}

export function useClientPortal() {
  const context = useContext(ClientPortalContext);
  if (context === undefined) {
    throw new Error('useClientPortal must be used within a ClientPortalProvider');
  }
  return context;
}
