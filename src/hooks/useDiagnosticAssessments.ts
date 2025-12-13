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
