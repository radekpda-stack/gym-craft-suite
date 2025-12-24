import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, StickyNote, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { QuickNoteDialog } from '@/components/dashboard/QuickNoteDialog';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { useToast } from '@/hooks/use-toast';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}

export function QuickActionsGrid() {
  const navigate = useNavigate();
  const { trackFeature } = useFeatureTracking();
  const { toast } = useToast();
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNote, setShowNote] = useState(false);
  
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const handleCreateTraining = async (formData: any) => {
    try {
      await createTraining.mutateAsync(formData);
      setShowTrainingSheet(false);
      trackFeature('quick_action_create_training', 'trainings');
      toast({ title: 'Trénink vytvořen' });
    } catch (error) {
      console.error('Error creating training:', error);
      toast({ title: 'Chyba při vytváření tréninku', variant: 'destructive' });
    }
  };
  
  const handleOpenSearch = () => {
    setShowSearch(true);
    trackFeature('quick_action_search', 'search');
  };
  
  const handleOpenNote = () => {
    setShowNote(true);
    trackFeature('quick_action_note', 'clients');
  };
  
  const actions: QuickAction[] = [
    {
      id: 'new-training',
      label: 'Nový trénink',
      icon: <Plus className="w-4 h-4" />,
      primary: true,
      onClick: () => setShowTrainingSheet(true),
    },
    {
      id: 'search',
      label: 'Hledat',
      icon: <Search className="w-4 h-4" />,
      onClick: handleOpenSearch,
    },
    {
      id: 'note',
      label: 'Poznámka',
      icon: <StickyNote className="w-4 h-4" />,
      onClick: handleOpenNote,
    },
    {
      id: 'stats',
      label: 'Statistiky',
      icon: <BarChart3 className="w-4 h-4" />,
      onClick: () => navigate('/statistics'),
    },
  ];

  return (
    <>
      <div className="glass rounded-2xl p-3">
        <div className="grid grid-cols-4 gap-2">
          {actions.map(action => (
            <Button
              key={action.id}
              variant={action.primary ? 'default' : 'ghost'}
              onClick={action.onClick}
              className={`
                flex flex-col items-center gap-1.5 h-auto py-3 px-2
                ${action.primary 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'hover:bg-secondary/50'
                }
              `}
            >
              <div className={`
                p-2 rounded-xl
                ${action.primary 
                  ? 'bg-primary-foreground/20' 
                  : 'bg-secondary/50'
                }
              `}>
                {action.icon}
              </div>
              <span className="text-[11px] font-medium">
                {action.label}
              </span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Dialogs */}
      <CreateTrainingSheet
        open={showTrainingSheet}
        onOpenChange={setShowTrainingSheet}
        onSubmit={handleCreateTraining}
        isLoading={createTraining.isPending}
        clients={clients}
      />
      
      <CommandPalette
        open={showSearch}
        onOpenChange={setShowSearch}
      />
      
      <QuickNoteDialog
        open={showNote}
        onOpenChange={setShowNote}
      />
    </>
  );
}
