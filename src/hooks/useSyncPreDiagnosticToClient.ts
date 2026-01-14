/**
 * Hook for syncing pre-diagnostic data to client profile
 * 
 * Maps pre-diagnostic answers to client table fields:
 * - age → calculates birth_date
 * - height → stored as note (no column yet)
 * - weight → stored as note (no column yet)  
 * - sleep_hours_avg → sleep_hours
 * - sleep_quality → stress_level (approximate)
 * - daily_activity_type/occupation → occupation
 * - current_activities → current_activities
 * - main_goal/goals → training_goals
 * - health notes (pain, injuries, surgeries, medications) → health_restrictions
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PreDiagnosticAnswer } from '@/hooks/usePreDiagnosticForms';

interface SyncOptions {
  clientId: string;
  answers: PreDiagnosticAnswer[];
  /** Specific fields to sync, or all if empty */
  fieldsToSync?: string[];
}

interface SyncResult {
  synced: string[];
  skipped: string[];
  errors: string[];
}

// Map pre-diagnostic field keys to client columns
const FIELD_MAPPING: Record<string, { clientField: string; transform?: (value: any) => any }> = {
  age: {
    clientField: 'birth_date',
    transform: (age: number) => {
      if (!age || typeof age !== 'number') return null;
      const now = new Date();
      const birthYear = now.getFullYear() - age;
      return `${birthYear}-01-01`; // Approximate to Jan 1
    },
  },
  sleep_hours_avg: {
    clientField: 'sleep_hours',
    transform: (value: any) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const match = value.match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
      }
      return null;
    },
  },
  sleep_quality: {
    clientField: 'stress_level',
    transform: (value: any) => {
      // Map sleep quality (1-5 good to bad) to stress level (1-10)
      if (typeof value === 'number') return Math.min(10, value * 2);
      return null;
    },
  },
  daily_activity_type: {
    clientField: 'occupation',
    transform: (value: any) => {
      const map: Record<string, string> = {
        'sedentary': 'sedentary',
        'sedavá': 'sedentary',
        'mixed': 'mixed',
        'kombinovaná': 'mixed',
        'active': 'active',
        'aktivní': 'active',
      };
      if (typeof value === 'string') {
        return map[value.toLowerCase()] || value;
      }
      return value;
    },
  },
  occupation: {
    clientField: 'occupation',
  },
  current_activities: {
    clientField: 'current_activities',
    transform: (value: any) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return value.split(',').map(s => s.trim());
      return null;
    },
  },
  main_goal: {
    clientField: 'training_goals',
    transform: (value: any) => {
      if (typeof value === 'string') return [value];
      if (Array.isArray(value)) return value;
      return [];
    },
  },
  goals: {
    clientField: 'training_goals',
    transform: (value: any) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') return [value];
      return [];
    },
  },
  priorities: {
    clientField: 'training_goals',
    transform: (value: any) => {
      if (Array.isArray(value)) return value;
      return [];
    },
  },
};

// Fields that should be aggregated into health_restrictions
const HEALTH_FIELDS = [
  'has_pain',
  'pain_areas',
  'pain_type', 
  'pain_duration',
  'pain_limitation',
  'injury_history',
  'injury_details',
  'surgery_history',
  'surgery_details',
  'medications',
  'medication_details',
  'health_notes',
];

