import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Users, Activity, BarChart3, History, PlusCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExerciseStats } from '@/hooks/useExerciseStats';
import { useExercises } from '@/hooks/useExercises';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ExerciseClientToggle } from '@/components/exercises/ExerciseClientToggle';
import { ExerciseProgressChart } from '@/components/exercises/ExerciseProgressChart';
import { ExerciseHistoryTable } from '@/components/exercises/ExerciseHistoryTable';
import { ExerciseClientComparison } from '@/components/exercises/ExerciseClientComparison';
import { ExerciseDetailOverview } from '@/components/exercises/ExerciseDetailOverview';
import { QuickLogDialog } from '@/components/exercises/QuickLogDialog';
import { usePageTracking } from '@/hooks/useFeatureTracking';

// Quick time formatter for stats bar
function formatQuickTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
export default function ExerciseDetail() {
  usePageTracking('exercise_detail');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { exercises, isLoading: exercisesLoading } = useExercises();
  const { data: stats, isLoading: statsLoading } = useExerciseStats(id || null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const exercise = exercises.find((e) => e.id === id);
  
  // Determine exercise type - use is_time_based as primary indicator, then category
  const exerciseType: 'strength' | 'cardio' | 'mixed' = (() => {
    if (!exercise) return 'strength';
    // Explicit is_time_based flag takes priority
    if ((exercise as any).is_time_based) return 'cardio';
    // Category-based detection
    const category = exercise.category?.toLowerCase() || '';
    if (category.includes('kardio') || category.includes('cardio') || 
        category.includes('veslo') || category.includes('rower') ||
        category.includes('skierg') || category.includes('skillup') ||
        category.includes('běh') || category.includes('run') ||
        category.includes('conditioning')) {
      return 'cardio';
    }
    return 'strength';
  })();
  
  // Use stats.isTimeBased for UI decisions (more accurate)
  const isTimeBased = stats?.isTimeBased || exerciseType === 'cardio';

  // Show loading state while exercises are being fetched
  if (exercisesLoading) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate('/exercises')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na cviky
        </Button>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="container mx-auto py-6">
        <Button variant="ghost" onClick={() => navigate('/exercises')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zpět na cviky
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          <p>Cvik nenalezen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/exercises')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{exercise.name_cs || exercise.name}</h1>
              <p className="text-muted-foreground text-sm">{exercise.category}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setQuickLogOpen(true)} size="sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Přidat záznam
        </Button>
      </div>

      {/* Sticky Client Toggle */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b">
        <ExerciseClientToggle value={selectedClientId} onChange={setSelectedClientId} />
      </div>

      {/* Quick Stats Bar - dynamic based on exercise type */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card className="p-3">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs">Klienti</span>
          </div>
          <p className="text-lg font-bold">{stats?.totalClients || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-xs">Záznamy</span>
          </div>
          <p className="text-lg font-bold">{stats?.totalEntries || 0}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            {isTimeBased ? (
              <>
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="text-xs">Nejlepší čas</span>
              </>
            ) : (
              <>
                <Dumbbell className="w-3.5 h-3.5" />
                <span className="text-xs">Max</span>
              </>
            )}
          </div>
          <p className="text-lg font-bold">
            {isTimeBased 
              ? (stats?.bestTime ? formatQuickTime(stats.bestTime) : '-')
              : (stats?.globalMaxWeight ? `${stats.globalMaxWeight} kg` : '-')
            }
          </p>
        </Card>
      </div>

      {/* Tabs - Reduced from 5 to 4 (merged PR into Overview) */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grafy</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Historie</span>
          </TabsTrigger>
          <TabsTrigger value="clients">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Now includes PR highlight */}
        <TabsContent value="overview" className="space-y-4">
          <ExerciseDetailOverview
            exercise={exercise}
            stats={stats}
            exerciseType={exerciseType}
            selectedClientId={selectedClientId}
            onQuickLog={() => setQuickLogOpen(true)}
          />
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <ExerciseProgressChart 
            exerciseId={id!} 
            exerciseType={exerciseType} 
            clientId={selectedClientId} 
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <ExerciseHistoryTable 
            exerciseId={id!} 
            exerciseType={exerciseType} 
            clientId={selectedClientId} 
          />
        </TabsContent>

        {/* Client Comparison / Leaderboard Tab */}
        <TabsContent value="clients" className="space-y-4">
          {selectedClientId ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Pro porovnání klientů přepněte na "Všichni klienti".
              </CardContent>
            </Card>
          ) : (
            <ExerciseClientComparison exerciseId={id!} exerciseType={exerciseType} />
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Log Dialog */}
      <QuickLogDialog 
        open={quickLogOpen} 
        onOpenChange={setQuickLogOpen}
        exerciseId={id}
      />
    </div>
  );
}
