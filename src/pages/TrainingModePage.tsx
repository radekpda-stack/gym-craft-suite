import { useEffect, useState } from 'react';
import { CalendarCheck, ShoppingBag, Trophy, Plus, UserPlus, Package } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrainingModeLayout } from '@/components/training-mode/TrainingModeLayout';
import { TrainingModeSchedule } from '@/components/training-mode/TrainingModeSchedule';
import { QuickSalePanel } from '@/components/training-mode/QuickSalePanel';
import { QuickPRsLookup } from '@/components/training-mode/QuickPRsLookup';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { useTrainingMode } from '@/hooks/useTrainingMode';
import { useNavigate } from 'react-router-dom';

export default function TrainingModePage() {
  const { enterTrainingMode } = useTrainingMode();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('schedule');

  // Enter training mode when page loads
  useEffect(() => {
    enterTrainingMode();
  }, [enterTrainingMode]);

  // FAB actions based on current tab
  const fabActions = [
    {
      id: 'new-training',
      icon: <CalendarCheck className="w-5 h-5" />,
      label: 'Nový trénink',
      onClick: () => navigate('/calendar'),
    },
    {
      id: 'new-client',
      icon: <UserPlus className="w-5 h-5" />,
      label: 'Nový klient',
      onClick: () => navigate('/clients'),
    },
    {
      id: 'new-sale',
      icon: <Package className="w-5 h-5" />,
      label: 'Prodej',
      onClick: () => setActiveTab('sale'),
    },
  ];

  return (
    <TrainingModeLayout>
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex flex-col h-[calc(100vh-56px)]"
      >
        {/* Tab navigation - sticky with better mobile touch targets */}
        <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsList className="h-16 w-full bg-transparent gap-1 px-3">
            <TabsTrigger 
              value="schedule"
              className="flex-1 h-13 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-semibold min-h-[52px] active:scale-95 transition-transform"
            >
              <CalendarCheck className="w-5 h-5" />
              <span>Rozvrh</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sale"
              className="flex-1 h-13 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-semibold min-h-[52px] active:scale-95 transition-transform"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Prodej</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prs"
              className="flex-1 h-13 gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl text-sm font-semibold min-h-[52px] active:scale-95 transition-transform"
            >
              <Trophy className="w-5 h-5" />
              <span>PRs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab content */}
        <TabsContent value="schedule" className="flex-1 mt-0 overflow-hidden">
          <TrainingModeSchedule />
        </TabsContent>
        
        <TabsContent value="sale" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <QuickSalePanel />
        </TabsContent>

        <TabsContent value="prs" className="flex-1 mt-0 overflow-hidden flex flex-col">
          <QuickPRsLookup />
        </TabsContent>
      </Tabs>

      {/* Floating Action Button */}
      <FloatingActionButton 
        actions={fabActions} 
        className="bottom-6 right-4 safe-area-bottom"
      />
    </TrainingModeLayout>
  );
}
