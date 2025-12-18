import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Link2, 
  FileText, 
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { CommandPalette } from '@/components/search/CommandPalette';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';

export function ActionBar() {
  const navigate = useNavigate();
  const { trackFeature } = useFeatureTracking();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const handleCreateTraining = async (data: any) => {
    try {
      await createTraining.mutateAsync(data);
      setShowTrainingSheet(false);
      trackFeature('create_training', 'trainings');
    } catch (error) {
      console.error('Error creating training:', error);
    }
  };
  
  const handleGenerateLink = () => {
    navigate('/trainings?filter=completed');
    trackFeature('feedback_link_nav', 'feedback');
  };
  
  const handleStatement = () => {
    navigate('/clients');
    trackFeature('statement_nav', 'finance');
  };

  const actions = [
    {
      id: 'training',
      label: 'Nový trénink',
      icon: Plus,
      onClick: () => setShowTrainingSheet(true),
      primary: true,
    },
    {
      id: 'link',
      label: 'Odkaz',
      icon: Link2,
      onClick: handleGenerateLink,
    },
    {
      id: 'statement',
      label: 'Vyúčtování',
      icon: FileText,
      onClick: handleStatement,
    },
    {
      id: 'search',
      label: 'Hledat',
      icon: Search,
      onClick: () => setShowSearch(true),
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.primary ? 'default' : 'outline'}
              size="sm"
              onClick={action.onClick}
              className={cn(
                'gap-2 flex-1 sm:flex-none',
                action.primary && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              <action.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.label.split(' ')[0]}</span>
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
