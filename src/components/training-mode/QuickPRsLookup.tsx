import { useState } from 'react';
import { Trophy, Dumbbell, Timer, Hash, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-1.5 rounded-md ${colorClass}`}>
          <PRIcon metricType={pr.metricType} />
        </div>
        <span className="font-medium truncate">{pr.exerciseName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={`font-mono font-semibold ${colorClass}`}>
          {pr.bestDisplay}
        </Badge>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {format(new Date(pr.achievedAt), 'd. M.', { locale: cs })}
        </span>
      </div>
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
    <div className="flex flex-col h-full p-4">
      <Card className="flex flex-col flex-1 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-primary" />
            PRka klientů
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col flex-1 overflow-hidden gap-4">
          {/* Client Search */}
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

          {/* PRs List */}
          {!selectedClientId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 py-8">
              <Search className="w-12 h-12 opacity-30" />
              <p className="text-center">
                Vyberte klienta pro zobrazení jeho osobních rekordů
              </p>
            </div>
          ) : prsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Načítám PRka...</div>
            </div>
          ) : sortedPRs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 py-8">
              <Trophy className="w-10 h-10 opacity-30" />
              <p className="text-center">
                {selectedClient?.name} zatím nemá žádné osobní rekordy
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-2">
              <div className="space-y-1 px-2">
                {sortedPRs.map((pr) => (
                  <PRItem key={pr.id} pr={pr} />
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Stats footer */}
          {selectedClientId && sortedPRs.length > 0 && (
            <div className="pt-2 border-t flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedClient?.name}</span>
              <span>{sortedPRs.length} PRek</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
