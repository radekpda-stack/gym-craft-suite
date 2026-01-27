import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MeasurementForm, MeasurementFormValues, MeasurementFormRef } from "./MeasurementForm";
import { InlineMediaUpload, PendingMedia } from "@/components/media/InlineMediaUpload";
import { useCreateMedia } from "@/hooks/useClientMedia";
import { Client } from "@/hooks/useClients";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import { parseImageMeasurement, isImageFile, getSupportedFileTypes } from "@/lib/imageMeasurementParser";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const createMedia = useCreateMedia();
  const formRef = useRef<MeasurementFormRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddMedia = (media: PendingMedia) => {
    setPendingMedia(prev => [...prev, media]);
  };

  const handleRemoveMedia = (id: string) => {
    setPendingMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleImageImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!isImageFile(file)) {
      toast.error("Nepodporovaný formát", {
        description: "Nahrajte obrázek ve formátu JPG, PNG nebo HEIC"
      });
      return;
    }

    setIsParsingImage(true);
    setParseWarnings([]);

    try {
      const result = await parseImageMeasurement(file);

      if (!result.success) {
        toast.error("Nepodařilo se rozpoznat hodnoty", {
          description: result.error
        });
        return;
      }

      // Map parsed data to form values
      const formData: Partial<MeasurementFormValues> = {};
      
      if (result.data?.weight) formData.weight = result.data.weight;
      if (result.data?.bodyFatPercentage) formData.body_fat_percentage = result.data.bodyFatPercentage;
      if (result.data?.muscleMass) formData.muscle_mass = result.data.muscleMass;
      if (result.data?.basalMetabolism) formData.basal_metabolism = result.data.basalMetabolism;
      if (result.data?.date) formData.date = result.data.date;

      // Count recognized values
      const recognizedCount = Object.keys(formData).filter(k => k !== 'date').length;
      const totalPossible = 4; // weight, body_fat, muscle_mass, basal_metabolism

      if (recognizedCount === 0) {
        toast.error("Žádné hodnoty nebyly rozpoznány", {
          description: "Zkontrolujte, že fotka obsahuje čitelné hodnoty měření"
        });
        return;
      }

      // Prefill form with recognized values
      formRef.current?.prefillValues(formData);

      // Show success with count
      if (recognizedCount === totalPossible) {
        toast.success("Všechny hodnoty rozpoznány", {
          description: "Formulář byl automaticky vyplněn"
        });
      } else {
        toast.success(`Rozpoznáno ${recognizedCount}/${totalPossible} hodnot`, {
          description: "Zkontrolujte a doplňte zbývající hodnoty"
        });
      }

      // Set warnings if any
      if (result.warnings && result.warnings.length > 0) {
        setParseWarnings(result.warnings);
      }

    } catch (error) {
      console.error('Error parsing image:', error);
      toast.error("Chyba při zpracování", {
        description: "Nepodařilo se zpracovat obrázek"
      });
    } finally {
      setIsParsingImage(false);
    }
  };

  const handleSubmit = async (data: MeasurementFormValues) => {
    // Calculate next_measurement_date if reminder is enabled
    let next_measurement_date: string | undefined;
    if (data.create_reminder && data.reminder_interval_days) {
      const measurementDate = new Date(data.date);
      measurementDate.setDate(measurementDate.getDate() + parseInt(data.reminder_interval_days));
      next_measurement_date = measurementDate.toISOString().split('T')[0];
    }

    // First create the measurement with reminder data
    await onSubmit({
      ...data,
      next_measurement_date,
      create_reminder: data.create_reminder,
    } as any);
    
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
    setParseWarnings([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPendingMedia([]);
      setParseWarnings([]);
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
          {/* Photo Import Section */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
              onChange={handleImageImport}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-auto py-4 flex flex-col items-center gap-2 border-dashed border-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingImage || isLoading}
            >
              {isParsingImage ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm font-medium">Analyzuji fotku...</span>
                  <span className="text-xs text-muted-foreground">AI rozpoznává hodnoty</span>
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6 text-primary" />
                  <span className="text-sm font-medium">Nahrát fotku vážení</span>
                  <span className="text-xs text-muted-foreground">Automaticky rozpoznám hodnoty z displeje váhy</span>
                </>
              )}
            </Button>

            {parseWarnings.length > 0 && (
              <Alert variant="default" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {parseWarnings.join(", ")}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              nebo vyplňte ručně
            </span>
          </div>

          <MeasurementForm
            ref={formRef}
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
