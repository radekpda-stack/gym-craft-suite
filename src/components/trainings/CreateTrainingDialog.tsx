import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedTrainingForm, EnhancedTrainingFormValues } from "./EnhancedTrainingForm";
import { useClients } from "@/hooks/useClients";
import { useAppSettings, TrainingPrices } from "@/hooks/useAppSettings";
import { useCreateTrainingSession } from "@/hooks/useTrainingSessions";
import { useAddTrainingSessionTags } from "@/hooks/useTrainingSessionTags";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface CreateTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
  defaultDate?: string;
  defaultValues?: Partial<EnhancedTrainingFormValues>;
}

export function CreateTrainingDialog({
  open,
  onOpenChange,
  defaultClientId,
  defaultDate,
  defaultValues: propDefaultValues,
}: CreateTrainingDialogProps) {
  const { data: clients = [] } = useClients();
  const { data: settings } = useAppSettings();
  const createTraining = useCreateTrainingSession();
  const addTrainingTags = useAddTrainingSessionTags();
  const isMobile = useIsMobile();
  
  // Track selected client to determine effective prices
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(defaultClientId);
  
  // Update selected client when defaultClientId changes
  useEffect(() => {
    if (defaultClientId) {
      setSelectedClientId(defaultClientId);
    }
  }, [defaultClientId]);

  // Get effective prices based on selected client's legacy pricing status
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const isTransitionEnabled = settings?.price_transition_enabled;
  const legacyPrices = settings?.legacy_training_prices as TrainingPrices | undefined;
  const currentPrices = settings?.training_prices as TrainingPrices | undefined;
  
  const usesLegacyPricing = Boolean(
    isTransitionEnabled &&
    selectedClient?.use_legacy_pricing &&
    selectedClient?.grandfathered_credit !== null &&
    (selectedClient?.credit_balance || 0) > 0
  );
  
  // Use effective prices with proper legacy fallback
  // When usesLegacyPricing is true, getEffectiveTrainingPrice handles the fallback
  const effectivePrices: TrainingPrices = usesLegacyPricing
    ? (legacyPrices || { "1": 800, "2": 1000, "3": 1200, "first_training": 1000 })
    : (currentPrices || { "1": 900, "2": 1100, "3": 1300, "first_training": 1000 });

  const defaultValues: Partial<EnhancedTrainingFormValues> = { ...propDefaultValues };
  
  if (defaultClientId && !defaultValues.client_id) {
    defaultValues.client_id = defaultClientId;
  }
  
  if (defaultDate && !defaultValues.date) {
    defaultValues.date = defaultDate;
  }

  const handleSubmit = async (data: EnhancedTrainingFormValues, tagIds: string[]) => {
    try {
      // Calculate participant count from additional clients
      const additionalClients = data.additional_client_ids || [];
      const participantCount = 1 + additionalClients.length;
      
      const result = await createTraining.mutateAsync({
        client_id: data.client_id,
        date: new Date(data.date).toISOString(),
        duration: data.duration,
        notes: data.notes,
        status: 'scheduled',
        participant_count: participantCount,
        training_type: data.training_type || undefined,
      });
      
      // Save tags if any were selected
      if (tagIds.length > 0 && result?.session?.id) {
        await addTrainingTags.mutateAsync({
          trainingSessionId: result.session.id,
          tagIds,
        });
      }
      
      toast({ title: "Trénink vytvořen" });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Chyba při vytváření tréninku", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={
        isMobile 
          ? "fixed inset-0 w-full h-full max-w-none max-h-none translate-x-0 translate-y-0 left-0 top-0 rounded-none flex flex-col p-0"
          : "sm:max-w-lg max-h-[90vh] p-0"
      }>
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
          <DialogTitle>Nový trénink</DialogTitle>
        </DialogHeader>
        <div className={isMobile ? "flex-1 overflow-y-auto px-4 pb-4" : "max-h-[calc(90vh-80px)] overflow-y-auto px-6 pb-6"}>
          <EnhancedTrainingForm
            key={defaultDate || defaultClientId || 'new'}
            onSubmit={handleSubmit}
            isLoading={createTraining.isPending}
            clients={clients}
            trainingPrices={effectivePrices}
            defaultValues={Object.keys(defaultValues).length > 0 ? defaultValues : undefined}
            submitLabel="Vytvořit trénink"
            stickySubmit={isMobile}
            onClientChange={setSelectedClientId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
