import { useState } from 'react';
import { Trophy, Timer, Hash, Dumbbell, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { useClients } from '@/hooks/useClients';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';

interface ClientPRsQuickViewProps {
  participantIds: string[];
  maxItems?: number;
  className?: string;
}

function PRIcon({ metricType }: { metricType: ExercisePR['metricType'] }) {
  switch (metricType) {
    case 'weight':
      return <Dumbbell className="w-4 h-4 text-primary" />;
    case 'time':
      return <Timer className="w-4 h-4 text-accent" />;
    case 'reps':
      return <Hash className="w-4 h-4 text-success" />;
    default:
      return <Trophy className="w-4 h-4 text-warning" />;
  }
}

function PRItem({ pr }: { pr: ExercisePR }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Extract numeric value from display for clipboard
    const numericMatch = pr.bestDisplay.match(/[\d.]+/);
    if (numericMatch) {
      navigator.clipboard.writeText(numericMatch[0]);
      setCopied(true);
      toast.success(`${pr.bestDisplay} zkopírováno`);
      if (navigator.vibrate) navigator.vibrate(20);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
        "bg-secondary/50 hover:bg-secondary/80 active:scale-[0.98]",
        "border border-transparent hover:border-primary/20"
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center shrink-0">
        <PRIcon metricType={pr.metricType} />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{pr.exerciseName}</p>
        {pr.side && (pr.side === 'left' || pr.side === 'right') && (
            <span className={cn(
              "text-[10px] font-bold px-1 rounded shrink-0",
              pr.side === 'left' ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
            )}>
              {pr.side === 'left' ? 'L' : 'R'}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(pr.achievedAt), 'd. MMMM yyyy', { locale: cs })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-base font-bold text-primary">{pr.bestDisplay}</span>
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground/50" />
        )}
      </div>
    </button>
  );
}

function PRList({ prs, isLoading, maxItems, expanded }: { prs: ExercisePR[]; isLoading: boolean; maxItems: number; expanded: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Zatím žádná osobní maxima
      </div>
    );
  }

  const displayPRs = expanded ? prs : prs.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {displayPRs.map((pr) => (
        <PRItem key={pr.id} pr={pr} />
      ))}
      {!expanded && prs.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{prs.length - maxItems} dalších
        </p>
      )}
    </div>
  );
}

function SingleClientPRs({ clientId, maxItems, expanded }: { clientId: string; maxItems: number; expanded: boolean }) {
  const { data: prs = [], isLoading } = useClientExercisePRs(clientId);
  return <PRList prs={prs} isLoading={isLoading} maxItems={maxItems} expanded={expanded} />;
}

export function ClientPRsQuickView({ 
  participantIds, 
  maxItems = 6,
  className 
}: ClientPRsQuickViewProps) {
  const { data: clients = [] } = useClients();
  const [activeClient, setActiveClient] = useState(participantIds[0] || '');
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Single participant - direct view with expand toggle
  if (participantIds.length === 1) {
    return (
      <div className={cn("space-y-3", className)}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full group"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="w-4 h-4 text-warning" />
            <span className="font-semibold text-foreground">PRka - {getShortName(getClientName(participantIds[0]))}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Klikni pro zkopírování</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>
        <ScrollArea className={cn(isExpanded ? "h-[360px]" : "h-[280px]", "transition-all")}>
          <SingleClientPRs clientId={participantIds[0]} maxItems={maxItems} expanded={isExpanded} />
        </ScrollArea>
      </div>
    );
  }

  // Multiple participants - tabs
  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="w-4 h-4 text-warning" />
          <span className="font-semibold text-foreground">PRka účastníků</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Klikni pro zkopírování</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>
      <Tabs value={activeClient} onValueChange={setActiveClient} className="w-full">
        <TabsList className="w-full h-auto p-1 gap-1 bg-secondary/50 rounded-xl">
          {participantIds.map((id) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex-1 text-xs px-2 py-2 rounded-lg data-[state=active]:bg-background font-medium"
            >
              {getShortName(getClientName(id))}
            </TabsTrigger>
          ))}
        </TabsList>
        {participantIds.map((id) => (
          <TabsContent key={id} value={id} className="mt-3">
            <ScrollArea className={cn(isExpanded ? "h-[320px]" : "h-[240px]", "transition-all")}>
              <SingleClientPRs clientId={id} maxItems={maxItems} expanded={isExpanded} />
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
