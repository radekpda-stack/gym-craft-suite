import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, Dumbbell, ClipboardCheck, Trophy, Plus, BarChart3, BookOpen, Heart, CalendarCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseListView } from '@/components/exercises/ExerciseListView';
import { ExerciseAnalyticsView } from '@/components/exercises/ExerciseAnalyticsView';
import { TestsContent } from '@/components/performance/TestsContent';
import { ChallengesContent } from '@/components/performance/ChallengesContent';
import { RecentPRsCompact } from '@/components/performance/RecentPRsCompact';
import { PerformanceKPIBar } from '@/components/performance/PerformanceKPIBar';
import { ExerciseSearchCommand } from '@/components/performance/ExerciseSearchCommand';
import { CategoryCards } from '@/components/performance/CategoryCards';
import { ClientProgressLeaderboard } from '@/components/performance/ClientProgressLeaderboard';
import { RecentExercisesChips } from '@/components/performance/RecentExercisesChips';
import { ClientProgressView } from '@/components/performance/ClientProgressView';
import { FloatingActionButton, FABAction } from '@/components/ui/floating-action-button';
import { ExerciseFormDialog } from '@/components/exercises/ExerciseFormDialog';
import { QuickLogDialog } from '@/components/exercises/QuickLogDialog';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useModuleSettings } from '@/hooks/useModuleSettings';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useTodayActivity } from '@/hooks/useTodayActivity';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type PerformanceTab = 'overview' | 'clients' | 'library' | 'analytics' | 'tests' | 'challenges';

