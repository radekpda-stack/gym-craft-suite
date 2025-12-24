import { useState } from 'react';
import { Dumbbell, Plus, List, BarChart3 } from 'lucide-react';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ExerciseListView } from '@/components/exercises/ExerciseListView';
import { ExerciseAnalyticsView } from '@/components/exercises/ExerciseAnalyticsView';
import { ExerciseFormDialog } from '@/components/exercises/ExerciseFormDialog';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function Exercises() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('list');
  const [showCreateExercise, setShowCreateExercise] = useState(false);

  const { data: exercises = [], isLoading } = useExercisesWithUsage();

  return (
    <div className="container mx-auto py-6 space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">
                {language === 'cs' ? 'Knihovna cviků' : 'Exercise Library'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {language === 'cs' 
                  ? `${exercises.length} cviků v knihovně` 
                  : `${exercises.length} exercises in library`}
              </p>
            </div>
          </div>
          {activeTab === 'list' && (
            <Button onClick={() => setShowCreateExercise(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'cs' ? 'Nový cvik' : 'New exercise'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Segmented Control for Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
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

      {/* Floating Action Button for mobile - only on list tab */}
      {activeTab === 'list' && (
        <FloatingActionButton
          actions={[
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
