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
import { useClientsWithoutPortal, useInviteClient } from '@/hooks/useClientPortalAdmin';
import { Check, Copy, Mail, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteClientDialog({ open, onOpenChange }: InviteClientDialogProps) {
  const { data: clients, isLoading } = useClientsWithoutPortal();
  const inviteClient = useInviteClient();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredClients = clients?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async () => {
    if (!selectedClient) return;

    const result = await inviteClient.mutateAsync(selectedClient);
    
    // Generate invite link
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/client/login?token=${result.token.token}`;
    setInviteLink(link);
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: 'Odkaz zkopírován',
      description: 'Pošlete ho klientovi emailem nebo zprávou.',
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setSearch('');
    setSelectedClient(null);
    setInviteLink(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pozvat klienta do portálu</DialogTitle>
          <DialogDescription>
            Vyberte klienta a vygenerujte pozvánkový odkaz.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm font-medium text-green-600 mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Pozvánka vytvořena!
              </p>
              <p className="text-xs text-muted-foreground">
                Odkaz je platný 7 dní. Po kliknutí se klient přihlásí přes svůj email.
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-xs"
              />
              <Button onClick={handleCopyLink} variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
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
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
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
                onClick={handleInvite}
                disabled={!selectedClient || inviteClient.isPending}
              >
                {inviteClient.isPending ? 'Vytvářím...' : 'Vytvořit pozvánku'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
