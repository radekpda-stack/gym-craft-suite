import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface FinancialReportSettings {
  // Module state
  isEnabled: boolean;
  
  // Default period
  defaultPeriod: 'year' | '12months' | 'custom';
  
  // Data sources - what to include in report
  dataSources: {
    trainings: boolean;      // Include training sessions
    productSales: boolean;   // Include product sales
    clientPayments: boolean; // Include direct client payments
  };
  
  // Sections to include
  sections: {
    yearSummary: boolean;
    monthlyOverview: boolean;
    weeklyOverview: boolean;
    clientsBreakdown: boolean;
    trainingTypeBreakdown: boolean;
    productSalesBreakdown: boolean;  // NEW: Product sales section
    managerialMetrics: boolean;
    dataValidation: boolean;
  };
  
  // Client definition
  clientDefinition: 'trainings' | 'payments' | 'both';
  
  // Branding
  branding: {
    showLogo: boolean;
    showCompanyName: boolean;
    customTitle: string;
  };
}

const defaultSettings: FinancialReportSettings = {
  isEnabled: true,
  defaultPeriod: 'year',
  dataSources: {
    trainings: true,
    productSales: true,
    clientPayments: true,
  },
  sections: {
    yearSummary: true,
    monthlyOverview: true,
    weeklyOverview: false,
    clientsBreakdown: true,
    trainingTypeBreakdown: true,
    productSalesBreakdown: true,
    managerialMetrics: true,
    dataValidation: true,
  },
  clientDefinition: 'both',
  branding: {
    showLogo: true,
    showCompanyName: true,
    customTitle: '',
  },
};

const SETTINGS_KEY = 'financial_report_settings';

export function useFinancialReportSettings() {
  return useQuery({
    queryKey: [SETTINGS_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        return {
          ...defaultSettings,
          ...(data.value as Record<string, unknown>),
          dataSources: {
            ...defaultSettings.dataSources,
            ...((data.value as Record<string, unknown>).dataSources as Record<string, unknown> || {}),
          },
          sections: {
            ...defaultSettings.sections,
            ...((data.value as Record<string, unknown>).sections as Record<string, unknown> || {}),
          },
          branding: {
            ...defaultSettings.branding,
            ...((data.value as Record<string, unknown>).branding as Record<string, unknown> || {}),
          },
        } as FinancialReportSettings;
      }
      
      return defaultSettings;
    },
  });
}

export function useUpdateFinancialReportSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: FinancialReportSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Uživatel není přihlášen");
      }

      // Check if setting exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", SETTINGS_KEY)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
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
        const { data, error } = await supabase
          .from("app_settings")
          .insert({ 
            key: SETTINGS_KEY, 
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
      queryClient.invalidateQueries({ queryKey: [SETTINGS_KEY] });
      toast.success("Nastavení uloženo");
    },
    onError: (error) => {
      console.error("Error updating financial report settings:", error);
      toast.error("Nepodařilo se uložit nastavení");
    },
  });
}

export function getDefaultFinancialReportSettings(): FinancialReportSettings {
  return { ...defaultSettings };
}
