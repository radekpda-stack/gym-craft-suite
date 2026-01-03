import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Dumbbell, Crown, Users, Heart, Footprints, ChevronRight, Timer, Route } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useLeaderboard, useLeaderboardSettings, LeaderboardEntry } from '@/hooks/useClientGamification';
import { 
  useStrengthExerciseLeaderboard,
  useCardioExerciseLeaderboard,
  ExerciseLeaderboardEntry,
  GenderFilter
} from '@/hooks/useExerciseLeaderboard';
import { useExercisesWithPercentiles, ExerciseWithPercentile } from '@/hooks/useExercisePercentiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

function LeaderboardRow({ entry, currentClientId }: { entry: LeaderboardEntry; currentClientId?: string }) {
  const isCurrentUser = entry.client_id === currentClientId;
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-amber-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-all",
        isCurrentUser 
          ? "bg-primary/10 border border-primary/20" 
          : "hover:bg-muted/50",
        entry.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-transparent"
      )}
    >
      <div className="w-8 flex items-center justify-center">
        {getRankIcon(entry.rank)}
      </div>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
          entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
          entry.rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
          entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
          "bg-muted text-muted-foreground"
        )}>
          {entry.nickname.charAt(0).toUpperCase()}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              isCurrentUser && "text-primary",
              entry.is_anonymous && "italic text-muted-foreground"
            )}>
              {entry.nickname}
            </span>
            
            {isCurrentUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                Ty
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <span className="font-bold text-lg">{entry.workout_count}</span>
      </div>
    </motion.div>
  );
}

