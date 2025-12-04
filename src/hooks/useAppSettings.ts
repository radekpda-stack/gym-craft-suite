import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}

export interface TrainingPrices {
  "1": number;
  "2": number;
  "3": number;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*");

      if (error) throw error;
      
      // Convert to a more usable format
      const settings: Record<string, any> = {};
      (data as AppSetting[]).forEach(setting => {
        settings[setting.key] = setting.value;
      });
      
      return settings;
    },
  });
}

export function useTrainingPrices() {
  const { data: settings } = useAppSettings();
  
  const defaultPrices: TrainingPrices = { "1": 800, "2": 1000, "3": 1200 };
  
  return settings?.training_prices || defaultPrices;
}

export function useLowCreditThreshold() {
  const { data: settings } = useAppSettings();
  return settings?.low_credit_threshold || 500;
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data, error } = await supabase
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings"] });
      toast({
        title: "Nastavení uloženo",
        description: "Změny byly úspěšně uloženy.",
      });
    },
    onError: (error) => {
      console.error("Error updating setting:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit nastavení.",
        variant: "destructive",
      });
    },
  });
}

export function getTrainingPrice(participantCount: number, prices: TrainingPrices): number {
  if (participantCount >= 3) return prices["3"];
  if (participantCount === 2) return prices["2"];
  return prices["1"];
}

export function calculateRemainingTrainings(creditBalance: number, prices: TrainingPrices): number {
  // Calculate how many solo trainings can be done
  return Math.floor(creditBalance / prices["1"]);
}
