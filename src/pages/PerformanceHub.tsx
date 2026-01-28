import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Zap, Dumbbell, ClipboardCheck, Trophy, Plus, List, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExerciseListView } from '@/components/exercises/ExerciseListView';
import { ExerciseAnalyticsView } from '@/components/exercises/ExerciseAnalyticsView';
import { TestsContent } from '@/components/performance/TestsContent';
import { ChallengesContent } from '@/components/performance/ChallengesContent';
import { PerformanceKPIBar } from '@/components/performance/PerformanceKPIBar';
import { ExerciseSearchCommand } from '@/components/performance/ExerciseSearchCommand';
import { CategoryCards } from '@/components/performance/CategoryCards';
import { ClientProgressLeaderboard } from '@/components/performance/ClientProgressLeaderboard';
import { RecentExercisesChips } from '@/components/performance/RecentExercisesChips';
import { FloatingActionButton, FABAction } from '@/components/ui/floating-action-button';
import { ExerciseFormDialog } from '@/components/exercises/ExerciseFormDialog';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useModuleSettings } from '@/hooks/useModuleSettings';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';

type PerformanceTab = 'overview' | 'library' | 'analytics' | 'tests' | 'challenges';

export default function PerformanceHub() {
  usePageTracking('performance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isModuleEnabled } = useModuleSettings();
  
  // Get initial tab from URL or default to 'overview'
  const initialTab = (searchParams.get('tab') as PerformanceTab) || 'overview';
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

  // Calculate tab count for dynamic grid
  const tabCount = 2 + (testsEnabled ? 1 : 0) + (challengesEnabled ? 1 : 0); // overview, library, (analytics is nested), tests?, challenges?

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Výkonnost</h1>
            <p className="text-sm text-muted-foreground">
              Cviky, testy a výzvy na jednom místě
            </p>
          </div>
        </div>
      </div>

      {/* Quick Search */}
      <ExerciseSearchCommand />

      {/* KPI Bar */}
      <PerformanceKPIBar
        totalExercises={overview?.totalExercises || 0}
        totalEntriesThisMonth={overview?.totalEntriesThisMonth || 0}
        totalPRsThisMonth={overview?.totalPRsThisMonth || 0}
        isLoading={overviewLoading}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-2xl mx-auto" style={{ gridTemplateColumns: `repeat(${tabCount + 1}, 1fr)` }}>
          <TabsTrigger value="overview" className="gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Knihovna</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytika</span>
          </TabsTrigger>
          {testsEnabled && (
            <TabsTrigger value="tests" className="gap-2">
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Testy</span>
            </TabsTrigger>
          )}
          {challengesEnabled && (
            <TabsTrigger value="challenges" className="gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Výzvy</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Overview Tab - Dashboard View */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Category Cards */}
          <CategoryCards
            categories={overview?.categories || { strength: { count: 0, entries: 0 }, cardio: { count: 0, entries: 0 }, plyometric: { count: 0, entries: 0 } }}
            isLoading={overviewLoading}
            onCategoryClick={(category) => {
              setActiveTab('library');
              setSearchParams({ tab: 'library', category });
            }}
          />

          {/* Client Progress Leaderboard */}
          <ClientProgressLeaderboard
            topClients={overview?.topClients || []}
            isLoading={overviewLoading}
          />

          {/* Recent Exercises */}
          <RecentExercisesChips
            recentExercises={overview?.recentExercises || []}
            isLoading={overviewLoading}
          />
        </TabsContent>

        {/* Library Tab - Exercise List */}
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

      {/* Floating Action Button */}
      <FloatingActionButton actions={fabActions} />

      {/* New Exercise Dialog */}
      <ExerciseFormDialog
        open={showNewExerciseDialog}
        onOpenChange={setShowNewExerciseDialog}
      />
    </div>
  );
}
