import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight, Dumbbell, Timer, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface CompactPRsSectionProps {
  clientId: string;
  onViewAll?: () => void;
}

interface PREntry {
  id: string;
  exercise_name: string;
  date: string;
  type: 'strength' | 'cardio' | 'distance' | 'reps';
  // Strength fields
  weight_kg?: number | null;
  reps?: number | null;
  // Cardio/time fields
  time_seconds?: number | null;
  distance_meters?: number | null;
}

// Format duration in seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number): string {
  if (seconds < 0 || isNaN(seconds)) return '-';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Format distance in meters to readable format
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  if (meters >= 1) {
    return `${Math.round(meters)}m`;
  }
  // For small values (like jump distances), show in cm
  return `${Math.round(meters * 100)}cm`;
}

// Determine exercise type based on available data
function determineExerciseType(entry: {
  weight_kg?: number | null;
  reps?: number | null;
  time_seconds?: number | null;
  distance_meters?: number | null;
}): 'strength' | 'cardio' | 'distance' | 'reps' {
  const hasWeight = entry.weight_kg && entry.weight_kg > 0;
  const hasTime = entry.time_seconds && entry.time_seconds > 0;
  const hasDistance = entry.distance_meters && entry.distance_meters > 0;
  const hasReps = entry.reps && entry.reps > 0;
  
  // Time-based exercise (cardio, rowing, running, etc.)
  if (hasTime) {
    return 'cardio';
  }
  
  // Distance-based without time (jumps, throws)
  if (hasDistance && !hasTime && !hasWeight) {
    return 'distance';
  }
  
  // Weight-based (strength)
  if (hasWeight) {
    return 'strength';
  }
  
  // Reps only (bodyweight exercises)
  if (hasReps) {
    return 'reps';
  }
  
  return 'strength'; // Default fallback
}

// Get display value for a PR based on type
function getPRDisplay(pr: PREntry): { value: string; secondary?: string } {
  switch (pr.type) {
    case 'cardio':
      const time = pr.time_seconds ? formatDuration(pr.time_seconds) : '-';
      const distance = pr.distance_meters ? formatDistance(pr.distance_meters) : null;
      return { value: time, secondary: distance || undefined };
    
    case 'distance':
      return { value: formatDistance(pr.distance_meters || 0) };
    
    case 'strength':
      const weight = pr.weight_kg ? `${pr.weight_kg}kg` : null;
      const reps = pr.reps ? `×${pr.reps}` : null;
      if (weight) {
        return { value: weight, secondary: reps || undefined };
      }
      return { value: '-' };
    
    case 'reps':
      return { value: `${pr.reps || 0} rep${(pr.reps || 0) !== 1 ? 's' : ''}` };
    
    default:
      return { value: '-' };
  }
}

// Get icon for exercise type
function getTypeIcon(type: PREntry['type']) {
  switch (type) {
    case 'cardio':
      return { icon: Timer, colorClass: 'bg-success/10 text-success' };
    case 'distance':
      return { icon: Ruler, colorClass: 'bg-warning/10 text-warning' };
    case 'strength':
      return { icon: Dumbbell, colorClass: 'bg-primary/10 text-primary' };
    case 'reps':
      return { icon: Dumbbell, colorClass: 'bg-accent/10 text-accent' };
    default:
      return { icon: Dumbbell, colorClass: 'bg-primary/10 text-primary' };
  }
}

export function CompactPRsSection({ clientId, onViewAll }: CompactPRsSectionProps) {
  const { data: prs, isLoading } = useQuery({
    queryKey: ['compact-prs', clientId],
    queryFn: async () => {
      // Fetch PRs from exercise_entries (includes both strength and cardio-style entries)
      const { data: exercisePRs, error: exerciseError } = await supabase
        .from('exercise_entries')
        .select('id, exercise_name, weight_kg, reps, time_seconds, distance_meters, date')
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .order('date', { ascending: false })
        .limit(6);
      
      if (exerciseError) throw exerciseError;
      
      // Fetch cardio PRs from dedicated cardio table
      const { data: cardioPRs, error: cardioError } = await supabase
        .from('cardio_entries')
        .select('id, exercise_name, duration_seconds, distance_meters, date')
        .eq('client_id', clientId)
        .eq('is_pr', true)
        .order('date', { ascending: false })
        .limit(4);
      
      if (cardioError) throw cardioError;
      
      // Process exercise entries - determine type based on data
      const combined: PREntry[] = [
        ...(exercisePRs || []).map(pr => ({
          id: pr.id,
          exercise_name: pr.exercise_name,
          date: pr.date,
          type: determineExerciseType(pr),
          weight_kg: pr.weight_kg,
          reps: pr.reps,
          time_seconds: pr.time_seconds,
          distance_meters: pr.distance_meters,
        })),
        ...(cardioPRs || []).map(pr => ({
          id: pr.id,
          exercise_name: pr.exercise_name,
          date: pr.date,
          type: 'cardio' as const,
          time_seconds: pr.duration_seconds,
          distance_meters: pr.distance_meters,
        })),
      ];
      
      // Sort by date descending and take top 4
      return combined
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (!prs || prs.length === 0) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warning" />
          <span className="font-semibold text-sm">Osobní rekordy</span>
        </div>
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Zatím žádné rekordy
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <span className="font-semibold text-sm">Osobní rekordy</span>
        </div>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Vše
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* PRs list */}
      <div className="space-y-2">
        {prs.map((pr, index) => {
          const display = getPRDisplay(pr);
          const { icon: TypeIcon, colorClass } = getTypeIcon(pr.type);
          
          return (
            <motion.div
              key={pr.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass.split(' ')[0]}`}>
                  <TypeIcon className={`w-4 h-4 ${colorClass.split(' ')[1]}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium truncate block">{pr.exercise_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(pr.date), { addSuffix: true, locale: cs })}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className={`text-sm font-bold ${colorClass.split(' ')[1]}`}>
                  {display.value}
                </span>
                {display.secondary && (
                  <span className="text-xs text-muted-foreground ml-1">{display.secondary}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