function buildHealthRestrictions(answers: PreDiagnosticAnswer[], existing: string = ''): string {
  const sections: string[] = [];
  
  const answerMap = new Map(answers.map(a => [a.field_key, a.value]));
  
  // Pain section
  const hasPain = answerMap.get('has_pain');
  if (hasPain === true || hasPain === 'Ano' || hasPain === 'yes') {
    const painParts: string[] = ['BOLESTI:'];
    const painAreas = answerMap.get('pain_areas');
    if (painAreas) {
      painParts.push(`Oblasti: ${Array.isArray(painAreas) ? painAreas.join(', ') : painAreas}`);
    }
    const painType = answerMap.get('pain_type');
    if (painType) painParts.push(`Typ: ${painType}`);
    const painDuration = answerMap.get('pain_duration');
    if (painDuration) painParts.push(`Trvání: ${painDuration}`);
    const painLimitation = answerMap.get('pain_limitation');
    if (painLimitation) painParts.push(`Omezení: ${painLimitation}`);
    
    if (painParts.length > 1) {
      sections.push(painParts.join(' '));
    }
  }
  
  // Injuries section
  const hasInjury = answerMap.get('injury_history');
  if (hasInjury === true || hasInjury === 'Ano' || hasInjury === 'yes') {
    const injuryDetails = answerMap.get('injury_details');
    if (injuryDetails) {
      sections.push(`ZRANĚNÍ: ${injuryDetails}`);
    }
  }
  
  // Surgery section
  const hasSurgery = answerMap.get('surgery_history');
  if (hasSurgery === true || hasSurgery === 'Ano' || hasSurgery === 'yes') {
    const surgeryDetails = answerMap.get('surgery_details');
    if (surgeryDetails) {
      sections.push(`OPERACE: ${surgeryDetails}`);
    }
  }
  
  // Medications section
  const hasMeds = answerMap.get('medications');
  if (hasMeds === true || hasMeds === 'Ano' || hasMeds === 'yes') {
    const medDetails = answerMap.get('medication_details');
    if (medDetails) {
      sections.push(`LÉKY: ${medDetails}`);
    }
  }
  
  // General health notes
  const healthNotes = answerMap.get('health_notes');
  if (healthNotes) {
    sections.push(`POZNÁMKY: ${healthNotes}`);
  }
  
  // Combine with existing, avoiding duplicates
  const newText = sections.join('\n\n');
  if (!existing) return newText;
  if (existing.includes('[Pre-diagnostika]')) {
    // Replace existing pre-diagnostic section
    return existing.replace(/\[Pre-diagnostika\][\s\S]*?(?=\n\n\[|$)/, `[Pre-diagnostika]\n${newText}`);
  }
  return `${existing}\n\n[Pre-diagnostika]\n${newText}`;
}

export function useSyncPreDiagnosticToClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, answers, fieldsToSync }: SyncOptions): Promise<SyncResult> => {
      // Get current client data first
      const { data: client, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (fetchError) throw fetchError;

      const result: SyncResult = { synced: [], skipped: [], errors: [] };
      const updates: Record<string, any> = {};

      // Process each answer
      for (const answer of answers) {
        const fieldKey = answer.field_key;
        
        // Skip if specific fields requested and this isn't one
        if (fieldsToSync && fieldsToSync.length > 0 && !fieldsToSync.includes(fieldKey)) {
          continue;
        }

        // Check if it's a health field
        if (HEALTH_FIELDS.includes(fieldKey)) {
          // These are handled separately
          continue;
        }

        // Check if we have a mapping for this field
        const mapping = FIELD_MAPPING[fieldKey];
        if (!mapping) {
          result.skipped.push(fieldKey);
          continue;
        }

        try {
          const newValue = mapping.transform 
            ? mapping.transform(answer.value)
            : answer.value;

          if (newValue !== null && newValue !== undefined) {
            updates[mapping.clientField] = newValue;
            result.synced.push(fieldKey);
          } else {
            result.skipped.push(fieldKey);
          }
        } catch (e) {
          result.errors.push(fieldKey);
        }
      }

      // Build health restrictions if any health fields present
      const healthAnswers = answers.filter(a => HEALTH_FIELDS.includes(a.field_key));
      if (healthAnswers.length > 0 && (!fieldsToSync || fieldsToSync.some(f => HEALTH_FIELDS.includes(f)))) {
        const newHealthRestrictions = buildHealthRestrictions(healthAnswers, client.health_restrictions || '');
        if (newHealthRestrictions !== client.health_restrictions) {
          updates.health_restrictions = newHealthRestrictions;
          result.synced.push('health_restrictions');
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(updates)
          .eq('id', clientId);

        if (updateError) throw updateError;
      }

      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      
      if (result.synced.length > 0) {
        toast.success(`Synchronizováno ${result.synced.length} polí do karty klienta`);
      } else {
        toast.info('Žádná data k synchronizaci');
      }
    },
    onError: (error) => {
      console.error('Error syncing pre-diagnostic to client:', error);
      toast.error('Nepodařilo se synchronizovat data');
    },
  });
}

/**
 * Preview what will be synced without actually syncing
 */
export function usePreviewPreDiagnosticSync() {
  return useMutation({
    mutationFn: async ({ clientId, answers }: Omit<SyncOptions, 'fieldsToSync'>) => {
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;

      const preview: Array<{
        field: string;
        label: string;
        currentValue: any;
        newValue: any;
        willUpdate: boolean;
      }> = [];

      for (const answer of answers) {
        const mapping = FIELD_MAPPING[answer.field_key];
        if (!mapping) continue;

        const currentValue = client[mapping.clientField];
        const newValue = mapping.transform 
          ? mapping.transform(answer.value)
          : answer.value;

        const willUpdate = newValue !== null && 
          newValue !== undefined && 
          JSON.stringify(newValue) !== JSON.stringify(currentValue);

        preview.push({
          field: answer.field_key,
          label: getFieldLabel(answer.field_key),
          currentValue,
          newValue,
          willUpdate,
        });
      }

      // Add health restrictions preview
      const healthAnswers = answers.filter(a => HEALTH_FIELDS.includes(a.field_key));
      if (healthAnswers.length > 0) {
        const newHealthRestrictions = buildHealthRestrictions(healthAnswers, client.health_restrictions || '');
        preview.push({
          field: 'health_restrictions',
          label: 'Zdravotní omezení',
          currentValue: client.health_restrictions,
          newValue: newHealthRestrictions,
          willUpdate: newHealthRestrictions !== client.health_restrictions,
        });
      }

      return preview.filter(p => p.willUpdate);
    },
  });
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    age: 'Věk',
    sleep_hours_avg: 'Hodiny spánku',
    sleep_quality: 'Kvalita spánku → Stres',
    daily_activity_type: 'Typ aktivity',
    occupation: 'Zaměstnání',
    current_activities: 'Aktuální aktivity',
    main_goal: 'Hlavní cíl',
    goals: 'Cíle',
    priorities: 'Priority',
    health_restrictions: 'Zdravotní omezení',
  };
  return labels[field] || field;
}
