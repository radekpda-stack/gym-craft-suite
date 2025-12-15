import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SharedBudgetInfo {
  isShared: boolean;
  groupId: string | null;
  groupName: string | null;
  sharedBalance: number;
  displayBalance: number; // Actual balance, can be negative
  isExhausted: boolean;
  isNegative: boolean;
  members: Array<{
    id: string;
    name: string;
    membershipId: string;
  }>;
}

export function useSharedBudgetBalance(clientId?: string) {
  return useQuery({
    queryKey: ["shared_budget_balance", clientId],
    queryFn: async (): Promise<SharedBudgetInfo> => {
      if (!clientId) {
        return {
          isShared: false,
          groupId: null,
          groupName: null,
          sharedBalance: 0,
          displayBalance: 0,
          isExhausted: false,
          isNegative: false,
          members: [],
        };
      }

      // Check if client is in a budget group
      const { data: membership, error: memberError } = await supabase
        .from("client_budget_members")
        .select("group_id, client_budget_groups(id, name, shared_balance)")
        .eq("client_id", clientId)
        .maybeSingle();

      if (memberError) throw memberError;

      // Client not in a group - return individual balance
      if (!membership) {
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("credit_balance")
          .eq("id", clientId)
          .single();

        if (clientError) throw clientError;

        const balance = client.credit_balance || 0;
        return {
          isShared: false,
          groupId: null,
          groupName: null,
          sharedBalance: balance,
          displayBalance: balance,
          isExhausted: balance <= 0,
          isNegative: balance < 0,
          members: [],
        };
      }

      // Client is in a group - get shared balance and members
      const group = membership.client_budget_groups as { id: string; name: string; shared_balance: number } | null;
      if (!group) {
        return {
          isShared: false,
          groupId: null,
          groupName: null,
          sharedBalance: 0,
          displayBalance: 0,
          isExhausted: true,
          isNegative: false,
          members: [],
        };
      }

      // Get all members
      const { data: allMembers, error: membersError } = await supabase
        .from("client_budget_members")
        .select("id, client_id, clients(id, name)")
        .eq("group_id", group.id);

      if (membersError) throw membersError;

      const members = (allMembers || []).map(m => {
        const client = m.clients as { id: string; name: string } | null;
        return {
          id: client?.id || '',
          name: client?.name || '',
          membershipId: m.id,
        };
      }).filter(m => m.id);

      const sharedBalance = group.shared_balance || 0;

      return {
        isShared: true,
        groupId: group.id,
        groupName: group.name,
        sharedBalance,
        displayBalance: sharedBalance,
        isExhausted: sharedBalance <= 0,
        isNegative: sharedBalance < 0,
        members,
      };
    },
    enabled: !!clientId,
  });
}

// Hook for updating shared budget balance
export function useUpdateSharedBudgetBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, amount }: { groupId: string; amount: number }) => {
      // Get current balance
      const { data: group, error: getError } = await supabase
        .from("client_budget_groups")
        .select("shared_balance")
        .eq("id", groupId)
        .single();

      if (getError) throw getError;

      const newBalance = (group.shared_balance || 0) + amount;

      // Update the shared balance
      const { error: updateError } = await supabase
        .from("client_budget_groups")
        .update({ shared_balance: newBalance })
        .eq("id", groupId);

      if (updateError) throw updateError;

      return newBalance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared_budget_balance"] });
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
    },
    onError: (error) => {
      console.error("Error updating shared budget:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat sdílený kredit.",
        variant: "destructive",
      });
    },
  });
}

// Hook for fetching transactions for a shared budget group
export function useSharedBudgetTransactions(groupId?: string | null) {
  return useQuery({
    queryKey: ["shared_budget_transactions", groupId],
    queryFn: async () => {
      if (!groupId) return [];

      // Get all client IDs in the group
      const { data: members, error: membersError } = await supabase
        .from("client_budget_members")
        .select("client_id")
        .eq("group_id", groupId);

      if (membersError) throw membersError;

      const clientIds = members.map(m => m.client_id);

      if (clientIds.length === 0) return [];

      // Get transactions for all clients in the group OR transactions with group_id
      const { data: transactions, error: transactionsError } = await supabase
        .from("credit_transactions")
        .select("*, clients:client_id(name)")
        .or(`client_id.in.(${clientIds.join(',')}),group_id.eq.${groupId}`)
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;

      return transactions;
    },
    enabled: !!groupId,
  });
}
