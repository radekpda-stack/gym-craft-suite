import { useState } from 'react';
import { Trophy, Dumbbell, Timer, Hash, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
function PRIcon({ metricType }: { metricType: ExercisePR['metricType'] }) {
  switch (metricType) {
    case 'weight':
      return <Dumbbell className="w-4 h-4" />;
    case 'time':
      return <Timer className="w-4 h-4" />;
    case 'reps':
      return <Hash className="w-4 h-4" />;
    default:
      return <Trophy className="w-4 h-4" />;
  }
}

function getMetricColor(metricType: ExercisePR['metricType']) {
  switch (metricType) {
    case 'weight':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'time':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'reps':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function PRItem({ pr }: { pr: ExercisePR }) {
  const colorClass = getMetricColor(pr.metricType);
  
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-secondary/50 active:bg-secondary transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <PRIcon metricType={pr.metricType} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm block truncate">{pr.exerciseName}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(pr.achievedAt), 'd. MMMM', { locale: cs })}
          </span>
        </div>
      </div>
      <Badge variant="secondary" className={`font-mono font-bold text-base shrink-0 ml-2 ${colorClass}`}>
        {pr.bestDisplay}
      </Badge>
    </div>
  );
}

export function QuickPRsLookup() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: prs = [], isLoading: prsLoading } = useClientExercisePRs(selectedClientId);

  // Sort PRs by metric type for grouping
  const sortedPRs = [...prs].sort((a, b) => {
    const order = { weight: 0, time: 1, reps: 2, distance: 3 };
    return order[a.metricType] - order[b.metricType];
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="flex flex-col h-full">
      {/* Client Search - sticky at top */}
      <div className="p-4 border-b border-border/50 bg-background">
        <ClientSearchSelect
          clients={clients.map(c => ({ 
            id: c.id, 
            name: c.name,
            is_archived: c.is_archived 
          }))}
          value={selectedClientId || ''}
          onValueChange={(val) => setSelectedClientId(val || null)}
          placeholder="Vyhledat klienta..."
          filterArchived
          disabled={clientsLoading}
        />
      </div>

      {/* PRs List */}
      {!selectedClientId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
          <Search className="w-12 h-12 opacity-30" />
          <p className="text-center text-sm">
            Vyberte klienta pro zobrazení jeho osobních rekordů
          </p>
        </div>
      ) : prsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Načítám PRka...</div>
        </div>
      ) : sortedPRs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-8">
          <Trophy className="w-10 h-10 opacity-30" />
          <p className="text-center text-sm">
            {selectedClient?.name} zatím nemá žádné osobní rekordy
          </p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-1.5">
              {sortedPRs.map((pr) => (
                <PRItem key={pr.id} pr={pr} />
              ))}
            </div>
          </ScrollArea>

          {/* Stats footer - sticky at bottom */}
          <div className="p-4 border-t border-border/50 bg-background flex items-center justify-between text-sm">
            <span className="font-medium truncate min-w-0">{selectedClient?.name}</span>
            <Badge variant="secondary" className="shrink-0 ml-2">
              {sortedPRs.length} PRek
            </Badge>
          </div>
        </>
      )}
    </div>
  );
}
