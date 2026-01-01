import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestSession, CreateTestSessionInput, TestDefinition, MachineSettings, ComparabilityRules } from "@/types/tests";
import { toast } from "sonner";

function evaluateComparability(
  session: CreateTestSessionInput,
  previousSessions: TestSession[],
  rules: ComparabilityRules
): { isComparable: boolean; reason?: string } {
  if (rules.always_comparable) return { isComparable: true };
  const lastComparable = previousSessions.find(s => s.is_valid && s.is_comparable);
  if (!lastComparable) return { isComparable: true };

  const currentSettings = session.machine_settings_json;
  const prevSettings = lastComparable.machine_settings_json;

  if (rules.requires_same_device_family && currentSettings?.device_family !== prevSettings?.device_family) {
    return { isComparable: false, reason: `Jiné zařízení` };
  }

  if (rules.requires_same_resistance) {
    if (currentSettings?.resistance_mode !== prevSettings?.resistance_mode) {
      return { isComparable: false, reason: 'Jiný režim odporu' };
    }
    if (currentSettings?.resistance_mode === 'level_1_10' && currentSettings?.resistance_level_1_10 !== prevSettings?.resistance_level_1_10) {
      return { isComparable: false, reason: `Jiná úroveň odporu` };
    }
    if (currentSettings?.resistance_mode === 'magnet_1_3' && currentSettings?.magnet_1_3 !== prevSettings?.magnet_1_3) {
      return { isComparable: false, reason: `Jiný magnetický odpor` };
    }
  }

  if (rules.requires_same_incline) {
    const currentIncline = currentSettings?.incline_pct ?? 1;
    const prevIncline = prevSettings?.incline_pct ?? 1;
    if (Math.abs(currentIncline - prevIncline) > (rules.incline_tolerance ?? 0.5)) {
      return { isComparable: false, reason: `Jiný sklon` };
    }
  }

  return { isComparable: true };
}

// Mapping of exercise names to test definition patterns for auto-linking
const CARDIO_EXERCISE_TO_TEST_MAP: Record<string, { pattern: string; distance?: number }> = {
  'Veslo 500m': { pattern: 'SkillRow 500m', distance: 500 },
  'Veslo 1000m': { pattern: 'SkillRow 1000m', distance: 1000 },
  'Veslo 2000m': { pattern: 'SkillRow 2000m', distance: 2000 },
  'veslo': { pattern: 'SkillRow', distance: undefined },
  'SkiErg 500m': { pattern: 'SkillUp 500m', distance: 500 },
  'SkiErg 1000m': { pattern: 'SkillUp 1000m', distance: 1000 },
  'skierg': { pattern: 'SkillUp', distance: undefined },
  'Běh 500m': { pattern: 'SkillRun 500m', distance: 500 },
  'Běh 1km': { pattern: 'SkillRun 1km', distance: 1000 },
  'Běh 1000m': { pattern: 'SkillRun 1km', distance: 1000 },
  'Běh 5km': { pattern: 'SkillRun 5km', distance: 5000 },
  'Běh 10km': { pattern: 'SkillRun 10km', distance: 10000 },
  'běh': { pattern: 'SkillRun', distance: undefined },
  'BikeErg 1km': { pattern: 'BikeErg', distance: 1000 },
};

function findMatchingTestDefinition(
  exerciseName: string, 
  distance: number | null,
  definitions: TestDefinition[]
): TestDefinition | null {
  const normalizedName = exerciseName.toLowerCase();
  
  // Try exact match first
  for (const [key, value] of Object.entries(CARDIO_EXERCISE_TO_TEST_MAP)) {
    if (normalizedName.includes(key.toLowerCase())) {
      const matchingDef = definitions.find(d => 
        d.name.toLowerCase().includes(value.pattern.toLowerCase()) &&
        (!value.distance || !distance || value.distance === distance)
      );
      if (matchingDef) return matchingDef;
    }
  }
  
  // Try by distance if available
  if (distance) {
    const distanceLabel = distance >= 1000 ? `${distance / 1000}km` : `${distance}m`;
    const matchingDef = definitions.find(d => 
      d.name.toLowerCase().includes(distanceLabel.toLowerCase()) &&
      d.category === 'cardio'
    );
    if (matchingDef) return matchingDef;
  }
  
  return null;
}