export default function PerformanceHub() {
  usePageTracking('performance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isModuleEnabled } = useModuleSettings();
  
  // Support legacy tab names via redirect
  const rawTab = searchParams.get('tab');
  const resolvedTab = rawTab === 'comparison' ? 'clients' : rawTab === 'pr-history' ? 'overview' : rawTab;
  const initialTab = (resolvedTab as PerformanceTab) || 'overview';
  const [activeTab, setActiveTab] = useState<PerformanceTab>(initialTab);
  
  // Dialogs
  const [showNewExerciseDialog, setShowNewExerciseDialog] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogExerciseId, setQuickLogExerciseId] = useState<string | undefined>();

  const handleQuickLogFromSearch = (exerciseId: string, _exerciseName: string) => {
    setQuickLogExerciseId(exerciseId);
    setShowQuickLog(true);
  };

  // Data hooks
  const { data: overview, isLoading: overviewLoading } = usePerformanceOverview();
  const { data: exercises = [], isLoading: exercisesLoading } = useExercisesWithUsage();
  const { data: todayEntries = [], isLoading: todayLoading } = useTodayActivity();

  const handleTabChange = (value: string) => {
    setActiveTab(value as PerformanceTab);
    setSearchParams({ tab: value });
  };

  // Check which modules are enabled
  const testsEnabled = isModuleEnabled('tests');
  const challengesEnabled = isModuleEnabled('challenges');

  // FAB actions
  const fabActions: FABAction[] = [
    {
      id: 'new-exercise',
      icon: <Dumbbell className="w-5 h-5" />,
      label: 'Nový cvik',
      onClick: () => setShowNewExerciseDialog(true),
      variant: 'primary',
    },
    {
      id: 'log-entry',
      icon: <Plus className="w-5 h-5" />,
      label: 'Zapsat výkon',
      onClick: () => setShowQuickLog(true),
      variant: 'success',
    },
  ];

  const todayDateStr = format(new Date(), "EEEE, d. MMMM", { locale: cs });

  const typeIcon = (type: string) => {
    if (type === 'cardio') return <Heart className="w-3.5 h-3.5 text-success" />;
    if (type === 'skill') return <Zap className="w-3.5 h-3.5 text-warning" />;
    return <Dumbbell className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-32">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card/80 to-card/60 backdrop-blur-md border border-border/50 shadow-lg p-4 sm:p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="relative space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/20 backdrop-blur-sm shadow-lg shadow-primary/30 ring-1 ring-primary/30">
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Výkonnost</h1>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize">{todayDateStr}</p>
              </div>
            </div>
          </div>

          <ExerciseSearchCommand onQuickLog={handleQuickLogFromSearch} />

          {/* Prominent Quick Log CTA */}
          <button
            onClick={() => setShowQuickLog(true)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl",
              "bg-primary text-primary-foreground",
              "shadow-glow-cyan hover:shadow-glow-cyan-lg hover:brightness-110",
              "transition-all duration-200 border border-primary/30"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm leading-none">Zapsat výkon klientovi</p>
                <p className="text-xs opacity-75 mt-0.5">Rychlý zápis síla · kardio · skill</p>
              </div>
            </div>
            <CalendarCheck className="w-5 h-5 opacity-80 shrink-0" />
          </button>
        </div>
      </div>

      {/* KPI Bar */}
      <PerformanceKPIBar
        totalExercises={overview?.totalExercises || 0}
        totalEntriesThisMonth={overview?.totalEntries || 0}
        totalPRsThisMonth={overview?.totalPRs || 0}
        isLoading={overviewLoading}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex w-full max-w-3xl mx-auto bg-secondary/30 backdrop-blur-sm p-1 overflow-x-auto gap-0.5">
          <TabsTrigger value="overview" className="gap-1 flex-1 min-w-0 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-3">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1 flex-1 min-w-0 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-3">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Deník</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1 flex-1 min-w-0 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-3">
            <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Cviky</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1 flex-1 min-w-0 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-3">
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Analytika</span>
          </TabsTrigger>
          {testsEnabled && (
            <TabsTrigger value="tests" className="gap-1 flex-1 min-w-0 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-3">
              <ClipboardCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline truncate">Testy</span>
            </TabsTrigger>
          )}
          {challengesEnabled && (
            <TabsTrigger value="challenges" className="gap-1 flex-1 min-w-0 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-2 sm:px-3">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline truncate">Výzvy</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">

          {/* Today's Activity Block – rich journal feed */}
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-sm">Aktivita dnes</span>
                  {!todayLoading && todayEntries.length > 0 && (
                    <span className="ml-2 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                      {todayEntries.length} záznamů
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setShowQuickLog(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Zapsat
              </Button>
            </div>

            {todayLoading ? (
              <div className="p-4 space-y-2.5">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="flex flex-col items-center py-10 px-4 text-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Dumbbell className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Dnes ještě žádný zápis</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Začni zápisem prvního výkonu dnes</p>
                </div>
                <button
                  onClick={() => setShowQuickLog(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary-foreground bg-primary px-4 py-2 rounded-lg hover:brightness-110 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Zapsat první výkon dnes
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {todayEntries.map((entry) => {
                  const isStrength = entry.type === 'strength';
                  const isCardio = entry.type === 'cardio';
                  const iconBg = isCardio ? 'bg-success/10' : entry.type === 'skill' ? 'bg-warning/10' : 'bg-primary/10';
                  const timeStr = new Date(entry.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                      {/* Type icon */}
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
                        {typeIcon(entry.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold truncate leading-tight">{entry.exercise_name}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-foreground/70">{entry.client_name}</span>
                          <span className="text-[11px] text-muted-foreground/50">·</span>
                          <span className="text-[11px] text-muted-foreground">{entry.summary}</span>
                        </div>
                      </div>

                      {/* Time */}
                      <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-1">{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <CategoryCards
            categories={overview?.categories || { strength: { count: 0, entries: 0 }, cardio: { count: 0, entries: 0 }, plyometric: { count: 0, entries: 0 } }}
            isLoading={overviewLoading}
            onCategoryClick={(category) => {
              setActiveTab('library');
              setSearchParams({ tab: 'library', category });
            }}
          />

          <ClientProgressLeaderboard
            topClients={overview?.topClients || []}
            isLoading={overviewLoading}
          />

          <RecentExercisesChips
            recentExercises={overview?.recentExercises || []}
            isLoading={overviewLoading}
            onQuickLog={(exerciseId, exerciseName) => {
              setQuickLogExerciseId(exerciseId);
              setShowQuickLog(true);
            }}
          />

          {/* Recent PRs - compact */}
          <RecentPRsCompact />
        </TabsContent>

        {/* Deník Tab (dříve Klienti) */}
        <TabsContent value="clients" className="mt-6">
          <ClientProgressView />
        </TabsContent>

        {/* Cviky Tab (dříve Knihovna) */}
        <TabsContent value="library" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {exercises.filter(e => !e.is_archived).length} aktivních cviků
              </p>
              <Button
                size="sm"
                onClick={() => setShowNewExerciseDialog(true)}
                className="gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Nový cvik
              </Button>
            </div>
            <ExerciseListView
              exercises={exercises}
              isLoading={exercisesLoading}
              onQuickLog={() => setShowQuickLog(true)}
            />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <ExerciseAnalyticsView />
        </TabsContent>

        {/* Tests Tab */}
        {testsEnabled && (
          <TabsContent value="tests" className="mt-6">
            <TestsContent />
          </TabsContent>
        )}

        {/* Challenges Tab */}
        {challengesEnabled && (
          <TabsContent value="challenges" className="mt-6">
            <ChallengesContent />
          </TabsContent>
        )}
      </Tabs>

      <FloatingActionButton actions={fabActions} />

      <ExerciseFormDialog
        open={showNewExerciseDialog}
        onOpenChange={setShowNewExerciseDialog}
      />

      <QuickLogDialog
        open={showQuickLog}
        onOpenChange={(open) => { setShowQuickLog(open); if (!open) setQuickLogExerciseId(undefined); }}
        exerciseId={quickLogExerciseId}
      />
    </div>
  );
}
