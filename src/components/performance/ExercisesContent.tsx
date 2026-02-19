import { useState } from 'react';
import { List, BarChart3, User } from 'lucide-react';
import { useExercisesWithUsage } from '@/hooks/useExerciseStats';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ExerciseListView } from '@/components/exercises/ExerciseListView';
import { ExerciseAnalyticsView } from '@/components/exercises/ExerciseAnalyticsView';
import { ClientExercisesView } from '@/components/exercises/ClientExercisesView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function ExercisesContent() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('list');

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
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="list" className="gap-1.5">
            <List className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Seznam</span>
          </TabsTrigger>
          <TabsTrigger value="client" className="gap-1.5">
            <User className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Klient</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="text-xs truncate">Analytika</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <ExerciseListView exercises={exercises} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="client" className="mt-6">
          <ClientExercisesView />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ExerciseAnalyticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
