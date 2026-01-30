import { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Trophy, 
  History, 
  CreditCard,
  Phone,
  ChevronRight,
  Wallet,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useDashboardSchedule } from '@/hooks/dashboard/useDashboardSchedule';
import { useClients } from '@/hooks/useClients';
import { ClientPRsQuickView } from './ClientPRsQuickView';
import { QuickSalePanel } from './QuickSalePanel';
import { PullToRefresh } from './PullToRefresh';

interface TodayClient {
  id: string;
  name: string;
  time?: string;
  creditBalance?: number;
  notes?: string;
}

export function ClientsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<TodayClient | null>(null);
  const [activeSheet, setActiveSheet] = useState<'prs' | 'sale' | null>(null);
  
  const { data: scheduleData, isLoading: scheduleLoading, refetch } = useDashboardSchedule();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const isLoading = scheduleLoading || clientsLoading;

  // Get unique clients from today's schedule
  const todayClients = useMemo(() => {
    if (!scheduleData?.todaySchedule) return [];
    
    const clientMap = new Map<string, TodayClient>();
    scheduleData.todaySchedule.forEach(s => {
      if (!clientMap.has(s.clientId)) {
        const fullClient = clients.find(c => c.id === s.clientId);
        clientMap.set(s.clientId, {
          id: s.clientId,
          name: s.clientName,
          time: s.time,
          creditBalance: fullClient?.credit_balance ?? undefined,
          notes: fullClient?.notes ?? undefined,
        });
      }
    });
    
    return Array.from(clientMap.values()).sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return a.name.localeCompare(b.name, 'cs');
    });
  }, [scheduleData, clients]);

  // Filter by search
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return todayClients;
    const query = searchQuery.toLowerCase();
    return todayClients.filter(c => c.name.toLowerCase().includes(query));
  }, [todayClients, searchQuery]);

  const handleOpenPRs = (client: TodayClient) => {
    setSelectedClient(client);
    setActiveSheet('prs');
  };

  const handleOpenSale = (client: TodayClient) => {
    setSelectedClient(client);
    setActiveSheet('sale');
  };

  const handleCloseSheet = () => {
    setActiveSheet(null);
    setSelectedClient(null);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const today = new Date();
  const dateStr = format(today, 'EEEE, d. MMMM', { locale: cs });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="flex flex-col h-full">
          {/* Search header */}
          <div className="p-4 border-b border-border/50 bg-background space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium capitalize">{dateStr}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {todayClients.length} klientů
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Hledat klienta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          {/* Client list */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3 pb-32">
              {filteredClients.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="font-semibold text-lg mb-2">
                    {searchQuery ? 'Klient nenalezen' : 'Žádní klienti'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? 'Zkuste jiné jméno'
                      : 'Dnes nemáte naplánované tréninky'
                    }
                  </p>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <ClientQuickCard
                    key={client.id}
                    client={client}
                    onOpenPRs={() => handleOpenPRs(client)}
                    onOpenSale={() => handleOpenSale(client)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </PullToRefresh>

      {/* PRs Sheet */}
      <Sheet open={activeSheet === 'prs'} onOpenChange={(open) => !open && handleCloseSheet()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              PRka - {selectedClient?.name}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-4rem)] mt-4">
            {selectedClient && (
              <ClientPRsQuickView 
                participantIds={[selectedClient.id]} 
                maxItems={20}
              />
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Sale Sheet */}
      <Sheet open={activeSheet === 'sale'} onOpenChange={(open) => !open && handleCloseSheet()}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Prodej - {selectedClient?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-4rem)]">
            <QuickSalePanel />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface ClientQuickCardProps {
  client: TodayClient;
  onOpenPRs: () => void;
  onOpenSale: () => void;
}

function ClientQuickCard({ client, onOpenPRs, onOpenSale }: ClientQuickCardProps) {
  const creditBalance = client.creditBalance ?? 0;
  const hasLowCredit = creditBalance <= 1;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Client info header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">{client.time}</span>
            </div>
            <h3 className="font-semibold text-base truncate">{client.name}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge 
              variant={hasLowCredit ? "destructive" : "secondary"}
              className="gap-1"
            >
              <Wallet className="w-3 h-3" />
              {creditBalance} tr.
            </Badge>
          </div>
        </div>
        {client.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {client.notes}
          </p>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 border-t border-border/50">
        <Button
          variant="ghost"
          onClick={onOpenPRs}
          className="h-12 rounded-none gap-2 text-sm font-medium hover:bg-amber-500/10 hover:text-amber-600"
        >
          <Trophy className="w-4 h-4" />
          PRka
        </Button>
        <Button
          variant="ghost"
          onClick={onOpenSale}
          className="h-12 rounded-none gap-2 text-sm font-medium border-l border-border/50 hover:bg-primary/10 hover:text-primary"
        >
          <CreditCard className="w-4 h-4" />
          Prodej
        </Button>
      </div>
    </div>
  );
}
