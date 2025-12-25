import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useClientsWithoutPortal, useResetClientPassword } from '@/hooks/useClientPortalAdmin';
import { Check, Copy, Mail, Search, User, Key } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteClientDialog({ open, onOpenChange }: InviteClientDialogProps) {
  const { data: clients, isLoading } = useClientsWithoutPortal();
  const createAccess = useResetClientPassword();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string; clientName: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const filteredClients = clients?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateAccess = async () => {
    if (!selectedClient) return;

    try {
      const result = await createAccess.mutateAsync(selectedClient);
      setCredentials({
        email: result.email,
        password: result.password,
        clientName: result.clientName,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const copyToClipboard = async (text: string, field: 'email' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: 'Zkopírováno',
      description: field === 'email' ? 'Email zkopírován' : 'Heslo zkopírováno',
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleClose = () => {
    setSearch('');
    setSelectedClient(null);
    setCredentials(null);
    setCopiedField(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {credentials ? 'Přihlašovací údaje' : 'Vytvořit přístup klientovi'}
          </DialogTitle>
          <DialogDescription>
            {credentials 
              ? 'Zkopírujte přihlašovací údaje a předejte je klientovi.'
              : 'Vyberte klienta a vytvořte mu přístup do portálu.'}
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-green-600 mb-1 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Přístup vytvořen pro: {credentials.clientName}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <div className="flex gap-2">
                  <Input value={credentials.email} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.email, 'email')}
                  >
                    {copiedField === 'email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Heslo</label>
                <div className="flex gap-2">
                  <Input value={credentials.password} readOnly className="font-mono text-lg tracking-wider" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.password, 'password')}
                  >
                    {copiedField === 'password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ Heslo se zobrazuje pouze nyní. Po zavření dialogu ho již nebude možné zobrazit.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Zavřít
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat klienta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Načítám klienty...
                </div>
              ) : filteredClients?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Žádní klienti k pozvání</p>
                  <p className="text-xs mt-1">
                    Všichni klienti už mají přístup nebo nemáte žádné klienty.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients?.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(client.id)}
                      disabled={!client.email}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                        !client.email && 'opacity-50 cursor-not-allowed',
                        selectedClient === client.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        {client.email ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </p>
                        ) : (
                          <p className="text-xs text-destructive">Chybí email!</p>
                        )}
                      </div>
                      {selectedClient === client.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>
                Zrušit
              </Button>
              <Button
                onClick={handleCreateAccess}
                disabled={!selectedClient || createAccess.isPending}
              >
                <Key className="w-4 h-4 mr-2" />
                {createAccess.isPending ? 'Vytvářím...' : 'Vytvořit přístup'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
