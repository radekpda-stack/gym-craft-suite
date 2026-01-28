import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortalAuth } from "./useClientPortalAuth";

export interface ClientProfileData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  handedness: string | null;
  occupation: string | null;
  sitting_hours_daily: number | null;
  sleep_hours: number | null;
  stress_level: number | null;
  health_restrictions: string | null;
  sports_history: string | null;
  current_activities: string[] | null;
  training_goals: string[] | null;
  supplements: string[] | null;
  dietary_restrictions: string[] | null;
  created_at: string;
  training_start_date: string | null;
}

export function useClientPortalProfileData() {
  const { clientAccount } = useClientPortalAuth();

  return useQuery({
    queryKey: ["client-portal-profile", clientAccount?.client_id],
    queryFn: async () => {
      if (!clientAccount?.client_id) return null;

      const { data, error } = await supabase
        .from("clients")
        .select(`
          id, name, email, phone, birth_date, gender, handedness, occupation, 
          sitting_hours_daily, sleep_hours, stress_level, health_restrictions,
          sports_history, current_activities, training_goals, supplements,
          dietary_restrictions, created_at, training_start_date
        `)
        .eq("id", clientAccount.client_id)
        .single();

      if (error) throw error;
      return data as ClientProfileData;
    },
    enabled: !!clientAccount?.client_id,
  });
}

export interface UpdateClientProfileInput {
  email?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  handedness?: string | null;
  occupation?: string | null;
  sitting_hours_daily?: number | null;
  sleep_hours?: number | null;
  stress_level?: number | null;
  health_restrictions?: string | null;
  sports_history?: string | null;
  current_activities?: string[] | null;
  training_goals?: string[] | null;
  supplements?: string[] | null;
  dietary_restrictions?: string[] | null;
}

export function useUpdateClientPortalProfile() {
  const queryClient = useQueryClient();
  const { clientAccount, clientProfile } = useClientPortalAuth();

  return useMutation({
    mutationFn: async (updates: UpdateClientProfileInput) => {
      if (!clientAccount?.client_id) throw new Error("Client not found");
      if (!clientAccount?.trainer_id) throw new Error("Trainer not found");

      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", clientAccount.client_id);

      if (error) throw error;

      // Create notification for trainer about profile update
      const changedFields: string[] = [];
      if (updates.email !== undefined) changedFields.push("email");
      if (updates.phone !== undefined) changedFields.push("telefon");
      if (updates.birth_date !== undefined) changedFields.push("datum narození");
      if (updates.gender !== undefined) changedFields.push("pohlaví");
      if (updates.handedness !== undefined) changedFields.push("dominantní ruka");
      if (updates.occupation !== undefined) changedFields.push("typ práce");
      if (updates.sitting_hours_daily !== undefined) changedFields.push("hodiny vsedě");
      if (updates.sleep_hours !== undefined) changedFields.push("spánek");
      if (updates.stress_level !== undefined) changedFields.push("úroveň stresu");
      if (updates.health_restrictions !== undefined) changedFields.push("zdravotní omezení");
      if (updates.sports_history !== undefined) changedFields.push("sportovní historie");
      if (updates.current_activities !== undefined) changedFields.push("aktuální aktivity");
      if (updates.training_goals !== undefined) changedFields.push("tréninkové cíle");
      if (updates.supplements !== undefined) changedFields.push("doplňky stravy");
      if (updates.dietary_restrictions !== undefined) changedFields.push("stravovací omezení");

      if (changedFields.length > 0) {
        await supabase.from("notifications").insert({
          client_id: clientAccount.client_id,
          user_id: clientAccount.trainer_id,
          type: "client_profile_updated",
          title: "Klient aktualizoval profil",
          message: `${clientProfile?.name || "Klient"} upravil(a): ${changedFields.join(", ")}`,
          entity_type: "client",
          entity_id: clientAccount.client_id,
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-portal-profile"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
