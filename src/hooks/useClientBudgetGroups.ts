import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface BudgetGroup {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetGroupMember {
  id: string;
  group_id: string;
  client_id: string;
  user_id: string;
  created_at: string;
}

export interface BudgetGroupWithMembers extends BudgetGroup {
  members: BudgetGroupMember[];
}

// Fetch all budget groups with their members
export function useBudgetGroups() {
  return useQuery({
    queryKey: ["budget_groups"],
    queryFn: async () => {
      const { data: groups, error: groupsError } = await supabase
        .from("client_budget_groups")
        .select("*")
        .order("name");

      if (groupsError) throw groupsError;

      const { data: members, error: membersError } = await supabase
        .from("client_budget_members")
        .select("*");

      if (membersError) throw membersError;

      // Combine groups with their members
      return (groups as BudgetGroup[]).map(group => ({
        ...group,
        members: (members as BudgetGroupMember[]).filter(m => m.group_id === group.id),
      })) as BudgetGroupWithMembers[];
    },
  });
}

// Get budget group for a specific client
export function useClientBudgetGroup(clientId?: string) {
  return useQuery({
    queryKey: ["client_budget_group", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data: membership, error: memberError } = await supabase
        .from("client_budget_members")
        .select("*, client_budget_groups(*)")
        .eq("client_id", clientId)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!membership) return null;

      // Get all members of this group
      const { data: allMembers, error: membersError } = await supabase
        .from("client_budget_members")
        .select("*, clients(id, name, credit_balance)")
        .eq("group_id", membership.group_id);

      if (membersError) throw membersError;

      return {
        group: membership.client_budget_groups as BudgetGroup,
        members: allMembers,
      };
    },
    enabled: !!clientId,
  });
}

// Create a new budget group
export function useCreateBudgetGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, clientIds }: { name: string; clientIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("client_budget_groups")
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add members
      if (clientIds.length > 0) {
        const memberRecords = clientIds.map(clientId => ({
          group_id: group.id,
          client_id: clientId,
          user_id: user.id,
        }));

        const { error: membersError } = await supabase
          .from("client_budget_members")
          .insert(memberRecords);

        if (membersError) throw membersError;
      }

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Skupina vytvořena",
        description: "Sdílený budget byl úspěšně vytvořen.",
      });
    },
    onError: (error) => {
      console.error("Error creating budget group:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit sdílený budget.",
        variant: "destructive",
      });
    },
  });
}

// Update budget group members
export function useUpdateBudgetGroupMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, clientIds }: { groupId: string; clientIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Remove existing members
      const { error: deleteError } = await supabase
        .from("client_budget_members")
        .delete()
        .eq("group_id", groupId);

      if (deleteError) throw deleteError;

      // Add new members
      if (clientIds.length > 0) {
        const memberRecords = clientIds.map(clientId => ({
          group_id: groupId,
          client_id: clientId,
          user_id: user.id,
        }));

        const { error: insertError } = await supabase
          .from("client_budget_members")
          .insert(memberRecords);

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({
        title: "Skupina aktualizována",
        description: "Členové skupiny byli aktualizováni.",
      });
    },
    onError: (error) => {
      console.error("Error updating budget group:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat skupinu.",
        variant: "destructive",
      });
    },
  });
}

// Delete budget group
export function useDeleteBudgetGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("client_budget_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_groups"] });
      queryClient.invalidateQueries({ queryKey: ["client_budget_group"] });
      toast({
        title: "Skupina smazána",
        description: "Sdílený budget byl odstraněn.",
      });
    },
    onError: (error) => {
      console.error("Error deleting budget group:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat skupinu.",
        variant: "destructive",
      });
    },
  });
}

// Synchronize credit balance across group members
export async function syncGroupCreditBalance(clientId: string, newBalance: number) {
  // Get the budget group for this client
  const { data: membership, error: memberError } = await supabase
    .from("client_budget_members")
    .select("group_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!membership) return; // Client not in a group

  // Get all other members in the group
  const { data: allMembers, error: membersError } = await supabase
    .from("client_budget_members")
    .select("client_id")
    .eq("group_id", membership.group_id)
    .neq("client_id", clientId);

  if (membersError) throw membersError;

  // Update credit balance for all group members
  if (allMembers && allMembers.length > 0) {
    const memberIds = allMembers.map(m => m.client_id);
    
    const { error: updateError } = await supabase
      .from("clients")
      .update({ credit_balance: newBalance })
      .in("id", memberIds);

    if (updateError) throw updateError;
  }
}
