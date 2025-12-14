import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DiagnosticAssessment } from "./useDiagnosticAssessment";

export interface DiagnosticWithAssessment {
  id: string;
  client_id: string;
  date: string;
  area_type: string;
  area_name: string;
  findings: string;
  notes: string | null;
  created_at: string;
  assessment?: DiagnosticAssessment;
}

// Hook for fetching diagnostics with assessments for a specific client
export function useDiagnosticAssessments(clientId?: string) {
  return useQuery({
    queryKey: ["diagnostic-assessments", clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Get all diagnostics for client
      const { data: diagnostics, error: diagError } = await supabase
        .from("diagnostics")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });

      if (diagError) throw diagError;

      if (!diagnostics || diagnostics.length === 0) return [];

      // Get all assessments for these diagnostics
      const diagnosticIds = diagnostics.map((d) => d.id);
      const { data: assessments, error: assessError } = await supabase
        .from("diagnostic_assessments")
        .select("*")
        .in("diagnostic_id", diagnosticIds);

      if (assessError) throw assessError;

      // Map assessments to diagnostics
      const result: DiagnosticWithAssessment[] = diagnostics.map((diag) => ({
        ...diag,
        assessment: assessments?.find((a) => a.diagnostic_id === diag.id) as DiagnosticAssessment | undefined,
      }));

      return result;
    },
    enabled: !!clientId,
  });
}

// Hook for fetching a single diagnostic with assessment by diagnostic ID
export function useDiagnosticById(diagnosticId?: string) {
  return useQuery({
    queryKey: ["diagnostic-by-id", diagnosticId],
    queryFn: async (): Promise<DiagnosticWithAssessment | null> => {
      if (!diagnosticId) return null;

      // Get the diagnostic
      const { data: diagnostic, error: diagError } = await supabase
        .from("diagnostics")
        .select("*")
        .eq("id", diagnosticId)
        .single();

      if (diagError) throw diagError;
      if (!diagnostic) return null;

      // Get the assessment
      const { data: assessment, error: assessError } = await supabase
        .from("diagnostic_assessments")
        .select("*")
        .eq("diagnostic_id", diagnosticId)
        .maybeSingle();

      if (assessError) throw assessError;

      return {
        ...diagnostic,
        assessment: assessment as DiagnosticAssessment | undefined,
      };
    },
    enabled: !!diagnosticId,
  });
}

// Hook for fetching all assessments (used in Records page)
export function useAllDiagnosticAssessments() {
  return useQuery({
    queryKey: ["all-diagnostic-assessments"],
    queryFn: async () => {
      const { data: assessments, error } = await supabase
        .from("diagnostic_assessments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return assessments as DiagnosticAssessment[];
    },
  });
}
