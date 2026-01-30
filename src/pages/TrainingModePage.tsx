import { useEffect, useState } from 'react';
import { CalendarCheck, Users, Package, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrainingModeLayout } from '@/components/training-mode/TrainingModeLayout';
import { TrainingModeSchedule } from '@/components/training-mode/TrainingModeSchedule';
import { ClientsTab } from '@/components/training-mode/ClientsTab';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { useTrainingModePrefetch } from '@/hooks/useTrainingModePrefetch';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { QuickSalePanel } from '@/components/training-mode/QuickSalePanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function TrainingModePage() {
  const { enterTrainingMode } = useTrainingMode();
  const { isPrefetching, isComplete, prefetch, stats, error } = useTrainingModePrefetch();
  const [activeTab, setActiveTab] = useState('schedule');
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  const [showSaleSheet, setShowSaleSheet] = useState(false);

  // Enter training mode and prefetch data when page loads
  useEffect(() => {
    enterTrainingMode();
    prefetch();
  }, [enterTrainingMode, prefetch]);

  // FAB actions - simplified for training workflow
  const fabActions = [
    {
      id: 'new-sale',
      icon: <Package className="w-5 h-5" />,
      label: 'Prodej',
      onClick: () => setShowSaleSheet(true),
    },
    {
      id: 'new-training',
      icon: <CalendarCheck className="w-5 h-5" />,
      label: 'Nový trénink',
      onClick: () => setShowTrainingDialog(true),
    },
  ];

  // Show loading state during prefetch
  if (isPrefetching && !isComplete) {
    return (
      <TrainingModeLayout>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="font-semibold text-lg mb-1">Připravuji offline data</h2>
            <p className="text-sm text-muted-foreground">
              Načítám rozvrh, klienty a cviky...
            </p>
          </div>
        </div>
      </TrainingModeLayout>
    );
  }

  return (
    <TrainingModeLayout>
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        {/* Tab navigation - 2 tabs instead of 3 */}
        <div className="shrink-0 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="h-16 w-full bg-transparent gap-1 px-3">
            <TabsTrigger 
              value="schedule"
              className="flex-1 h-13 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-semibold min-h-[52px] active:scale-95 transition-transform"
            >
              <CalendarCheck className="w-5 h-5" />
              <span>Rozvrh</span>
            </TabsTrigger>
            <TabsTrigger 
              value="clients"
              className="flex-1 h-13 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-semibold min-h-[52px] active:scale-95 transition-transform"
            >
              <Users className="w-5 h-5" />
              <span>Klienti</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <TabsContent value="schedule" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <TrainingModeSchedule />
        </TabsContent>
        
        <TabsContent value="clients" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col">
          <ClientsTab />
        </TabsContent>
      </Tabs>

      {/* Floating Action Button */}
      <FloatingActionButton 
        actions={fabActions} 
        className="bottom-6 right-4 safe-area-bottom"
      />

      {/* Dialog pro nový trénink */}
      <CreateTrainingDialog
        open={showTrainingDialog}
        onOpenChange={setShowTrainingDialog}
      />

      {/* Sheet pro rychlý prodej */}
      <Sheet open={showSaleSheet} onOpenChange={setShowSaleSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Rychlý prodej
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-4rem)]">
            <QuickSalePanel />
          </div>
        </SheetContent>
      </Sheet>
    </TrainingModeLayout>
  );
}
