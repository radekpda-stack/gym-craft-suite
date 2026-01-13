import { useState, useMemo } from 'react';
import { Trophy, Dumbbell, Timer, Hash, Search, User, ChevronRight, ArrowLeft, Calendar, Ruler } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { useDashboardSchedule } from '@/hooks/dashboard/useDashboardSchedule';
import { ExerciseHistorySheet } from './ExerciseHistorySheet';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function PRIcon({ metricType }: { metricType: ExercisePR['metricType'] }) {
  switch (metricType) {
    case 'weight':
      return <Dumbbell className="w-4 h-4" />;
    case 'time':
      return <Timer className="w-4 h-4" />;
    case 'reps':
      return <Hash className="w-4 h-4" />;
    case 'distance':
      return <Ruler className="w-4 h-4" />;
    default:
      return <Trophy className="w-4 h-4" />;
  }
}

function getMetricColor(metricType: ExercisePR['metricType']) {
  switch (metricType) {
    case 'weight':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'time':
      return 'bg-accent/10 text-accent border-accent/20';
    case 'reps':
      return 'bg-success/10 text-success border-success/20';
    case 'distance':
      return 'bg-primary/10 text-primary border-primary/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

interface PRItemProps {
  pr: ExercisePR;
  onSelect: (pr: ExercisePR) => void;
}

function PRItem({ pr, onSelect }: PRItemProps) {
  const colorClass = getMetricColor(pr.metricType);

  return (
    <button
      type="button"
      onClick={() => onSelect(pr)}
      className={cn(
        "w-full flex items-center justify-between py-3 px-3 rounded-xl",
        "bg-secondary/50 hover:bg-secondary active:scale-[0.98] transition-all"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <PRIcon metricType={pr.metricType} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className="font-medium text-sm block truncate">{pr.exerciseName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(pr.achievedAt), 'd. MMMM', { locale: cs })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant="secondary" className={`font-mono font-bold text-base ${colorClass}`}>
          {pr.bestDisplay}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
      </div>
    </button>
  );
}

// ============= Today's Clients List =============

interface TodayClient {
  id: string;
  name: string;
  time: string;
}

interface TodayClientsListProps {
  clients: TodayClient[];
  isLoading: boolean;
  onSelect: (clientId: string, clientName: string) => void;
  onShowSearch: () => void;
}

function TodayClientsList({ clients, isLoading, onSelect, onShowSearch }: TodayClientsListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Načítám rozvrh...</div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <Calendar className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">
          Dnes nemáte naplánované žádné tréninky
        </p>
        <Button
          variant="outline"
          onClick={onShowSearch}
          className="gap-2"
        >
          <Search className="w-4 h-4" />
          Vyhledat klienta
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/50 bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Dnešní klienti ({clients.length})</span>
        </div>
      </div>
      
      {/* Client list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client.id, client.name)}
              className={cn(
                "w-full flex items-center justify-between py-3 px-3 rounded-xl",
                "bg-secondary/50 hover:bg-secondary active:scale-[0.98] transition-all text-left"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">{client.name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm">{client.time}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      
      {/* Search other client button */}
      <div className="shrink-0 p-3 border-t border-border/50 bg-background">
        <Button
          variant="ghost"
          onClick={onShowSearch}
          className="w-full gap-2 text-muted-foreground hover:text-foreground"
        >
          <Search className="w-4 h-4" />
          Jiný klient...
        </Button>
      </div>
    </div>
  );
}

// ============= Client PRs View =============

interface ClientPRsViewProps {
  clientId: string;
  clientName: string;
  onBack: () => void;
}

function ClientPRsView({ clientId, clientName, onBack }: ClientPRsViewProps) {
  const { data: prs = [], isLoading } = useClientExercisePRs(clientId);
  const [selectedPR, setSelectedPR] = useState<ExercisePR | null>(null);

  const sortedPRs = useMemo(() => {
    return [...prs].sort((a, b) => {
      const order: Record<string, number> = { weight: 0, time: 1, reps: 2, distance: 3 };
      return (order[a.metricType] ?? 4) - (order[b.metricType] ?? 4);
    });
  }, [prs]);

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Back header */}
        <button
          onClick={onBack}
          className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors text-left bg-background"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium truncate">{clientName}</span>
        </button>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Načítám PRka...</div>
          </div>
        ) : sortedPRs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-8">
            <Trophy className="w-10 h-10 opacity-30" />
            <p className="text-center text-sm">
              {clientName} zatím nemá žádné osobní rekordy
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-1.5 pb-20">
                {sortedPRs.map((pr) => (
                  <PRItem key={pr.id} pr={pr} onSelect={setSelectedPR} />
                ))}
              </div>
            </ScrollArea>

            {/* Stats footer */}
            <div className="shrink-0 p-4 border-t border-border/50 bg-background flex items-center justify-center">
              <Badge variant="secondary">
                {sortedPRs.length} osobních rekordů
              </Badge>
            </div>
          </>
        )}
      </div>
      
      {/* Exercise History Sheet */}
      <ExerciseHistorySheet
        open={!!selectedPR}
        onOpenChange={(open) => !open && setSelectedPR(null)}
        pr={selectedPR}
        clientId={clientId}
        clientName={clientName}
      />
    </>
  );
}

