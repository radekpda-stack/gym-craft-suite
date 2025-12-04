import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MeasurementForm, MeasurementFormValues } from "./MeasurementForm";
import { InlineMediaUpload, PendingMedia } from "@/components/media/InlineMediaUpload";
import { useCreateMedia } from "@/hooks/useClientMedia";
import { Client } from "@/hooks/useClients";
import { Separator } from "@/components/ui/separator";

interface CreateMeasurementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MeasurementFormValues) => Promise<string | void>;
  isLoading?: boolean;
  clients: Client[];
  defaultClientId?: string;
}

export function CreateMeasurementSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  defaultClientId,
}: CreateMeasurementSheetProps) {
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const createMedia = useCreateMedia();

  const handleAddMedia = (media: PendingMedia) => {
    setPendingMedia(prev => [...prev, media]);
  };

  const handleRemoveMedia = (id: string) => {
    setPendingMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleSubmit = async (data: MeasurementFormValues) => {
    // First create the measurement
    await onSubmit(data);
    
    // If we have pending media, upload them linked to the client
    if (pendingMedia.length > 0) {
      setIsUploadingMedia(true);
      try {
        for (const media of pendingMedia) {
          await createMedia.mutateAsync({
            client_id: data.client_id,
            type: media.type,
            file: media.file,
            description: `Měření - ${data.date}`,
            category: 'progress',
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
          <SheetTitle>Nové měření</SheetTitle>
          <SheetDescription>
            Zaznamenejte nové tělesné měření klienta.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <MeasurementForm
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