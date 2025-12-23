import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PreDiagnosticForm, useAssignPreDiagnostic, usePreDiagnosticAnswers } from '@/hooks/usePreDiagnosticForms';
import { useCreateClient } from '@/hooks/useClients';
import { toast } from 'sonner';

interface CreateClientFromPreDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PreDiagnosticForm;
}

export function CreateClientFromPreDiagnosticDialog({
  open,
  onOpenChange,
  form,
}: CreateClientFromPreDiagnosticDialogProps) {
  const [name, setName] = useState(form.client_name || '');
  const [email, setEmail] = useState(form.client_email || '');
  const [phone, setPhone] = useState('');

  const createClient = useCreateClient();
  const assignPreDiagnostic = useAssignPreDiagnostic();
  const { data: answers = [] } = usePreDiagnosticAnswers(form.id);

  const isLoading = createClient.isPending || assignPreDiagnostic.isPending;

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Zadejte jméno klienta');
      return;
    }

    try {
      // Extract additional data from answers
      const answerMap = new Map(answers.map(a => [a.field_key, a.value]));
      
      // Create client with data from pre-diagnostic
      const newClient = await createClient.mutateAsync({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        trainingGoals: [],
        // Additional fields can be populated from answers if needed
      });

      // Assign the pre-diagnostic form to the new client
      await assignPreDiagnostic.mutateAsync({
        formId: form.id,
        clientId: newClient.id,
      });

      toast.success(`Klient ${name} byl vytvořen`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Nepodařilo se vytvořit klienta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Vytvořit klienta z pre-diagnostiky
          </DialogTitle>
          <DialogDescription>
            Vytvoří nového klienta a přiřadí k němu vyplněnou pre-diagnostiku.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Jméno *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jan Novák"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 123 456 789"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Vytvořit klienta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
