import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Heart, ChevronDown, ChevronUp, Crown, Medal, Award, Users, Route, Timer, HelpCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { ExerciseWithPercentile } from '@/hooks/useExercisePercentiles';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { 
  useStrengthExerciseLeaderboard, 
  useCardioExerciseLeaderboard,
  ExerciseLeaderboardEntry,
  GenderFilter 
} from '@/hooks/useExerciseLeaderboard';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { PercentileGauge } from './PercentileGauge';

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
    bgColor: 'bg-muted/50', 
    textColor: 'text-muted-foreground',
    borderColor: 'border-border/50',
    gradient: 'from-muted to-muted',
    iconColor: 'text-muted-foreground'
  };
  
  if (percentile >= 90) return { 
    label: `Top ${Math.round(100 - percentile)}%`, 
    bgColor: 'bg-gradient-to-br from-primary/15 via-primary/10 to-success/10', 
    textColor: 'text-primary',
    borderColor: 'border-primary/30',
    gradient: 'from-primary via-primary to-success',
    iconColor: 'text-primary'
  };
  if (percentile >= 75) return { 
    label: `Top ${Math.round(100 - percentile)}%`, 
    bgColor: 'bg-gradient-to-br from-success/15 to-success/10', 
    textColor: 'text-success',
    borderColor: 'border-success/30',
    gradient: 'from-success to-success',
    iconColor: 'text-success'
  };
  if (percentile >= 50) return { 
    label: 'Nad průměr', 
    bgColor: 'bg-gradient-to-br from-warning/15 to-warning/10', 
    textColor: 'text-warning',
    borderColor: 'border-warning/30',
    gradient: 'from-warning to-warning',
    iconColor: 'text-warning'
  };
  if (percentile >= 25) return { 
    label: 'Průměr', 
    bgColor: 'bg-muted/50', 
    textColor: 'text-muted-foreground',
    borderColor: 'border-border/50',
    gradient: 'from-muted-foreground to-muted-foreground',
    iconColor: 'text-muted-foreground'
  };
  return { 
    label: 'Začínáš', 
    bgColor: 'bg-gradient-to-br from-sky-500/15 to-sky-500/10', 
    textColor: 'text-sky-500',
    borderColor: 'border-sky-500/30',
    gradient: 'from-sky-500 to-sky-500',
    iconColor: 'text-sky-500'
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
      <ToggleGroupItem value="all" aria-label="Všichni" className="gap-1 px-3 py-2 text-xs min-h-[44px]">
        <Users className="w-3 h-3" />
        Vše
      </ToggleGroupItem>
      <ToggleGroupItem value="male" aria-label="Muži" className="gap-1 px-3 py-2 text-xs min-h-[44px]">
        <span className="text-sm font-medium">♂</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="female" aria-label="Ženy" className="gap-1 px-3 py-2 text-xs min-h-[44px]">
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
      <ToggleGroupItem value="distance" aria-label="Vzdálenost" className="gap-1 px-3 py-2 text-xs min-h-[44px]">
        <Route className="w-3 h-3" />
        Vzdálenost
      </ToggleGroupItem>
      <ToggleGroupItem value="duration" aria-label="Čas" className="gap-1 px-3 py-2 text-xs min-h-[44px]">
        <Timer className="w-3 h-3" />
        Čas
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function LeaderboardRow({ 
  entry, 
  isCurrentClient,
  currentClientName
}: { 
  entry: ExerciseLeaderboardEntry; 
  isCurrentClient: boolean;
  currentClientName?: string;
}) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-warning" />;
      case 2: return <Medal className="w-4 h-4 text-muted-foreground" />;
      case 3: return <Award className="w-4 h-4 text-warning/70" />;
      default: return <span className="text-xs font-medium text-muted-foreground">{rank}</span>;
    }
  };

  // For current client, always show their real name instead of anonymous name
  const displayName = isCurrentClient && currentClientName ? currentClientName : entry.nickname;
  const displayInitial = displayName.charAt(0).toUpperCase();

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
        entry.rank === 1 ? "bg-warning/20 text-warning" :
        entry.rank === 2 ? "bg-muted text-muted-foreground" :
        entry.rank === 3 ? "bg-warning/10 text-warning/80" :
        "bg-muted text-muted-foreground"
      )}>
        {displayInitial}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium truncate block",
          isCurrentClient && "text-primary",
          !isCurrentClient && entry.is_anonymous && "italic text-muted-foreground"
        )}>
          {displayName}
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
  clientName,
  isExpanded,
  onToggle,
}: {
  exercise: ExerciseWithPercentile;
  exerciseType: 'strength' | 'cardio';
  trainerId: string | undefined;
  clientId: string | undefined;
  clientName: string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [cardioMetric, setCardioMetric] = useState<'distance' | 'duration'>('distance');
  
  const style = getPercentileStyle(exercise.client_percentile);
  const percentile = exercise.client_percentile;
  const isTopPerformer = percentile !== null && percentile >= 75;
  
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
      className={cn(
        "rounded-xl border overflow-hidden transition-all cursor-pointer group",
        style.borderColor,
        isExpanded ? "col-span-full" : "",
        isTopPerformer && "ring-1 ring-primary/20"
      )}
    >
      {/* Card Header - Always visible */}
      <div 
        className={cn(
          "p-4 relative",
          style.bgColor
        )}
        onClick={onToggle}
      >
        {/* Top performer glow effect */}
        {isTopPerformer && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        )}
        
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 relative">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Exercise icon with gradient background */}
            <div className={cn(
              "relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
              exerciseType === 'strength' 
                ? "bg-gradient-to-br from-primary/20 to-primary/10" 
                : "bg-gradient-to-br from-success/20 to-success/10"
            )}>
              {exerciseType === 'strength' ? (
                <Dumbbell className="w-6 h-6 text-primary" />
              ) : (
                <Heart className="w-6 h-6 text-success" />
              )}
              {isTopPerformer && (
                <motion.div 
                  className="absolute -top-1 -right-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <Zap className="w-4 h-4 text-primary fill-primary" />
                </motion.div>
              )}
            </div>
            
            {/* Exercise name and value */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <h4 className="font-semibold capitalize truncate text-base">{exercise.exercise_name}</h4>
                <StatInfoTooltip
                  title="Srovnání výkonu"
                  description="Percentil ukazuje, kolik procent klientů jsi překonal v tomto cviku. Čím vyšší číslo, tím lepší výkon ve srovnání s ostatními."
                  calculation="Percentil = (počet klientů s horším výkonem / celkový počet) × 100"
                />
              </div>
              {exercise.client_best_value !== null && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-bold tabular-nums">
                    {formatExerciseValue(exercise.client_best_value, exercise.metric_type, exerciseType)}
                  </span>
                  <span className="text-xs text-muted-foreground">tvůj max</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Expand indicator */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-medium border",
                style.borderColor, 
                style.textColor
              )}
            >
              {style.label}
            </Badge>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.div>
          </div>
        </div>
        
        {/* Percentile Gauge - Compact version when collapsed */}
        {!isExpanded && percentile !== null && (
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <PercentileGauge percentile={percentile} />
          </motion.div>
        )}
      </div>
      
      {/* Expanded Content - Leaderboard */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
            }}
            transition={{ 
              height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.2, delay: 0.05 }
            }}
            className="overflow-hidden will-change-[height,opacity]"
          >
            <div className="p-4 border-t border-border/50 space-y-4 bg-card/50">
              {/* Percentile Gauge - Full version when expanded */}
              {percentile !== null && (
                <PercentileGauge percentile={percentile} />
              )}
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Filtrovat:</span>
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
                      <span className="text-xl font-bold text-primary">#{leaderboard.client_rank}</span>
                      <span className="text-sm text-muted-foreground">
                        z {leaderboard.total_participants} klientů
                      </span>
                    </div>
                    {leaderboard.client_percentile != null && (
                      <Badge className="bg-primary/10 text-primary border-0">
                        Lepší než {Math.round(leaderboard.client_percentile)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Leaderboard list */}
              <div className="space-y-1">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Žebříček
                </h5>
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
                        currentClientName={clientName}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Žádní účastníci v této kategorii
                  </p>
                )}
              </div>
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

  // Get client profile for displaying real name
  const { clientProfile } = useClientPortal();

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
          clientName={clientProfile?.name}
          isExpanded={expandedExercise === exercise.exercise_name}
          onToggle={() => handleToggle(exercise.exercise_name)}
        />
      ))}
    </div>
  );
}
