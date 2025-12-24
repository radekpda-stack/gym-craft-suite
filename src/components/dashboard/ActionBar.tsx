import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Link2, 
  FileText, 
  Search,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ActionBar() {
  const navigate = useNavigate();
  const { trackFeature } = useFeatureTracking();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const handleCreateTraining = async (data: any) => {
    try {
      await createTraining.mutateAsync(data);
      setShowTrainingSheet(false);
      trackFeature('create_training', 'trainings');
      toast({ title: 'Trénink vytvořen' });
    } catch (error) {
      console.error('Error creating training:', error);
      toast({ title: 'Chyba při vytváření tréninku', variant: 'destructive' });
    }
  };

  const actions = [
    {
      id: 'training',
      label: 'Nový trénink',
      shortLabel: 'Trénink',
      icon: Plus,
      onClick: () => setShowTrainingSheet(true),
      primary: true,
    },
    {
      id: 'clients',
      label: 'Klienti',
      shortLabel: 'Klienti',
      icon: Users,
      onClick: () => navigate('/clients'),
    },
    {
      id: 'links',
      label: 'Feedback',
      shortLabel: 'FB',
      icon: Link2,
      onClick: () => navigate('/trainings?filter=completed'),
    },
    {
      id: 'statement',
      label: 'Vyúčtování',
      shortLabel: 'PDF',
      icon: FileText,
      onClick: () => navigate('/clients'),
    },
    {
      id: 'search',
      label: 'Hledat',
      shortLabel: '🔍',
      icon: Search,
      onClick: () => setShowSearch(true),
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.primary ? 'default' : 'outline'}
              size="sm"
              onClick={action.onClick}
              className={cn(
                'gap-2 shrink-0 touch-target',
                action.primary && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.shortLabel}</span>
            </Button>
          ))}
        </div>
      </div>
      
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
