import { useState } from 'react';
import { Plus, Search, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { useToast } from '@/hooks/use-toast';

export function MobileBottomBar() {
  const { trackFeature } = useFeatureTracking();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const handleCreateTraining = async (formData: any) => {
    try {
      await createTraining.mutateAsync(formData);
      setShowTrainingSheet(false);
      trackFeature('create_training', 'trainings');
      toast({ title: 'Trénink vytvořen' });
    } catch (error) {
      console.error('Error creating training:', error);
      toast({ title: 'Chyba při vytváření tréninku', variant: 'destructive' });
    }
  };

  return (
    <>
      {/* Fixed bottom bar - Apple-style tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-3 mb-3 premium-layer">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => setShowTrainingSheet(true)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-150 premium-hover"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Nový</span>
            </button>
            
            <button
              onClick={() => setShowSearch(true)}
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-150 premium-hover"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Hledat</span>
            </button>
            
            <Link
              to="/statistics"
              className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-150 premium-hover"
            >
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">Stats</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Spacer */}
      <div className="md:hidden h-20" />
      
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
