import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface PdfSettings {
  showLogo: boolean;
  showCompanyInfo: boolean;
  showSummary: boolean;
  showClientContact: boolean;
  customFooter: string;
}

const defaultPdfSettings: PdfSettings = {
  showLogo: true,
  showCompanyInfo: true,
  showSummary: true,
  showClientContact: true,
  customFooter: "",
};

export function usePdfSettings() {
  return useQuery({
    queryKey: ["pdf_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "pdf_settings")
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        return {
          ...defaultPdfSettings,
          ...(data.value as Record<string, unknown>),
        } as PdfSettings;
      }
      
      return defaultPdfSettings;
    },
  });
}

export function useUpdatePdfSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: PdfSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Uživatel není přihlášen");
      }

      // Check if setting exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "pdf_settings")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("app_settings")
          .update({ 
            value: settings as unknown as Json, 
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("app_settings")
          .insert({ 
            key: "pdf_settings", 
            value: settings as unknown as Json, 
            updated_at: new Date().toISOString(),
            user_id: user.id 
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf_settings"] });
      toast({
        title: "Nastavení uloženo",
        description: "Nastavení PDF bylo úspěšně uloženo.",
      });
    },
    onError: (error) => {
      console.error("Error updating PDF settings:", error);
      toast({
        title: "Chyba",
        description: "Nepodařilo se uložit nastavení PDF.",
        variant: "destructive",
      });
    },
  });
}

export function getDefaultPdfSettings(): PdfSettings {
  return { ...defaultPdfSettings };
}
