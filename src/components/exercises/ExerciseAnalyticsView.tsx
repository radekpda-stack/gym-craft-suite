import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StrengthAnalyticsView } from './analytics/StrengthAnalyticsView';
import { CardioAnalyticsView } from './analytics/CardioAnalyticsView';
import { SkillAnalyticsView } from './analytics/SkillAnalyticsView';
import { Dumbbell, Heart, Brain } from 'lucide-react';

type ExerciseTab = 'strength' | 'cardio' | 'skill';

export function ExerciseAnalyticsView() {
  const [activeTab, setActiveTab] = useState<ExerciseTab>('strength');

  return (
    <div className="space-y-4">
      {/* Sub-tabs for exercise types */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExerciseTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="strength" className="flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Síla</span>
          </TabsTrigger>
          <TabsTrigger value="cardio" className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            <span>Kardio</span>
          </TabsTrigger>
          <TabsTrigger value="skill" className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            <span>Skill</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strength" className="mt-4">
          <StrengthAnalyticsView />
        </TabsContent>

        <TabsContent value="cardio" className="mt-4">
          <CardioAnalyticsView />
        </TabsContent>

        <TabsContent value="skill" className="mt-4">
          <SkillAnalyticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
