import { useState } from 'react';
import { Trophy, Timer, Hash, Dumbbell } from 'lucide-react';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { useClients } from '@/hooks/useClients';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientPRsQuickViewProps {
  participantIds: string[];
  maxItems?: number;
  className?: string;
}

function PRIcon({ metricType }: { metricType: ExercisePR['metricType'] }) {
  switch (metricType) {
    case 'weight':
      return <Dumbbell className="w-3.5 h-3.5 text-primary" />;
    case 'time':
      return <Timer className="w-3.5 h-3.5 text-blue-500" />;
    case 'reps':
      return <Hash className="w-3.5 h-3.5 text-green-500" />;
    default:
      return <Trophy className="w-3.5 h-3.5 text-amber-500" />;
  }
}

function PRList({ prs, isLoading, maxItems }: { prs: ExercisePR[]; isLoading: boolean; maxItems: number }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Zatím žádná PR
      </div>
    );
  }

  const displayPRs = prs.slice(0, maxItems);

  return (
    <div className="space-y-1.5">
      {displayPRs.map((pr) => (
        <div
          key={pr.id}
          className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
        >
          <PRIcon metricType={pr.metricType} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pr.exerciseName}</p>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(pr.achievedAt), 'd. MMM', { locale: cs })}
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-primary">{pr.bestDisplay}</span>
          </div>
        </div>
      ))}
      {prs.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{prs.length - maxItems} dalších
        </p>
      )}
    </div>
  );
}

function SingleClientPRs({ clientId, maxItems }: { clientId: string; maxItems: number }) {
  const { data: prs = [], isLoading } = useClientExercisePRs(clientId);
  return <PRList prs={prs} isLoading={isLoading} maxItems={maxItems} />;
}

export function ClientPRsQuickView({ 
  participantIds, 
  maxItems = 8,
  className 
}: ClientPRsQuickViewProps) {
  const { data: clients = [] } = useClients();
  const [activeClient, setActiveClient] = useState(participantIds[0] || '');

  const getClientName = (id: string) => {
    const client = clients.find(c => c.id === id);
    return client?.name || 'Klient';
  };

  const getShortName = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return name;
  };

  if (participantIds.length === 0) {
    return (
      <div className={cn("text-center py-4 text-muted-foreground text-sm", className)}>
        Žádní účastníci
      </div>
    );
  }

  // Single participant - direct view
  if (participantIds.length === 1) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="w-3.5 h-3.5" />
          <span className="font-medium">PRka - {getShortName(getClientName(participantIds[0]))}</span>
        </div>
        <ScrollArea className="h-[200px]">
          <SingleClientPRs clientId={participantIds[0]} maxItems={maxItems} />
        </ScrollArea>
      </div>
    );
  }

  // Multiple participants - tabs
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Trophy className="w-3.5 h-3.5" />
        <span className="font-medium">PRka účastníků</span>
      </div>
      <Tabs value={activeClient} onValueChange={setActiveClient} className="w-full">
        <TabsList className="w-full h-auto p-1 gap-1 bg-secondary/50">
          {participantIds.map((id) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex-1 text-xs px-2 py-1.5 data-[state=active]:bg-background"
            >
              {getShortName(getClientName(id))}
            </TabsTrigger>
          ))}
        </TabsList>
        {participantIds.map((id) => (
          <TabsContent key={id} value={id} className="mt-2">
            <ScrollArea className="h-[180px]">
              <SingleClientPRs clientId={id} maxItems={maxItems} />
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