// ============= Search View =============

interface SearchViewProps {
  clients: Array<{ id: string; name: string; is_archived?: boolean }>;
  clientsLoading: boolean;
  onSelect: (clientId: string, clientName: string) => void;
  onBack: () => void;
}

function SearchView({ clients, clientsLoading, onSelect, onBack }: SearchViewProps) {
  const [searchClientId, setSearchClientId] = useState<string | null>(null);
  
  const handleSelect = (value: string) => {
    if (value) {
      const client = clients.find(c => c.id === value);
      if (client) {
        onSelect(value, client.name);
      }
    }
    setSearchClientId(value || null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Back header */}
      <button
        onClick={onBack}
        className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors text-left bg-background"
      >
        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">Zpět na dnešní klienty</span>
      </button>
      
      {/* Search input */}
      <div className="shrink-0 p-4 bg-background">
        <ClientSearchSelect
          clients={clients.map(c => ({ 
            id: c.id, 
            name: c.name,
            is_archived: c.is_archived 
          }))}
          value={searchClientId || ''}
          onValueChange={handleSelect}
          placeholder="Vyhledat klienta..."
          filterArchived
          disabled={clientsLoading}
        />
      </div>
      
      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
        <Search className="w-12 h-12 opacity-30" />
        <p className="text-center text-sm">
          Vyhledejte klienta podle jména
        </p>
      </div>
    </div>
  );
}

// ============= Main Component =============

export function QuickPRsLookup() {
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  
  const { data: scheduleData, isLoading: scheduleLoading } = useDashboardSchedule();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  
  // Extract unique clients from today's schedule (only scheduled, not completed)
  const todayClients = useMemo(() => {
    if (!scheduleData?.todaySchedule) return [];
    
    const clientMap = new Map<string, TodayClient>();
    scheduleData.todaySchedule
      .filter(s => s.status === 'scheduled') // Only show clients with pending trainings
      .forEach(s => {
        if (!clientMap.has(s.clientId)) {
          clientMap.set(s.clientId, {
            id: s.clientId,
            name: s.clientName,
            time: s.time,
          });
        }
      });
    return Array.from(clientMap.values());
  }, [scheduleData]);

  const handleSelectFromList = (clientId: string, clientName: string) => {
    setSelectedClient({ id: clientId, name: clientName });
  };

  const handleSelectFromSearch = (clientId: string, clientName: string) => {
    setSelectedClient({ id: clientId, name: clientName });
    setShowSearch(false);
  };

  const handleBack = () => {
    setSelectedClient(null);
  };

  // Show client PRs
  if (selectedClient) {
    return (
      <ClientPRsView 
        clientId={selectedClient.id} 
        clientName={selectedClient.name}
        onBack={handleBack} 
      />
    );
  }

  // Show search view
  if (showSearch) {
    return (
      <SearchView 
        clients={clients}
        clientsLoading={clientsLoading}
        onSelect={handleSelectFromSearch} 
        onBack={() => setShowSearch(false)} 
      />
    );
  }

  // Default: show today's clients list
  return (
    <TodayClientsList 
      clients={todayClients}
      isLoading={scheduleLoading}
      onSelect={handleSelectFromList}
      onShowSearch={() => setShowSearch(true)}
    />
  );
}
