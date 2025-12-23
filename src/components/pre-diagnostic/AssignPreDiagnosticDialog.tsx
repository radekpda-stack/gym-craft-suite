import { useState } from 'react';
import { UserCheck, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { PreDiagnosticForm, useAssignPreDiagnostic } from '@/hooks/usePreDiagnosticForms';
import { Client } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface AssignPreDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PreDiagnosticForm;
  clients: Client[];
}

export function AssignPreDiagnosticDialog({
  open,
  onOpenChange,
  form,
  clients,
}: AssignPreDiagnosticDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const assignPreDiagnostic = useAssignPreDiagnostic();

  const filteredClients = clients
    .filter(c => !c.is_archived)
    .filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 10);

  const handleAssign = async () => {
    if (!selectedClientId) return;

    await assignPreDiagnostic.mutateAsync({
      formId: form.id,
      clientId: selectedClientId,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Přiřadit k existujícímu klientovi
          </DialogTitle>
          <DialogDescription>
            Vyberte klienta, ke kterému chcete přiřadit pre-diagnostiku od{' '}
            <strong>{form.client_name || 'neznámého'}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat klienty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Client List */}
          <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border p-1">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Žádní klienti nenalezeni
              </div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                    selectedClientId === client.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-secondary/50'
                  )}
                >
                  <ClientAvatar name={client.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {client.name}
                    </p>
                    {client.email && (
                      <p className="text-sm text-muted-foreground truncate">
                        {client.email}
                      </p>
                    )}
                  </div>
                  {selectedClientId === client.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <UserCheck className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={assignPreDiagnostic.isPending || !selectedClientId}
          >
            {assignPreDiagnostic.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Přiřadit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
