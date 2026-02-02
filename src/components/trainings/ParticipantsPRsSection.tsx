/**
 * ParticipantsPRsSection - Collapsible PRs for training participants
 * Shows personal records for each participant in the training
 */
import { useState } from 'react';
import { Trophy, ChevronDown, Dumbbell, Timer, Repeat, Ruler, ChevronRight, User } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useClientExercisePRs, ExercisePR } from '@/hooks/useClientExercisePRs';
import { ExerciseHistorySheet } from '@/components/training-mode/ExerciseHistorySheet';
import { cn } from '@/lib/utils';

interface Participant {
  client_id: string;
  name: string;
}

interface ParticipantsPRsSectionProps {
  participants: Participant[];
}

// Metric type icon helper
function MetricIcon({ type }: { type: ExercisePR['metricType'] }) {
  switch (type) {
    case 'weight':
      return <Dumbbell className="w-3.5 h-3.5" />;
    case 'time':
      return <Timer className="w-3.5 h-3.5" />;
    case 'reps':
      return <Repeat className="w-3.5 h-3.5" />;
    case 'distance':
      return <Ruler className="w-3.5 h-3.5" />;
    default:
      return <Dumbbell className="w-3.5 h-3.5" />;
  }
}

// Metric type colors
function getMetricColor(type: ExercisePR['metricType']) {
  switch (type) {
    case 'weight':
      return 'text-warning bg-warning/10';
    case 'time':
      return 'text-accent bg-accent/10';
    case 'reps':
      return 'text-success bg-success/10';
    case 'distance':
      return 'text-primary bg-primary/10';
    default:
      return 'text-primary bg-primary/10';
  }
}

// Single PR item - now opens history instead of copying
interface PRItemProps {
  pr: ExercisePR;
  onSelect: (pr: ExercisePR) => void;
}

function PRItem({ pr, onSelect }: PRItemProps) {
  const colorClasses = getMetricColor(pr.metricType);
  const dateDisplay = pr.achievedAt 
    ? format(new Date(pr.achievedAt), 'd.M.', { locale: cs })
    : null;
  
  return (
    <button 
      type="button"
      className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
      onClick={() => onSelect(pr)}
    >
      <div className={cn("p-1.5 rounded", colorClasses)}>
        <MetricIcon type={pr.metricType} />
      </div>
      <span className="flex-1 text-sm truncate">{pr.exerciseName}</span>
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className={cn("font-mono font-semibold text-sm", colorClasses)}>
          {pr.bestDisplay}
        </Badge>
        {dateDisplay && (
          <span className="text-xs text-muted-foreground">• {dateDisplay}</span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
    </button>
  );
}

// Collapsible card for single participant
function CollapsiblePRCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<ExercisePR | null>(null);
  const { data: prs = [], isLoading } = useClientExercisePRs(isOpen ? clientId : null);
  
  // Sort PRs alphabetically by exercise name for easier scanning
  const sortedPRs = [...prs].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  
  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-colors",
            "bg-secondary/50 hover:bg-secondary",
            isOpen && "bg-secondary"
          )}>
            <ClientAvatar name={clientName} size="sm" />
            <span className="flex-1 text-left font-medium text-sm">{clientName}</span>
            {prs.length > 0 && isOpen && (
              <span className="text-xs text-muted-foreground">{prs.length} záznamů</span>
            )}
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="pl-4 pr-2 py-2 space-y-0.5">
            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : sortedPRs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-3 text-center">
                Žádné zaznamenané výsledky
              </div>
            ) : (
              sortedPRs.map(pr => (
                <PRItem key={pr.id} pr={pr} onSelect={setSelectedPR} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      
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

export function ParticipantsPRsSection({ participants }: ParticipantsPRsSectionProps) {
  if (participants.length === 0) return null;
  
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Výsledky účastníků</span>
        <span className="text-xs text-muted-foreground">({participants.length})</span>
      </div>
      
      <div className="space-y-2">
        {participants.map(p => (
          <CollapsiblePRCard 
            key={p.client_id}
            clientId={p.client_id}
            clientName={p.name}
          />
        ))}
      </div>
    </div>
  );
}
