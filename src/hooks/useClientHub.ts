/**
 * useClientHub - Consolidated client data hook
 * 
 * This hook provides a centralized way to access all client-related data
 * with lazy loading support for optimal performance.
 * 
 * Usage:
 * const { client, isLoading, attendance, packages } = useClientHub(clientId, { withAttendance: true });
 */

import { useMemo } from 'react';
import { useClient, useClients, type Client } from './useClients';
import { useClientAttendanceStats } from './useClientAttendanceStats';
import { useClientPackages } from './useClientPackages';
import { useClientTags } from './useClientTags';
import { useClientTimeline } from './useClientTimeline';
import { useClientLTV } from './useClientLTV';
import { useSharedBudgetBalance } from './useSharedBudgetBalance';
import { useCreditTransactions } from './useCreditTransactions';

export interface ClientHubOptions {
  /** Load attendance statistics */
  withAttendance?: boolean;
  /** Load packages */
  withPackages?: boolean;
  /** Load tags */
  withTags?: boolean;
  /** Load timeline */
  withTimeline?: boolean;
  /** Timeline limit */
  timelineLimit?: number;
  /** Load LTV data */
  withLTV?: boolean;
  /** Load credit balance (from ledger) */
  withBalance?: boolean;
  /** Load credit transactions */
  withTransactions?: boolean;
}

export interface ClientHubData {
  // Core client data
  client: Client | null | undefined;
  isLoading: boolean;
  
  // Lazy-loaded sub-data (only present when enabled)
  attendance?: ReturnType<typeof useClientAttendanceStats>;
  packages?: ReturnType<typeof useClientPackages>;
  tags?: ReturnType<typeof useClientTags>;
  timeline?: ReturnType<typeof useClientTimeline>;
  ltv?: ReturnType<typeof useClientLTV>;
  balance?: ReturnType<typeof useSharedBudgetBalance>;
  transactions?: ReturnType<typeof useCreditTransactions>;
}

const DEFAULT_OPTIONS: ClientHubOptions = {
  withAttendance: false,
  withPackages: false,
  withTags: false,
  withTimeline: false,
  timelineLimit: 50,
  withLTV: false,
  withBalance: false,
  withTransactions: false,
};

/**
 * Consolidated hook for accessing all client-related data
 * 
 * @param clientId - The client ID to fetch data for
 * @param options - Which data modules to load (default: only core client data)
 */
export function useClientHub(
  clientId: string | undefined,
  options: ClientHubOptions = {}
): ClientHubData {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Core client data - always loaded
  const { data: client, isLoading } = useClient(clientId);
  
  // Conditionally loaded sub-data
  // Note: hooks are always called (rules of hooks), but we pass undefined to disable them
  const attendance = useClientAttendanceStats(opts.withAttendance ? clientId : undefined);
  const packages = useClientPackages(opts.withPackages ? clientId : undefined);
  const tags = useClientTags(opts.withTags ? clientId : undefined);
  const timeline = useClientTimeline(
    opts.withTimeline ? clientId : undefined, 
    { limit: opts.timelineLimit }
  );
  const ltv = useClientLTV(opts.withLTV ? clientId : undefined);
  const balance = useSharedBudgetBalance(opts.withBalance ? clientId : undefined);
  const transactions = useCreditTransactions(opts.withTransactions ? clientId : undefined);

  return useMemo(() => ({
    client,
    isLoading,
    ...(opts.withAttendance && { attendance }),
    ...(opts.withPackages && { packages }),
    ...(opts.withTags && { tags }),
    ...(opts.withTimeline && { timeline }),
    ...(opts.withLTV && { ltv }),
    ...(opts.withBalance && { balance }),
    ...(opts.withTransactions && { transactions }),
  }), [
    client, 
    isLoading, 
    opts.withAttendance, attendance,
    opts.withPackages, packages,
    opts.withTags, tags,
    opts.withTimeline, timeline,
    opts.withLTV, ltv,
    opts.withBalance, balance,
    opts.withTransactions, transactions,
  ]);
}

/**
 * Hook for accessing multiple clients with optional filtering
 */
export function useClientsHub(options?: {
  includeArchived?: boolean;
  filterFavorites?: boolean;
}) {
  const { data: clients = [], isLoading } = useClients();
  
  const filteredClients = useMemo(() => {
    let result = clients;
    
    if (!options?.includeArchived) {
      result = result.filter(c => !c.is_archived);
    }
    
    if (options?.filterFavorites) {
      result = result.filter(c => c.is_favorite);
    }
    
    return result;
  }, [clients, options?.includeArchived, options?.filterFavorites]);
  
  const activeClients = useMemo(() => 
    clients.filter(c => !c.is_archived), 
    [clients]
  );
  
  const archivedClients = useMemo(() => 
    clients.filter(c => c.is_archived), 
    [clients]
  );
  
  const favoriteClients = useMemo(() => 
    clients.filter(c => c.is_favorite && !c.is_archived), 
    [clients]
  );
  
  return {
    clients: filteredClients,
    allClients: clients,
    activeClients,
    archivedClients,
    favoriteClients,
    isLoading,
    counts: {
      total: clients.length,
      active: activeClients.length,
      archived: archivedClients.length,
      favorites: favoriteClients.length,
    },
  };
}

// Re-export common types
export type { Client } from './useClients';
