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

          <ExerciseSearchCommand />

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

          {/* Today's Activity Block */}
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Aktivita dnes</span>
                {!todayLoading && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {todayEntries.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-primary"
                onClick={() => setShowQuickLog(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Zapsat
              </Button>
            </div>

            {todayLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="flex flex-col items-center py-8 px-4 text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dnes ještě žádný zápis</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Začni zápisem prvního výkonu dnes</p>
                </div>
                <button
                  onClick={() => setShowQuickLog(true)}
                  className="text-xs font-semibold text-primary underline underline-offset-2"
                >
                  + Zapsat první výkon dnes
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                      {typeIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{entry.exercise_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{entry.client_name} · {entry.summary}</p>
                    </div>
                  </div>
                ))}
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
        onOpenChange={setShowQuickLog}
      />
    </div>
  );
}
