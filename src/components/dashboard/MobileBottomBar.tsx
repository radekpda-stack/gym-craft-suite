import { useState } from 'react';
import { Plus, Search, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

export function MobileBottomBar() {
  const { trackFeature } = useFeatureTracking();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const handleCreateTraining = async (formData: any) => {
    try {
      await createTraining.mutateAsync(formData);
      setShowTrainingSheet(false);
      trackFeature('create_training', 'trainings');
    } catch (error) {
      console.error('Error creating training:', error);
    }
  };

  return (
    <>
      {/* Fixed bottom bar - mobile only */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-around gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTrainingSheet(true)}
            className="flex-1 flex flex-col items-center gap-0.5 h-auto py-2"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[10px] font-medium">Trénink</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="flex-1 flex flex-col items-center gap-0.5 h-auto py-2"
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Hledat</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="flex-1 flex flex-col items-center gap-0.5 h-auto py-2"
          >
            <Link to="/statistics">
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Statistiky</span>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Spacer to prevent content from being hidden behind the bar */}
      <div className="sm:hidden h-16" />
      
      {/* Dialogs */}
      <CreateTrainingSheet
        open={showTrainingSheet}
        onOpenChange={setShowTrainingSheet}
        onSubmit={handleCreateTraining}
        clients={clients}
        isLoading={createTraining.isPending}
      />
      
      <CommandPalette 
        open={showSearch} 
        onOpenChange={setShowSearch} 
      />
    </>
  );
}
