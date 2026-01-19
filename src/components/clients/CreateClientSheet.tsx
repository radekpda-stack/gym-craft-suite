import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientFormStepper } from "./ClientFormStepper";
import { ClientFormValues } from "@/lib/validations/client";
import { CreateClientModeSelector, CreateClientMode, ModeSelectorHeader } from "./CreateClientModeSelector";
import { SendInviteFlow } from "./SendInviteFlow";
import { TrainerPreDiagnosticClientForm } from "./TrainerPreDiagnosticClientForm";

interface CreateClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClientFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function CreateClientSheet({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateClientSheetProps) {
  const [mode, setMode] = useState<CreateClientMode>('select');

  const handleClose = () => {
    onOpenChange(false);
    // Reset mode after close animation
    setTimeout(() => setMode('select'), 300);
  };

  const handleSuccess = () => {
    handleClose();
  };

  const handleBack = () => {
    setMode('select');
  };

  const getTitle = () => {
    switch (mode) {
      case 'select':
        return 'Nový klient';
      case 'basic':
        return 'Rychlé vytvoření';
      case 'send_invite':
        return 'Poslat pre-diagnostiku';
      case 'trainer_fill':
        return 'Trenérská pre-diagnostika';
      default:
        return 'Nový klient';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'select':
        return 'Vyberte způsob vytvoření nového klienta.';
      case 'basic':
        return 'Vyplňte základní údaje o klientovi. Pole označená * jsou povinná.';
      case 'send_invite':
        return 'Vytvořte klienta a vygenerujte odkaz pro vyplnění pre-diagnostiky.';
      case 'trainer_fill':
        return 'Vyplňte kompletní údaje včetně pre-diagnostiky.';
      default:
        return '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <ModeSelectorHeader mode={mode} onBack={handleBack} />
          <SheetTitle>{getTitle()}</SheetTitle>
          <SheetDescription>
            {getDescription()}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {mode === 'select' && (
            <CreateClientModeSelector onSelect={setMode} />
          )}
          
          {mode === 'basic' && (
            <ClientFormStepper 
              onSubmit={onSubmit} 
              isLoading={isLoading}
              submitLabel="Vytvořit klienta"
            />
          )}
          
          {mode === 'send_invite' && (
            <SendInviteFlow 
              onSuccess={handleSuccess}
              onCancel={handleBack}
            />
          )}
          
          {mode === 'trainer_fill' && (
            <TrainerPreDiagnosticClientForm
              onSuccess={handleSuccess}
              onCancel={handleBack}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
