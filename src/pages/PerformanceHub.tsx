import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, Dumbbell, ClipboardCheck, Trophy, Plus, List, BarChart3, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useModuleSettings } from '@/hooks/useModuleSettings';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';

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

  // Data hooks
  const { data: overview, isLoading: overviewLoading } = usePerformanceOverview();
  const { data: exercises = [], isLoading: exercisesLoading } = useExercisesWithUsage();

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
      onClick: () => navigate('/performance?tab=library'),
      variant: 'success',
    },
  ];

  // Core tabs: overview, clients, library, analytics + optional tests, challenges
  // Tabs ready

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-32">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card/80 to-card/60 backdrop-blur-md border border-border/50 shadow-lg p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/20 backdrop-blur-sm shadow-lg shadow-primary/30 ring-1 ring-primary/30">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Výkonnost</h1>
              <p className="text-sm text-muted-foreground">
                Sleduj pokrok svých klientů
              </p>
            </div>
          </div>

          <ExerciseSearchCommand />
        </div>
      </div>

      {/* KPI Bar */}
      <PerformanceKPIBar
        totalExercises={overview?.totalExercises || 0}
        totalEntriesThisMonth={overview?.totalEntries || 0}
        totalPRsThisMonth={overview?.totalPRs || 0}
        isLoading={overviewLoading}
      />

      {/* Tabs - reduced to 4 core + optional */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex w-full max-w-3xl mx-auto bg-secondary/30 backdrop-blur-sm p-1 overflow-x-auto">
          <TabsTrigger value="overview" className="gap-1.5 flex-1 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Zap className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 flex-1 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Klienti</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5 flex-1 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <List className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Knihovna</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 flex-1 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Analytika</span>
          </TabsTrigger>
          {testsEnabled && (
            <TabsTrigger value="tests" className="gap-1.5 flex-1 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span className="text-xs truncate">Testy</span>
            </TabsTrigger>
          )}
          {challengesEnabled && (
            <TabsTrigger value="challenges" className="gap-1.5 flex-1 min-w-0 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Trophy className="w-4 h-4 shrink-0" />
              <span className="text-xs truncate">Výzvy</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab - includes PR History */}
        <TabsContent value="overview" className="mt-6 space-y-6">
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

        {/* Clients Tab - merged with Comparison */}
        <TabsContent value="clients" className="mt-6">
          <ClientProgressView />
        </TabsContent>

        {/* Library Tab */}
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
            <ExerciseListView exercises={exercises} isLoading={exercisesLoading} />
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
    </div>
  );
}
