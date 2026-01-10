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
        {/* Tab navigation - sticky */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="h-14 w-full bg-transparent gap-1 px-2">
            <TabsTrigger 
              value="schedule"
              className="flex-1 h-11 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-medium"
            >
              <CalendarCheck className="w-5 h-5" />
              <span>Rozvrh</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sale"
              className="flex-1 h-11 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-medium"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Prodej</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prs"
              className="flex-1 h-11 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-medium"
            >
              <Trophy className="w-5 h-5" />
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
