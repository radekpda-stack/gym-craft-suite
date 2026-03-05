import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, Dumbbell, ClipboardCheck, Trophy, Plus, BarChart3, BookOpen, Heart, CalendarCheck } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabs } from '@/components/ui/pill-tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExerciseListView } from '@/components/exercises/ExerciseListView';
import { ExerciseAnalyticsView } from '@/components/exercises/ExerciseAnalyticsView';
import { TestsContent } from '@/components/performance/TestsContent';
import { ChallengesContent } from '@/components/performance/ChallengesContent';
import { RecentPRsCompact } from '@/components/performance/RecentPRsCompact';
import { PerformanceQuickStats } from '@/components/performance/PerformanceQuickStats';
import { UniversalSearchCommand } from '@/components/performance/UniversalSearchCommand';
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
  
  const rawTab = searchParams.get('tab');
  const resolvedTab = rawTab === 'comparison' ? 'clients' : rawTab === 'pr-history' ? 'overview' : rawTab;
  const initialTab = (resolvedTab as PerformanceTab) || 'overview';
  const [activeTab, setActiveTab] = useState<PerformanceTab>(initialTab);
  
  const [showNewExerciseDialog, setShowNewExerciseDialog] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogExerciseId, setQuickLogExerciseId] = useState<string | undefined>();

  const [quickLogClientId, setQuickLogClientId] = useState<string | undefined>();

  const handleQuickLogFromSearch = (exerciseId: string, _exerciseName: string, clientId?: string) => {
    setQuickLogExerciseId(exerciseId || undefined);
    setQuickLogClientId(clientId || undefined);
    setShowQuickLog(true);
  };

  const handleSelectClientFromSearch = (clientId: string) => {
    setActiveTab('clients');
    setSearchParams({ tab: 'clients', client: clientId });
  };

  const { data: overview, isLoading: overviewLoading } = usePerformanceOverview();
  const { data: exercises = [], isLoading: exercisesLoading } = useExercisesWithUsage();
  const { data: todayEntries = [], isLoading: todayLoading } = useTodayActivity();

  const handleTabChange = (value: string) => {
    setActiveTab(value as PerformanceTab);
    setSearchParams({ tab: value });
  };

  const testsEnabled = isModuleEnabled('tests');
  const challengesEnabled = isModuleEnabled('challenges');

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

  // Build tab list for PillTabs
  const tabs = [
    { value: 'overview', label: 'Přehled' },
    { value: 'clients', label: 'Deník' },
    { value: 'library', label: 'Cviky' },
    { value: 'analytics', label: 'Analytika' },
    ...(testsEnabled ? [{ value: 'tests', label: 'Testy' }] : []),
    ...(challengesEnabled ? [{ value: 'challenges', label: 'Výzvy' }] : []),
  ];

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Compact Hero Header – single row */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/15 shadow-sm ring-1 ring-primary/20">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-tight">Výkonnost</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground capitalize">{todayDateStr}</p>
        </div>
      </div>

      {/* Search + recent exercises chips */}
      <div className="space-y-2">
        <UniversalSearchCommand onQuickLog={handleQuickLogFromSearch} onSelectClient={handleSelectClientFromSearch} />
        <RecentExercisesChips
          recentExercises={overview?.recentExercises || []}
          isLoading={overviewLoading}
          onQuickLog={(exerciseId) => {
            setQuickLogExerciseId(exerciseId);
            setShowQuickLog(true);
          }}
        />
      </div>

      {/* Scrollable pill tabs */}
      <div className="overflow-x-auto -mx-3 px-3 scrollbar-hide">
        <PillTabs
          tabs={tabs}
          value={activeTab}
          onChange={handleTabChange}
          size="sm"
          className="w-max min-w-full"
        />
      </div>

      {/* Tab content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-0 space-y-4">
          {/* Unified Quick Stats */}
          <PerformanceQuickStats
            categories={overview?.categories || { strength: { count: 0, entries: 0 }, cardio: { count: 0, entries: 0 }, plyometric: { count: 0, entries: 0 } }}
            totalEntries={overview?.totalEntries || 0}
            totalPRs={overview?.totalPRs || 0}
            isLoading={overviewLoading}
            onCategoryClick={(category) => {
              setActiveTab('library');
              setSearchParams({ tab: 'library', category });
            }}
          />

          {/* Today's Activity – max 3 entries */}
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Aktivita dnes</span>
                {!todayLoading && todayEntries.length > 0 && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    {todayEntries.length}
                  </span>
                )}
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
              <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : todayEntries.length === 0 ? (
              <div className="flex flex-col items-center py-8 px-4 text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Dnes ještě žádný zápis</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">Začni zápisem prvního výkonu</p>
                </div>
                <button
                  onClick={() => setShowQuickLog(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary-foreground bg-primary px-4 py-2 rounded-lg hover:brightness-110 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Zapsat výkon
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {todayEntries.slice(0, 3).map((entry) => {
                  const iconBg = entry.type === 'cardio' ? 'bg-success/10' : entry.type === 'skill' ? 'bg-warning/10' : 'bg-primary/10';
                  const timeStr = new Date(entry.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
                        {typeIcon(entry.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{entry.exercise_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {entry.client_name} · {entry.summary}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">{timeStr}</span>
                    </div>
                  );
                })}
                {todayEntries.length > 3 && (
                  <button
                    onClick={() => handleTabChange('clients')}
                    className="w-full py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                  >
                    Zobrazit všech {todayEntries.length} záznamů →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <ClientProgressLeaderboard
            topClients={overview?.topClients || []}
            isLoading={overviewLoading}
          />

          {/* Recent PRs */}
          <RecentPRsCompact />
        </TabsContent>

        {/* Deník Tab */}
        <TabsContent value="clients" className="mt-0">
          <ClientProgressView />
        </TabsContent>

        {/* Cviky Tab */}
        <TabsContent value="library" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {exercises.filter(e => !e.is_archived).length} aktivních cviků
              </p>
              <Button size="sm" onClick={() => setShowNewExerciseDialog(true)} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Nový cvik
              </Button>
            </div>
            <ExerciseListView exercises={exercises} isLoading={exercisesLoading} onQuickLog={() => setShowQuickLog(true)} />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-0">
          <ExerciseAnalyticsView />
        </TabsContent>

        {testsEnabled && (
          <TabsContent value="tests" className="mt-0">
            <TestsContent />
          </TabsContent>
        )}

        {challengesEnabled && (
          <TabsContent value="challenges" className="mt-0">
            <ChallengesContent />
          </TabsContent>
        )}
      </Tabs>

      <FloatingActionButton actions={fabActions} />

      <ExerciseFormDialog open={showNewExerciseDialog} onOpenChange={setShowNewExerciseDialog} />

      <QuickLogDialog
        open={showQuickLog}
        onOpenChange={(open) => { setShowQuickLog(open); if (!open) { setQuickLogExerciseId(undefined); setQuickLogClientId(undefined); } }}
        exerciseId={quickLogExerciseId}
        clientId={quickLogClientId}
      />
    </div>
  );
}
