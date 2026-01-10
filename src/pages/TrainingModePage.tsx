import { useEffect } from 'react';
import { CalendarCheck, ShoppingBag, Trophy } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrainingModeLayout } from '@/components/training-mode/TrainingModeLayout';
import { TrainingModeSchedule } from '@/components/training-mode/TrainingModeSchedule';
import { QuickSalePanel } from '@/components/training-mode/QuickSalePanel';
import { QuickPRsLookup } from '@/components/training-mode/QuickPRsLookup';
import { useTrainingMode } from '@/hooks/useTrainingMode';

export default function TrainingModePage() {
  const { enterTrainingMode } = useTrainingMode();

  // Enter training mode when page loads
  useEffect(() => {
    enterTrainingMode();
  }, [enterTrainingMode]);

  return (
    <TrainingModeLayout>
      <Tabs defaultValue="schedule" className="flex flex-col h-[calc(100vh-56px)]">
        {/* Tab navigation */}
        <div className="border-b border-border/50 px-4">
          <TabsList className="h-12 w-full bg-transparent gap-4">
            <TabsTrigger 
              value="schedule"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Rozvrh</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sale"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Prodej</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prs"
              className="flex-1 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
            >
              <Trophy className="w-4 h-4" />
              <span>PRs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <TabsContent value="schedule" className="flex-1 mt-0 overflow-y-auto">
          <TrainingModeSchedule />
        </TabsContent>
        
        <TabsContent value="sale" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <QuickSalePanel />
        </TabsContent>

        <TabsContent value="prs" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <QuickPRsLookup />
        </TabsContent>
      </Tabs>
    </TrainingModeLayout>
  );
}
