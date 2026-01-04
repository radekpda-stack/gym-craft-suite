import { useState } from 'react';
import { Plus, List, BarChart3, Trophy } from 'lucide-react';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ExerciseListView } from '@/components/exercises/ExerciseListView';
import { ExerciseAnalyticsView } from '@/components/exercises/ExerciseAnalyticsView';
import { ExerciseFormDialog } from '@/components/exercises/ExerciseFormDialog';
import { QuickLogDialog } from '@/components/exercises/QuickLogDialog';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function ExercisesContent() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('list');
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);

  const { data: exercises = [], isLoading } = useExercisesWithUsage();

  // Count active (non-archived) exercises
  const activeExerciseCount = exercises.filter(e => !e.is_archived).length;

  return (
    <div className="space-y-6">
      {/* Sub-header with count */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {language === 'cs' 
            ? `${activeExerciseCount} aktivních cviků` 
            : `${activeExerciseCount} active exercises`}
        </p>
      </div>

      {/* Segmented Control for Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            <span>Seznam cviků</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytika</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <ExerciseListView exercises={exercises} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ExerciseAnalyticsView />
        </TabsContent>
      </Tabs>

      {/* Create Exercise Dialog */}
      <ExerciseFormDialog
        open={showCreateExercise}
        onOpenChange={setShowCreateExercise}
      />

      {/* Quick Log Dialog */}
      <QuickLogDialog
        open={showQuickLog}
        onOpenChange={setShowQuickLog}
      />

      {/* Floating Action Button with multiple actions */}
      {activeTab === 'list' && (
        <FloatingActionButton
          actions={[
            {
              id: 'quick-log',
              icon: <Trophy className="h-5 w-5" />,
              label: 'Zapsat výkon',
              onClick: () => setShowQuickLog(true),
            },
            {
              id: 'new-exercise',
              icon: <Plus className="h-5 w-5" />,
              label: 'Nový cvik',
              onClick: () => setShowCreateExercise(true),
              variant: 'primary',
            },
          ]}
        />
      )}
    </div>
  );
}
