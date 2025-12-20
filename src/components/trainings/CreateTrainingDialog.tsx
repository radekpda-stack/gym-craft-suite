import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EnhancedTrainingForm, EnhancedTrainingFormValues } from "./EnhancedTrainingForm";
import { useClients } from "@/hooks/useClients";
import { useTrainingPrices } from "@/hooks/useAppSettings";
import { useCreateTrainingSession } from "@/hooks/useTrainingSessions";
import { useAddTrainingSessionTags } from "@/hooks/useTrainingSessionTags";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

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
  const trainingPrices = useTrainingPrices();
  const createTraining = useCreateTrainingSession();
  const addTrainingTags = useAddTrainingSessionTags();

  const defaultValues: Partial<EnhancedTrainingFormValues> = { ...propDefaultValues };
  
  if (defaultClientId && !defaultValues.client_id) {
    defaultValues.client_id = defaultClientId;
  }
  
  if (defaultDate && !defaultValues.date) {
    defaultValues.date = defaultDate;
  }

  const handleSubmit = async (data: EnhancedTrainingFormValues, tagIds: string[]) => {
    try {
      const result = await createTraining.mutateAsync({
        client_id: data.client_id,
        date: new Date(data.date).toISOString(),
        duration: data.duration,
        notes: data.notes,
        status: 'scheduled',
        participant_count: data.participant_count,
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Nový trénink</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
          <EnhancedTrainingForm
            key={defaultDate || defaultClientId || 'new'}
            onSubmit={handleSubmit}
            isLoading={createTraining.isPending}
            clients={clients}
            trainingPrices={trainingPrices}
            defaultValues={Object.keys(defaultValues).length > 0 ? defaultValues : undefined}
            submitLabel="Vytvořit trénink"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
