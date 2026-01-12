import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Heart, ChevronDown, ChevronUp, Crown, Medal, Award, Users, Route, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { ExerciseWithPercentile } from '@/hooks/useExercisePercentiles';
import { 
  useStrengthExerciseLeaderboard, 
  useCardioExerciseLeaderboard,
  ExerciseLeaderboardEntry,
  GenderFilter 
} from '@/hooks/useExerciseLeaderboard';

interface ExerciseComparisonGridProps {
  exercises: ExerciseWithPercentile[];
  exerciseType: 'strength' | 'cardio';
  trainerId: string | undefined;
  clientId: string | undefined;
  isLoading: boolean;
}

function getPercentileStyle(percentile: number | null) {
  if (percentile === null) return { 
    label: 'Bez dat', 
    bgColor: 'bg-muted', 
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    progressColor: 'bg-muted-foreground'
  };
  
  if (percentile >= 90) return { 
    label: `Top ${Math.round(100 - percentile)}%`, 
    bgColor: 'bg-emerald-500/10', 
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    progressColor: 'bg-emerald-500'
  };
  if (percentile >= 75) return { 
    label: `Top ${Math.round(100 - percentile)}%`, 
    bgColor: 'bg-emerald-500/10', 
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/20',
    progressColor: 'bg-emerald-500'
  };
  if (percentile >= 50) return { 
    label: 'Nad průměr', 
    bgColor: 'bg-amber-500/10', 
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/20',
    progressColor: 'bg-amber-500'
  };
  if (percentile >= 25) return { 
    label: 'Průměr', 
    bgColor: 'bg-muted', 
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
    progressColor: 'bg-muted-foreground'
  };
  return { 
    label: 'Prostor ke zlepšení', 
    bgColor: 'bg-orange-500/10', 
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500/20',
    progressColor: 'bg-orange-500'
  };
}

function GenderFilterToggle({ 
  value, 
  onChange 
}: { 
  value: GenderFilter; 
  onChange: (value: GenderFilter) => void;
}) {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(v) => v && onChange(v as GenderFilter)}
      size="sm"
    >
      <ToggleGroupItem value="all" aria-label="Všichni" className="gap-1 px-2 text-xs">
        <Users className="w-3 h-3" />
        Vše
      </ToggleGroupItem>
      <ToggleGroupItem value="male" aria-label="Muži" className="gap-1 px-2 text-xs">
        <span className="text-sm font-medium">♂</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="female" aria-label="Ženy" className="gap-1 px-2 text-xs">
        <span className="text-sm font-medium">♀</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function CardioMetricToggle({
  value,
  onChange
}: {
  value: 'distance' | 'duration';
  onChange: (value: 'distance' | 'duration') => void;
}) {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(v) => v && onChange(v as 'distance' | 'duration')}
      size="sm"
    >
      <ToggleGroupItem value="distance" aria-label="Vzdálenost" className="gap-1 px-2 text-xs">
        <Route className="w-3 h-3" />
        Vzdálenost
      </ToggleGroupItem>
      <ToggleGroupItem value="duration" aria-label="Čas" className="gap-1 px-2 text-xs">
        <Timer className="w-3 h-3" />
        Čas
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function LeaderboardRow({ 
  entry, 
  isCurrentClient 
}: { 
  entry: ExerciseLeaderboardEntry; 
  isCurrentClient: boolean;
}) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-amber-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-amber-700" />;
      default: return <span className="text-xs font-medium text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg transition-colors",
      isCurrentClient ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30",
      entry.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-transparent"
    )}>
      <div className="w-6 flex items-center justify-center shrink-0">
        {getRankIcon(entry.rank)}
      </div>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
        entry.rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
        entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
        "bg-muted text-muted-foreground"
      )}>
        {entry.nickname.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium truncate block",
          isCurrentClient && "text-primary",
          entry.is_anonymous && "italic text-muted-foreground"
        )}>
          {entry.nickname}
          {isCurrentClient && <span className="text-xs ml-1 opacity-70">(Ty)</span>}
        </span>
      </div>
      <span className="text-sm font-bold shrink-0">{entry.display_value}</span>
    </div>
  );
}