export function useTestSessions(clientId?: string, testDefinitionId?: string) {
  return useQuery({
    queryKey: ['test-sessions', clientId, testDefinitionId],
    queryFn: async () => {
      // 1. Fetch actual test sessions
      let query = supabase
        .from('test_sessions')
        .select(`*, test_definitions(id, name, name_cs, category, primary_metric_key, primary_metric_better, device_family, comparability_rules_json, required_metrics_schema), clients(id, name)`)
        .order('date_time', { ascending: false });
      
      if (clientId) query = query.eq('client_id', clientId);
      if (testDefinitionId) query = query.eq('test_definition_id', testDefinitionId);
      
      const { data: testData, error: testError } = await query;
      if (testError) throw testError;

      // 2. Fetch exercise entries with is_test=true or cardio exercises
      let exerciseQuery = supabase
        .from('exercise_entries')
        .select('*, clients:client_id(id, name)')
        .order('date', { ascending: false });
      
      if (clientId) exerciseQuery = exerciseQuery.eq('client_id', clientId);
      
      // Get entries that are tests or have time_seconds (cardio-like)
      exerciseQuery = exerciseQuery.or('is_test.eq.true,time_seconds.not.is.null');
      
      const { data: exerciseData, error: exerciseError } = await exerciseQuery;
      if (exerciseError) throw exerciseError;

      // 3. Fetch all test definitions for matching
      const { data: allDefinitions } = await supabase
        .from('test_definitions')
        .select('*')
        .eq('is_active', true);
      
      const definitions = (allDefinitions || []) as unknown as TestDefinition[];

      // 4. Filter by test definition if specified
      let targetDefinition: TestDefinition | null = null;
      if (testDefinitionId) {
        targetDefinition = definitions.find(d => d.id === testDefinitionId) || null;
      }

      // 5. Convert exercise entries to virtual test sessions
      const virtualSessions: TestSession[] = [];
      const existingTestEntryIds = new Set(testData?.map(t => t.exercise_entry_id).filter(Boolean));

      for (const entry of exerciseData || []) {
        // Skip if already linked to a test session
        if (existingTestEntryIds.has(entry.id)) continue;
        
        // Skip if no time data (not a cardio/test entry)
        if (!entry.time_seconds && !entry.time_ms) continue;

        // Find matching test definition
        const matchedDef = findMatchingTestDefinition(
          entry.exercise_name,
          entry.distance_meters,
          definitions
        );

        // If we're filtering by testDefinitionId, only include matching entries
        if (testDefinitionId && (!matchedDef || matchedDef.id !== testDefinitionId)) continue;
        
        // If no definition found and we're not filtering, still skip
        if (!matchedDef) continue;

        const timeSeconds = entry.time_seconds || (entry.time_ms ? Math.round(entry.time_ms / 1000) : 0);
        
        const virtualSession: TestSession = {
          id: `exercise-${entry.id}`,
          user_id: entry.user_id,
          test_definition_id: matchedDef.id,
          client_id: entry.client_id,
          date_time: `${entry.date}T00:00:00`,
          metrics_json: {
            time_s: timeSeconds,
            distance_m: entry.distance_meters || null,
            avg_power_w: entry.avg_watts || null,
            avg_hr: entry.avg_heart_rate || null,
            max_hr: entry.max_heart_rate || null,
            pace_s_per_500: entry.pace_sec_per_500m || null,
          },
          splits_json: null,
          machine_settings_json: null,
          warmup_done: false,
          warmup_type: [],
          warmup_notes: null,
          is_valid: entry.status !== 'invalid',
          invalid_reason: null,
          quality_rating_1_5: null,
          rpe_1_10: entry.rpe || null,
          is_comparable: true,
          non_comparable_reason: null,
          notes: entry.notes ? `[Z tréninku] ${entry.notes}` : '[Importováno z tréninku]',
          environment_json: null,
          attachments: null,
          exercise_entry_id: entry.id,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          test_definitions: {
            ...matchedDef,
            comparability_rules_json: typeof matchedDef.comparability_rules_json === 'object' 
              ? matchedDef.comparability_rules_json 
              : {},
            required_metrics_schema: typeof matchedDef.required_metrics_schema === 'object' 
              ? matchedDef.required_metrics_schema 
              : {}
          },
          clients: entry.clients as any,
        };

        virtualSessions.push(virtualSession);
      }

      // 6. Combine and sort by date
      const realSessions = (testData || []).map(d => ({
        ...d,
        metrics_json: typeof d.metrics_json === 'object' && d.metrics_json !== null ? d.metrics_json : {},
        splits_json: Array.isArray(d.splits_json) ? d.splits_json : null,
        machine_settings_json: typeof d.machine_settings_json === 'object' && d.machine_settings_json !== null ? d.machine_settings_json : null,
        warmup_type: Array.isArray(d.warmup_type) ? d.warmup_type : [],
        test_definitions: d.test_definitions ? {
          ...d.test_definitions,
          comparability_rules_json: typeof d.test_definitions.comparability_rules_json === 'object' ? d.test_definitions.comparability_rules_json : {},
          required_metrics_schema: typeof d.test_definitions.required_metrics_schema === 'object' ? d.test_definitions.required_metrics_schema : {}
        } : undefined
      })) as unknown as TestSession[];

      const allSessions = [...realSessions, ...virtualSessions];
      
      // Sort by date descending
      allSessions.sort((a, b) => 
        new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      );

      return allSessions;
    }
  });
}

