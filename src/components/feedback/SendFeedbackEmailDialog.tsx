import { useState } from 'react';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClients, Client } from '@/hooks/useClients';
import { useTrainingSessions, TrainingSession } from '@/hooks/useTrainingSessions';
import {
  useCreateFeedbackRequest,
  useSendFeedbackEmail,
  useFeedbackSettings,
} from '@/hooks/useFeedbackRequests';

interface SendFeedbackEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  preselectedTrainingId?: string;
}

export function SendFeedbackEmailDialog({
  open,
  onOpenChange,
  preselectedClientId,
  preselectedTrainingId,
}: SendFeedbackEmailDialogProps) {
  const { data: clients = [] } = useClients();
  const { data: sessions = [] } = useTrainingSessions();
  const { settings } = useFeedbackSettings();
  const createRequest = useCreateFeedbackRequest();
  const sendEmail = useSendFeedbackEmail();

  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || '');
  const [selectedTrainingId, setSelectedTrainingId] = useState(preselectedTrainingId || '');
  const [customMessage, setCustomMessage] = useState('Prosím o vyplnění krátkého dotazníku k dnešnímu tréninku.');
  const [trainerSignature, setTrainerSignature] = useState(settings?.trainer_signature || '');

  const selectedClient = clients.find(c => c.id === selectedClientId);
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
      
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error sending feedback email:', error);
    }
  };

  const resetForm = () => {
    setSelectedClientId('');
    setSelectedTrainingId('');
    setCustomMessage('Prosím o vyplnění krátkého dotazníku k dnešnímu tréninku.');
  };

  const isLoading = createRequest.isPending || sendEmail.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          {/* Client selection */}
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

          {/* Training selection */}
          {selectedClientId && clientTrainings.length > 0 && (
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
          {selectedClient && (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
