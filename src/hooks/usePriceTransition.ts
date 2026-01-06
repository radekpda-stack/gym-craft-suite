import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings, TrainingPrices } from "./useAppSettings";

export interface ClientPriceStatus {
  id: string;
  name: string;
  credit_balance: number;
  grandfathered_credit: number | null;
  grandfathered_at: string | null;
  use_legacy_pricing: boolean;
  remaining_legacy_credit: number;
}

export function usePriceTransition() {
  const queryClient = useQueryClient();
  const { data: settings } = useAppSettings();

  // Fetch clients with their pricing status
  const { data: clientsData } = useQuery({
    queryKey: ["clients_price_status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, credit_balance, grandfathered_credit, grandfathered_at, use_legacy_pricing")
        .eq("is_archived", false);

      if (error) throw error;
      return data;
    },
  });

  // Clients still on legacy pricing (have grandfathered credit and haven't exhausted it)
  const clientsOnLegacyPricing = clientsData?.filter(client => 
    client.use_legacy_pricing && 
    client.grandfathered_credit !== null &&
    client.credit_balance > 0
  ) || [];

  // Clients that have transitioned to new prices
  const clientsTransitioned = clientsData?.filter(client => 
    client.grandfathered_credit !== null && 
    !client.use_legacy_pricing
  ) || [];

  // Total remaining credit at legacy prices
  const totalLegacyCredit = clientsOnLegacyPricing.reduce((sum, client) => {
    const remaining = Math.min(client.credit_balance, client.grandfathered_credit || 0);
    return sum + Math.max(0, remaining);
  }, 0);

  // Mutation to activate price transition
  const activateTransitionMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all non-archived clients with positive credit
      const { data: clients, error: fetchError } = await supabase
        .from("clients")
        .select("id, credit_balance")
        .eq("is_archived", false)
        .eq("user_id", user.id)
        .gt("credit_balance", 0);

      if (fetchError) throw fetchError;

      // Update each client with their grandfathered credit
      const updates = clients?.map(client => ({
        id: client.id,
        grandfathered_credit: client.credit_balance,
        grandfathered_at: new Date().toISOString(),
        use_legacy_pricing: true,
      })) || [];

      // Batch update
      for (const update of updates) {
        const { error } = await supabase
          .from("clients")
          .update({
            grandfathered_credit: update.grandfathered_credit,
            grandfathered_at: update.grandfathered_at,
            use_legacy_pricing: update.use_legacy_pricing,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      return updates.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients_price_status"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return {
    clientsOnLegacyPricing,
    clientsTransitioned,
    totalLegacyCredit,
    activateTransition: activateTransitionMutation.mutateAsync,
    isActivating: activateTransitionMutation.isPending,
    isTransitionActive: settings?.price_transition_enabled && settings?.price_transition_date,
  };
}

/**
 * Hook to get the effective training price for a client
 * Takes into account legacy pricing if applicable
 */
export function useClientTrainingPrice(clientId: string | undefined) {
  const { data: settings } = useAppSettings();
  
  const { data: client } = useQuery({
    queryKey: ["client_pricing", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("credit_balance, grandfathered_credit, use_legacy_pricing")
        .eq("id", clientId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const isTransitionEnabled = settings?.price_transition_enabled;
  const legacyPrices = settings?.legacy_training_prices as TrainingPrices | undefined;
  const currentPrices = settings?.training_prices as TrainingPrices | undefined;

  // Determine if client should use legacy pricing
  const usesLegacyPricing = Boolean(
    isTransitionEnabled &&
    client?.use_legacy_pricing &&
    client?.grandfathered_credit !== null &&
    client?.credit_balance > 0
  );

  // Get effective prices
  const effectivePrices: TrainingPrices = usesLegacyPricing && legacyPrices
    ? legacyPrices
    : (currentPrices || { "1": 900, "2": 1100, "3": 1300, "first_training": 1000 });

  // Calculate remaining legacy credit
  const remainingLegacyCredit = client?.grandfathered_credit !== null
    ? Math.max(0, Math.min(client.credit_balance, client.grandfathered_credit))
    : 0;

  return {
    usesLegacyPricing,
    effectivePrices,
    remainingLegacyCredit,
    grandfatheredCredit: client?.grandfathered_credit,
  };
}

/**
 * Get effective price for a training based on participant count and client's pricing status
 */
export function getEffectiveTrainingPrice(
  participantCount: number,
  usesLegacyPricing: boolean,
  legacyPrices: TrainingPrices | undefined,
  currentPrices: TrainingPrices | undefined
): number {
  const prices = usesLegacyPricing && legacyPrices ? legacyPrices : currentPrices;
  
  if (!prices) {
    // Fallback to new default prices
    if (participantCount >= 3) return 1300;
    if (participantCount === 2) return 1100;
    return 900;
  }

  if (participantCount >= 3) return prices["3"];
  if (participantCount === 2) return prices["2"];
  return prices["1"];
}