function ExerciseLeaderboardRow({ 
  entry, 
  currentClientId 
}: { 
  entry: ExerciseLeaderboardEntry; 
  currentClientId?: string 
}) {
  const isCurrentUser = entry.client_id === currentClientId;
  
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-amber-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-4 p-3 rounded-xl transition-all",
        isCurrentUser 
          ? "bg-primary/10 border border-primary/20" 
          : "hover:bg-muted/50",
        entry.rank <= 3 && "bg-gradient-to-r from-amber-500/5 to-transparent"
      )}
    >
      <div className="w-8 flex items-center justify-center">
        {getRankIcon(entry.rank)}
      </div>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
          entry.rank === 1 ? "bg-amber-500/20 text-amber-600" :
          entry.rank === 2 ? "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" :
          entry.rank === 3 ? "bg-amber-700/20 text-amber-700" :
          "bg-muted text-muted-foreground"
        )}>
          {entry.nickname.charAt(0).toUpperCase()}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium truncate",
              isCurrentUser && "text-primary",
              entry.is_anonymous && "italic text-muted-foreground"
            )}>
              {entry.nickname}
            </span>
            
            {isCurrentUser && (
              <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                Ty
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <span className="font-bold text-lg">{entry.display_value}</span>
      </div>
    </motion.div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-2">
          {message || 'Zatím tu nikdo není'}
        </p>
        <p className="text-sm text-muted-foreground">
          Buď první, kdo se zapojí!
        </p>
      </CardContent>
    </Card>
  );
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
      className="justify-start"
    >
      <ToggleGroupItem value="all" aria-label="Všichni" size="sm" className="gap-1.5 px-3">
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">Všichni</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="male" aria-label="Muži" size="sm" className="gap-1.5 px-3">
        👨
        <span className="hidden sm:inline">Muži</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="female" aria-label="Ženy" size="sm" className="gap-1.5 px-3">
        👩
        <span className="hidden sm:inline">Ženy</span>
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
      className="justify-start"
    >
      <ToggleGroupItem value="distance" aria-label="Vzdálenost" size="sm" className="gap-1.5 px-3">
        <Route className="w-4 h-4" />
        <span className="hidden sm:inline">Vzdálenost</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="duration" aria-label="Čas" size="sm" className="gap-1.5 px-3">
        <Timer className="w-4 h-4" />
        <span className="hidden sm:inline">Čas</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

function getPercentileBadge(percentile: number | null) {
  if (percentile === null) return null;
  
  if (percentile >= 75) return { 
    label: `Top ${Math.round(100 - percentile)}%`, 
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
  };
  if (percentile >= 50) return { 
    label: 'Nad průměr', 
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
  };
  if (percentile >= 25) return { 
    label: 'Průměr', 
    className: 'bg-muted text-muted-foreground border-border' 
  };
  return { 
    label: 'Pod průměrem', 
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' 
  };
}

function ExerciseComparisonTab() {
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [exerciseType, setExerciseType] = useState<'strength' | 'cardio'>('strength');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [cardioMetric, setCardioMetric] = useState<'distance' | 'duration'>('distance');
  
  // Use the new hook with percentiles
  const { data: exercises, isLoading: exercisesLoading } = useExercisesWithPercentiles(trainerId);
  
  const { data: strengthLeaderboard, isLoading: strengthLoading } = useStrengthExerciseLeaderboard(
    exerciseType === 'strength' ? selectedExercise : null,
    trainerId,
    genderFilter
  );
  
  const { data: cardioLeaderboard, isLoading: cardioLoading } = useCardioExerciseLeaderboard(
    exerciseType === 'cardio' ? selectedExercise : null,
    trainerId,
    cardioMetric,
    genderFilter
  );
  
  const leaderboard = exerciseType === 'strength' ? strengthLeaderboard : cardioLeaderboard;
  const isLoading = exerciseType === 'strength' ? strengthLoading : cardioLoading;
  
  const currentExercises: ExerciseWithPercentile[] = exerciseType === 'strength' 
    ? exercises?.strength || [] 
    : exercises?.cardio || [];

  const getGenderLabel = (filter: GenderFilter) => {
    switch (filter) {
      case 'male': return 'Muži';
      case 'female': return 'Ženy';
      default: return 'Všichni';
    }
  };

  if (exercisesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Exercise type toggle */}
      <div className="flex gap-2">
        <Button
          variant={exerciseType === 'strength' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setExerciseType('strength'); setSelectedExercise(null); }}
          className="gap-2"
        >
          <Dumbbell className="w-4 h-4" />
          Síla
        </Button>
        <Button
          variant={exerciseType === 'cardio' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setExerciseType('cardio'); setSelectedExercise(null); }}
          className="gap-2"
        >
          <Heart className="w-4 h-4" />
          Kardio
        </Button>
      </div>

      {/* Exercise selection */}
      {!selectedExercise ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vyber cvik pro porovnání
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[400px] overflow-y-auto">
            {currentExercises.length === 0 ? (
              <EmptyState message="Zatím nejsou k dispozici žádné cviky pro porovnání" />
            ) : (
              currentExercises.map((ex) => {
                const badge = getPercentileBadge(ex.client_percentile);
                return (
                  <button
                    key={ex.exercise_name}
                    onClick={() => setSelectedExercise(ex.exercise_name)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {exerciseType === 'strength' ? (
                        <Dumbbell className="w-5 h-5 text-blue-500 shrink-0" />
                      ) : (
                        <Footprints className="w-5 h-5 text-green-500 shrink-0" />
                      )}
                      <span className="font-medium capitalize truncate">{ex.exercise_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {badge && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 border", badge.className)}>
                          {badge.label}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{ex.entry_count}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Back button and title */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedExercise(null)}
            >
              ← Zpět
            </Button>
            <h3 className="font-semibold capitalize">{selectedExercise}</h3>
          </div>

          {/* Gender filter */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Pohlaví</p>
            <GenderFilterToggle value={genderFilter} onChange={setGenderFilter} />
          </div>

          {/* Cardio metric toggle - only for cardio */}
          {exerciseType === 'cardio' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Metrika</p>
              <CardioMetricToggle value={cardioMetric} onChange={setCardioMetric} />
            </div>
          )}

          {/* Leaderboard */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !leaderboard ? (
            <EmptyState message={`Žádní účastníci v kategorii "${getGenderLabel(genderFilter)}"`} />
          ) : (
            <>
              {/* Active filter badge */}
              {genderFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {genderFilter === 'male' ? '👨' : '👩'} {getGenderLabel(genderFilter)}
                </Badge>
              )}

              {/* Your position */}
              {leaderboard.client_rank && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">#{leaderboard.client_rank}</span>
                      </div>
                      <div>
                        <p className="font-medium">Tvoje pozice</p>
                        <p className="text-sm text-muted-foreground">
                          z {leaderboard.total_participants} účastníků
                          {genderFilter !== 'all' && ` (${getGenderLabel(genderFilter).toLowerCase()})`}
                        </p>
                      </div>
                    </div>
                    {leaderboard.client_percentile != null && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          Top {Math.round(100 - leaderboard.client_percentile)}%
                        </p>
                      </div>
                    )}
                  </div>
                  {leaderboard.client_percentile != null && (
                    <Progress value={100 - leaderboard.client_percentile} className="mt-3" />
                  )}
                </motion.div>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {exerciseType === 'strength' ? (
                      <>
                        <Dumbbell className="w-4 h-4" />
                        Nejlepší výkony (max. váha)
                      </>
                    ) : (
                      <>
                        <Footprints className="w-4 h-4" />
                        Nejlepší výkony ({cardioMetric === 'distance' ? 'vzdálenost' : 'čas'})
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {leaderboard.leaderboard.map((entry) => (
                    <ExerciseLeaderboardRow 
                      key={entry.client_id} 
                      entry={entry} 
                      currentClientId={clientId ?? undefined}
                    />
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function ClientPortalLeaderboard() {
  const { clientId } = useClientPortal();
  const [activeTab, setActiveTab] = useState<'workouts_month' | 'workouts_alltime' | 'exercises'>('workouts_month');
  
  const { data: workoutsMonthData, isLoading: workoutsMonthLoading } = useLeaderboard('workouts_month');
  const { data: allTimeData, isLoading: allTimeLoading } = useLeaderboard('workouts_alltime');
  const { data: settings } = useLeaderboardSettings(clientId ?? undefined);
  
  const isLoading = activeTab === 'workouts_month' ? workoutsMonthLoading : 
                    activeTab === 'workouts_alltime' ? allTimeLoading : false;
  const data = activeTab === 'workouts_month' ? workoutsMonthData : 
               activeTab === 'workouts_alltime' ? allTimeData : null;
  
  // Find current user's rank
  const currentUserEntry = data?.find(e => e.client_id === clientId);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Žebříček</h1>
          <p className="text-sm text-muted-foreground">
            Porovnej se s ostatními
          </p>
        </div>
      </div>
      
      {/* User's position summary - only for workout tabs */}
      {activeTab !== 'exercises' && currentUserEntry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">#{currentUserEntry.rank}</span>
              </div>
              <div>
                <p className="font-medium">Tvoje pozice</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'workouts_month' 
                    ? `${currentUserEntry.workout_count} tréninků tento měsíc` 
                    : `${currentUserEntry.workout_count} tréninků celkem`
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Visibility info */}
      {(!settings || !settings.leaderboard_visible) && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              📛 Jsi anonymní. Pokud chceš zobrazit své jméno, změň to v nastavení.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="workouts_month" className="gap-1.5">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">Měsíc</span>
          </TabsTrigger>
          <TabsTrigger value="workouts_alltime" className="gap-1.5">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Celkem</span>
          </TabsTrigger>
          <TabsTrigger value="exercises" className="gap-1.5">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Cviky</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Workouts tabs */}
        <TabsContent value="workouts_month" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : data?.length === 0 ? (
            <EmptyState />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Tréninky tento měsíc
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {data?.map((entry) => (
                  <LeaderboardRow 
                    key={entry.client_id} 
                    entry={entry} 
                    currentClientId={clientId ?? undefined}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workouts_alltime" className="mt-4">
          {allTimeLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : allTimeData?.length === 0 ? (
            <EmptyState />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Celkový počet tréninků
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {allTimeData?.map((entry) => (
                  <LeaderboardRow 
                    key={entry.client_id} 
                    entry={entry} 
                    currentClientId={clientId ?? undefined}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Exercise comparison tab */}
        <TabsContent value="exercises" className="mt-4">
          <ExerciseComparisonTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
