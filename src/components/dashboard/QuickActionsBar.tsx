import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Dumbbell, 
  Link, 
  Utensils, 
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTrainingSheet } from '@/components/trainings/CreateTrainingSheet';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { useClients } from '@/hooks/useClients';
import { useCreateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function QuickActionsBar() {
  const navigate = useNavigate();
  const { trackFeature } = useFeatureTracking();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const createTraining = useCreateTrainingSession();
  
  const [showTrainingSheet, setShowTrainingSheet] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  
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
  
  const handleCopyFeedbackLink = () => {
    navigate('/trainings?filter=completed');
    trackFeature('feedback_link_nav', 'feedback');
  };
  
  const handleCopyNutritionLink = () => {
    navigate('/clients');
    trackFeature('nutrition_link_nav', 'nutrition');
  };

  const actions = [
    {
      id: 'training',
      label: 'Trénink',
      icon: Dumbbell,
      variant: 'default' as const,
      onClick: () => setShowTrainingSheet(true),
      primary: true,
    },
    {
      id: 'credit',
      label: 'Kredit',
      icon: Wallet,
      variant: 'secondary' as const,
      onClick: () => setShowCreditModal(true),
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: Link,
      variant: 'secondary' as const,
      onClick: handleCopyFeedbackLink,
    },
    {
      id: 'nutrition',
      label: 'Strava',
      icon: Utensils,
      variant: 'secondary' as const,
      onClick: handleCopyNutritionLink,
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              className={cn(
                'gap-2 flex-shrink-0',
                action.primary && 'shadow-sm'
              )}
            >
              <action.icon className="w-4 h-4" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
      
      {/* Modals */}
      <CreateTrainingSheet
        open={showTrainingSheet}
        onOpenChange={setShowTrainingSheet}
        onSubmit={handleCreateTraining}
        clients={clients}
        isLoading={createTraining.isPending}
      />
      
      <UnifiedCreditModal
        open={showCreditModal}
        onOpenChange={setShowCreditModal}
        showTrigger={false}
      />
    </>
  );
}