function ExerciseCard({
  exercise,
  exerciseType,
  trainerId,
  clientId,
  isExpanded,
  onToggle,
}: {
  exercise: ExerciseWithPercentile;
  exerciseType: 'strength' | 'cardio';
  trainerId: string | undefined;
  clientId: string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [cardioMetric, setCardioMetric] = useState<'distance' | 'duration'>('distance');
  
  const style = getPercentileStyle(exercise.client_percentile);
  
  const { data: strengthLeaderboard, isLoading: strengthLoading } = useStrengthExerciseLeaderboard(
    exerciseType === 'strength' && isExpanded ? exercise.exercise_name : null,
    trainerId,
    genderFilter
  );
  
  const { data: cardioLeaderboard, isLoading: cardioLoading } = useCardioExerciseLeaderboard(
    exerciseType === 'cardio' && isExpanded ? exercise.exercise_name : null,
    trainerId,
    cardioMetric,
    genderFilter
  );
  
  const leaderboard = exerciseType === 'strength' ? strengthLeaderboard : cardioLeaderboard;
  const isLoading = exerciseType === 'strength' ? strengthLoading : cardioLoading;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border transition-all cursor-pointer",
        style.borderColor,
        isExpanded ? "col-span-full" : ""
      )}
    >
      {/* Card Header - Always visible */}
      <div 
        className={cn("p-4", style.bgColor)}
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              exerciseType === 'strength' ? "bg-blue-500/10" : "bg-green-500/10"
            )}>
              {exerciseType === 'strength' ? (
                <Dumbbell className="w-5 h-5 text-blue-500" />
              ) : (
                <Heart className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold capitalize truncate">{exercise.exercise_name}</h4>
              {exercise.client_best_value !== null && (
                <p className="text-sm text-muted-foreground">
                  {formatExerciseValue(exercise.client_best_value, exercise.metric_type, exerciseType)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={cn("text-xs border", style.borderColor, style.textColor)}>
              {style.label}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Mini progress bar */}
        {exercise.client_percentile !== null && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div 
                className={cn("h-full rounded-full", style.progressColor)}
                initial={{ width: 0 }}
                animate={{ width: `${exercise.client_percentile}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Expanded Content - Leaderboard */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-border/50 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <GenderFilterToggle value={genderFilter} onChange={setGenderFilter} />
                {exerciseType === 'cardio' && (
                  <CardioMetricToggle value={cardioMetric} onChange={setCardioMetric} />
                )}
              </div>
              
              {/* Client position summary */}
              {leaderboard?.client_rank && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">#{leaderboard.client_rank}</span>
                      <span className="text-sm text-muted-foreground">
                        z {leaderboard.total_participants}
                      </span>
                    </div>
                    {leaderboard.client_percentile != null && (
                      <Badge className="bg-primary/10 text-primary border-0">
                        Top {Math.round(100 - leaderboard.client_percentile)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Leaderboard list */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : leaderboard?.leaderboard.length ? (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {leaderboard.leaderboard.map((entry) => (
                    <LeaderboardRow
                      key={entry.client_id}
                      entry={entry}
                      isCurrentClient={entry.client_id === clientId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Žádní účastníci v této kategorii
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatCardioValue(value: number): string {
  // Assume value is in seconds for duration
  if (value >= 60) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  // Assume value is in meters for distance
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  return `${value} m`;
}

function formatExerciseValue(
  value: number, 
  metricType: string | undefined, 
  exerciseType: 'strength' | 'cardio'
): string {
  if (exerciseType === 'cardio') {
    return formatCardioValue(value);
  }
  
  switch (metricType) {
    case 'time':
      // Format time (seconds)
      if (value >= 60) {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}:${seconds.toFixed(0).padStart(2, '0')}`;
      }
      return `${value.toFixed(1)} s`;
    case 'distance':
      // Format distance (meters)
      if (value >= 1) {
        return `${value.toFixed(2)} m`;
      }
      return `${(value * 100).toFixed(0)} cm`;
    case 'height':
      // Format height (cm)
      return `${value.toFixed(0)} cm`;
    case 'weight':
    default:
      return `${value} kg`;
  }
}

export default function ExerciseComparisonGrid({
  exercises,
  exerciseType,
  trainerId,
  clientId,
  isLoading,
}: ExerciseComparisonGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
            {exerciseType === 'strength' ? (
              <Dumbbell className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Heart className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <p className="text-muted-foreground">
            Zatím nemáš žádné záznamy u {exerciseType === 'strength' ? 'silových' : 'kardio'} cviků
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by percentile (highest first), then by entry count
  const sortedExercises = [...exercises].sort((a, b) => {
    if (a.client_percentile !== null && b.client_percentile !== null) {
      return b.client_percentile - a.client_percentile;
    }
    if (a.client_percentile !== null) return -1;
    if (b.client_percentile !== null) return 1;
    return b.entry_count - a.entry_count;
  });

  // Track which exercise is currently expanded (only one at a time)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const handleToggle = (exerciseName: string) => {
    setExpandedExercise(prev => prev === exerciseName ? null : exerciseName);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sortedExercises.map((exercise) => (
        <ExerciseCard
          key={exercise.exercise_name}
          exercise={exercise}
          exerciseType={exerciseType}
          trainerId={trainerId}
          clientId={clientId}
          isExpanded={expandedExercise === exercise.exercise_name}
          onToggle={() => handleToggle(exercise.exercise_name)}
        />
      ))}
    </div>
  );
}
