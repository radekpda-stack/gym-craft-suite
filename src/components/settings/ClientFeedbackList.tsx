import { useState, useMemo } from 'react';
import { Search, Bell, BellOff, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useClients } from '@/hooks/useClients';
import { useToggleClientFeedback } from '@/hooks/useToggleClientFeedback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ClientFeedbackList() {
  const { data: clients = [], isLoading } = useClients();
  const toggleFeedback = useToggleClientFeedback();
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    clientId: string;
    clientName: string;
    newValue: boolean;
  }>({ open: false, clientId: '', clientName: '', newValue: false });

  // Filter active (non-archived) clients
  const activeClients = useMemo(() => {
    return clients
      .filter(c => !c.is_archived)
      .filter(c => 
        searchQuery === '' || 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }, [clients, searchQuery]);

  const stats = useMemo(() => {
    const active = clients.filter(c => !c.is_archived);
    const enabled = active.filter(c => c.feedback_enabled !== false);
    return {
      total: active.length,
      enabled: enabled.length,
      disabled: active.length - enabled.length,
    };
  }, [clients]);

  const handleToggleClick = (clientId: string, clientName: string, currentValue: boolean) => {
    const newValue = !currentValue;
    setConfirmDialog({
      open: true,
      clientId,
      clientName,
      newValue,
    });
  };

  const handleConfirm = () => {
    toggleFeedback.mutate({
      clientId: confirmDialog.clientId,
      enabled: confirmDialog.newValue,
    });
    setConfirmDialog({ open: false, clientId: '', clientName: '', newValue: false });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="gap-1.5">
          <Users className="w-3.5 h-3.5" />
          {stats.total} klientů
        </Badge>
        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 gap-1.5">
          <Bell className="w-3.5 h-3.5" />
          {stats.enabled} zapnuto
        </Badge>
        {stats.disabled > 0 && (
          <Badge variant="secondary" className="gap-1.5">
            <BellOff className="w-3.5 h-3.5" />
            {stats.disabled} vypnuto
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Vyhledat klienta..."
          className="pl-9"
        />
      </div>

      {/* Client list */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {activeClients.map((client) => {
            const isEnabled = client.feedback_enabled !== false;
            return (
              <div
                key={client.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isEnabled ? (
                    <Bell className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium truncate">{client.name}</span>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggleClick(client.id, client.name, isEnabled)}
                  disabled={toggleFeedback.isPending}
                />
              </div>
            );
          })}
          {activeClients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Žádní klienti nenalezeni' : 'Nemáte žádné aktivní klienty'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.newValue ? 'Zapnout feedback?' : 'Vypnout feedback?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.newValue ? (
                <>
                  Klient <strong>{confirmDialog.clientName}</strong> se bude zobrazovat v přehledu feedbacků 
                  po každém tréninku.
                </>
              ) : (
                <>
                  Klient <strong>{confirmDialog.clientName}</strong> se už nebude zobrazovat v přehledu feedbacků. 
                  Můžete to kdykoliv změnit.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmDialog.newValue ? 'Zapnout' : 'Vypnout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
