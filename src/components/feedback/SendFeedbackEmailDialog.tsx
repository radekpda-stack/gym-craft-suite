import { useState, useEffect, ReactNode } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Mail,
  Send,
  Loader2,
  X,
  MessageSquare,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import {
  useCreateFeedbackRequest,
  useSendFeedbackEmail,
  useFeedbackSettings,
} from '@/hooks/useFeedbackRequests';

interface SendFeedbackEmailDialogProps {
  // Controlled mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Trigger mode
  trigger?: ReactNode;
  // Preselected data
  clientId?: string;
  clientName?: string;
  clientEmail?: string | null;
  trainingSessionId?: string;
  trainingDate?: string;
}

export function SendFeedbackEmailDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  clientId: preselectedClientId,
  clientName: preselectedClientName,
  clientEmail: preselectedClientEmail,
  trainingSessionId: preselectedTrainingId,
  trainingDate: preselectedTrainingDate,
}: SendFeedbackEmailDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : setInternalOpen;

  const { data: clients = [] } = useClients();
  const { data: sessions = [] } = useTrainingSessions();
  const { settings } = useFeedbackSettings();
  const createRequest = useCreateFeedbackRequest();
  const sendEmail = useSendFeedbackEmail();

  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [selectedTrainingId, setSelectedTrainingId] = useState(preselectedTrainingId || '');
  const [customMessage, setCustomMessage] = useState('Prosím o vyplnění krátkého dotazníku k dnešnímu tréninku.');
  const [trainerSignature, setTrainerSignature] = useState(settings?.trainer_signature || '');

  // Update when dialog opens with preselected values
  useEffect(() => {
    if (open) {
      if (preselectedClientId) setSelectedClientId(preselectedClientId);
      if (preselectedTrainingId) setSelectedTrainingId(preselectedTrainingId);
      if (settings?.trainer_signature) setTrainerSignature(settings.trainer_signature);
    }
  }, [open, preselectedClientId, preselectedTrainingId, settings?.trainer_signature]);

  const selectedClient = preselectedClientId 
    ? { id: preselectedClientId, name: preselectedClientName || '', email: preselectedClientEmail }
    : clients.find(c => c.id === selectedClientId);
    
  const clientTrainings = sessions.filter(s => 
    s.client_id === selectedClientId && 
    s.status === 'completed'
  );

  const handleSend = async () => {
    if (!selectedClientId) return;

    try {
      // Create request
      const request = await createRequest.mutateAsync({
        client_id: selectedClientId,
        training_session_id: selectedTrainingId || undefined,
        custom_message: customMessage || undefined,
        trainer_signature: trainerSignature || undefined,
      });

      // Send email
      await sendEmail.mutateAsync(request);
      
      onOpenChange?.(false);
      resetForm();
    } catch (error) {
      console.error('Error sending feedback email:', error);
    }
  };

  const resetForm = () => {
    if (!preselectedClientId) setSelectedClientId('');
    if (!preselectedTrainingId) setSelectedTrainingId('');
    setCustomMessage('Prosím o vyplnění krátkého dotazníku k dnešnímu tréninku.');
  };

  const isLoading = createRequest.isPending || sendEmail.isPending;
  const hasPreselectedClient = !!preselectedClientId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Odeslat feedback e-mailem
          </DialogTitle>
          <DialogDescription>
            Klient obdrží e-mail s odkazem na formulář zpětné vazby.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client selection - show only if not preselected */}
          {!hasPreselectedClient ? (
            <div className="space-y-2">
              <Label>Klient *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte klienta" />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.email).map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && !selectedClient.email && (
                <p className="text-sm text-destructive">
                  Tento klient nemá nastavený e-mail.
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Klient</p>
              <p className="font-medium">{preselectedClientName}</p>
              {preselectedTrainingDate && (
                <>
                  <p className="text-sm text-muted-foreground mt-2">Trénink</p>
                  <p className="font-medium">
                    {format(new Date(preselectedTrainingDate), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Training selection - only when client is selected and not preselected */}
          {!hasPreselectedClient && selectedClientId && clientTrainings.length > 0 && (
            <div className="space-y-2">
              <Label>Trénink (volitelné)</Label>
              <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte trénink" />
                </SelectTrigger>
                <SelectContent>
                  {clientTrainings.slice(0, 10).map(training => (
                    <SelectItem key={training.id} value={training.id}>
                      {format(new Date(training.date), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom message */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Zpráva pro klienta
            </Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Volitelná zpráva..."
              rows={3}
            />
          </div>

          {/* Trainer signature */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Podpis trenéra
            </Label>
            <Input
              value={trainerSignature}
              onChange={(e) => setTrainerSignature(e.target.value)}
              placeholder="Např. S pozdravem, Jan Novák"
            />
          </div>

          {/* Preview */}
          {selectedClient && selectedClient.email && (
            <div className="p-4 rounded-lg bg-secondary/50 border space-y-2">
              <p className="text-sm font-medium">Náhled:</p>
              <p className="text-sm text-muted-foreground">
                E-mail bude odeslán na: <span className="font-medium">{selectedClient.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Platnost odkazu: 48 hodin
              </p>
            </div>
          )}

          {/* Warning if no email */}
          {selectedClient && !selectedClient.email && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
              <p className="text-sm">Tento klient nemá nastavený e-mail. Prosím, nejprve přidejte e-mail v kartě klienta.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            <X className="w-4 h-4 mr-2" />
            Zrušit
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!selectedClientId || !selectedClient?.email || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Odeslat e-mail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
