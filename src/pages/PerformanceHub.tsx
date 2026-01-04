import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, Dumbbell, ClipboardCheck, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExercisesContent } from '@/components/performance/ExercisesContent';
import { TestsContent } from '@/components/performance/TestsContent';
import { ChallengesContent } from '@/components/performance/ChallengesContent';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useModuleSettings } from '@/hooks/useModuleSettings';

type PerformanceTab = 'exercises' | 'tests' | 'challenges';

export default function PerformanceHub() {
  usePageTracking('performance');
  const [searchParams, setSearchParams] = useSearchParams();
  const { isModuleEnabled } = useModuleSettings();
  
  // Get initial tab from URL or default to 'exercises'
  const initialTab = (searchParams.get('tab') as PerformanceTab) || 'exercises';
  const [activeTab, setActiveTab] = useState<PerformanceTab>(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as PerformanceTab);
    setSearchParams({ tab: value });
  };

  // Check which modules are enabled
  const testsEnabled = isModuleEnabled('tests');
  const challengesEnabled = isModuleEnabled('challenges');

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-32">
      {/* Header */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-lg mx-auto" style={{ gridTemplateColumns: `repeat(${1 + (testsEnabled ? 1 : 0) + (challengesEnabled ? 1 : 0)}, 1fr)` }}>
          <TabsTrigger value="exercises" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">Cviky</span>
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

        <TabsContent value="exercises" className="mt-6">
          <ExercisesContent isActive={activeTab === 'exercises'} />
        </TabsContent>

        {testsEnabled && (
          <TabsContent value="tests" className="mt-6">
            <TestsContent />
          </TabsContent>
        )}

        {challengesEnabled && (
          <TabsContent value="challenges" className="mt-6">
            <ChallengesContent />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
