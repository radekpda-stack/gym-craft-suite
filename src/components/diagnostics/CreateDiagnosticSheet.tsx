import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiagnosticForm, DiagnosticFormValues } from "./DiagnosticForm";
import { InlineMediaUpload, PendingMedia } from "@/components/media/InlineMediaUpload";
import { useCreateMedia } from "@/hooks/useClientMedia";
import { Client } from "@/hooks/useClients";
import { Separator } from "@/components/ui/separator";

interface CreateDiagnosticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DiagnosticFormValues) => Promise<string | void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
}

export function CreateDiagnosticSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: CreateDiagnosticSheetProps) {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const createMedia = useCreateMedia();

  const handleAddMedia = (media: PendingMedia) => {
    setPendingMedia(prev => [...prev, media]);
  };

  const handleRemoveMedia = (id: string) => {
    setPendingMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleSubmit = async (data: DiagnosticFormValues) => {
    // First create the diagnostic and get the ID
    const diagnosticId = await onSubmit(data);
    
    // If we have pending media and a diagnostic ID, upload them
    if (pendingMedia.length > 0 && diagnosticId) {
      setIsUploadingMedia(true);
      try {
        for (const media of pendingMedia) {
          await createMedia.mutateAsync({
            client_id: data.client_id,
            type: media.type,
            file: media.file,
            description: `Diagnostika - ${data.area_name}`,
            category: 'diagnostic',
            diagnostic_id: diagnosticId,
            date: data.date,
          });
        }
      } catch (error) {
        console.error('Error uploading media:', error);
      }
      setIsUploadingMedia(false);
    }
    
    // Reset form
    setPendingMedia([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPendingMedia([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nová diagnostika</SheetTitle>
          <SheetDescription>
            Zaznamenejte diagnostický nález klienta.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <DiagnosticForm
            onSubmit={handleSubmit}
            isLoading={isLoading || isUploadingMedia}
            clients={clients}
            defaultClientId={defaultClientId}
          />
          
          <Separator />
          
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Fotografie a hlasové poznámky
            </h4>
            <InlineMediaUpload
              pendingMedia={pendingMedia}
              onAddMedia={handleAddMedia}
              onRemoveMedia={handleRemoveMedia}
              disabled={isLoading || isUploadingMedia}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}