export function useCreateTestSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ input, definition }: { input: CreateTestSessionInput; definition: TestDefinition; }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: previousSessions } = await supabase
        .from('test_sessions')
        .select('*')
        .eq('test_definition_id', input.test_definition_id)
        .eq('client_id', input.client_id)
        .order('date_time', { ascending: false })
        .limit(10);

      const parsedPrevious = (previousSessions || []).map(s => ({
        ...s,
        machine_settings_json: typeof s.machine_settings_json === 'object' && s.machine_settings_json !== null 
          ? s.machine_settings_json as unknown as MachineSettings 
          : null
      })) as unknown as TestSession[];

      const { isComparable, reason } = evaluateComparability(input, parsedPrevious, definition.comparability_rules_json);

      const derivedMetrics: Record<string, number | string | null> = { ...input.metrics_json };
      
      if (derivedMetrics.distance_m && derivedMetrics.time_s) {
        const distance = Number(derivedMetrics.distance_m);
        const time = Number(derivedMetrics.time_s);
        if (distance > 0) {
          derivedMetrics.pace_s_per_500 = (time / distance) * 500;
          derivedMetrics.pace_s_per_km = (time / distance) * 1000;
        }
      }

      if (derivedMetrics.avg_hr_first_10m && derivedMetrics.avg_hr_last_10m) {
        const hrFirst = Number(derivedMetrics.avg_hr_first_10m);
        const hrLast = Number(derivedMetrics.avg_hr_last_10m);
        derivedMetrics.hr_drift = ((hrLast - hrFirst) / hrFirst) * 100;
      }

      if (derivedMetrics.L_value !== undefined && derivedMetrics.R_value !== undefined) {
        const L = Number(derivedMetrics.L_value);
        const R = Number(derivedMetrics.R_value);
        derivedMetrics.asymmetry_abs = Math.abs(L - R);
        const avg = (L + R) / 2;
        derivedMetrics.asymmetry_pct = avg > 0 ? (derivedMetrics.asymmetry_abs / avg) * 100 : 0;
        derivedMetrics.avg_value = avg;
        if (definition.primary_metric_key === 'avg_cm') derivedMetrics.avg_cm = avg;
        if (definition.primary_metric_key === 'avg_deg') derivedMetrics.avg_deg = avg;
      }

      const { data: session, error } = await supabase
        .from('test_sessions')
        .insert({
          user_id: user.id,
          test_definition_id: input.test_definition_id,
          client_id: input.client_id,
          date_time: input.date_time,
          metrics_json: derivedMetrics,
          splits_json: input.splits_json as unknown as null,
          machine_settings_json: input.machine_settings_json as unknown as null,
          warmup_done: input.warmup_done,
          warmup_type: input.warmup_type,
          warmup_notes: input.warmup_notes,
          is_valid: input.is_valid,
          invalid_reason: input.invalid_reason,
          quality_rating_1_5: input.quality_rating_1_5,
          rpe_1_10: input.rpe_1_10,
          is_comparable: isComparable,
          non_comparable_reason: reason,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) throw error;

      if (definition.linked_exercise_id && session) {
        await supabase.from('exercise_entries').insert({
          user_id: user.id,
          client_id: input.client_id,
          exercise_id: definition.linked_exercise_id,
          exercise_name: definition.name,
          date: input.date_time.split('T')[0],
          sets: 1,
          time_seconds: derivedMetrics.time_s ? Number(derivedMetrics.time_s) : null,
          distance_meters: derivedMetrics.distance_m ? Number(derivedMetrics.distance_m) : null,
          avg_watts: derivedMetrics.avg_power_w ? Number(derivedMetrics.avg_power_w) : null,
          pace_sec_per_500m: derivedMetrics.pace_s_per_500 ? Number(derivedMetrics.pace_s_per_500) : null,
          avg_heart_rate: derivedMetrics.avg_hr ? Number(derivedMetrics.avg_hr) : null,
          max_heart_rate: derivedMetrics.max_hr ? Number(derivedMetrics.max_hr) : null,
          rpe: input.rpe_1_10,
          is_test: true,
          notes: `Test: ${definition.name_cs || definition.name}`,
        });
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-entries'] });
      toast.success('Test uložen');
    },
    onError: () => toast.error('Nepodařilo se uložit test')
  });
}

export function useDeleteTestSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('test_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-sessions'] });
      toast.success('Test smazán');
    },
    onError: () => toast.error('Nepodařilo se smazat test')
  });
}

export function useLastMachineSettings(testDefinitionId: string, clientId: string) {
  return useQuery({
    queryKey: ['last-machine-settings', testDefinitionId, clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('test_sessions')
        .select('machine_settings_json')
        .eq('test_definition_id', testDefinitionId)
        .eq('client_id', clientId)
        .order('date_time', { ascending: false })
        .limit(1)
        .single();
      
      return typeof data?.machine_settings_json === 'object' ? data.machine_settings_json as unknown as MachineSettings : null;
    },
    enabled: !!testDefinitionId && !!clientId
  });
}
