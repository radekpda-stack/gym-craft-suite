import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Apple, 
  ChevronRight, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAllNutritionSessions } from '@/hooks/useAllNutritionSessions';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ClientNutritionCardProps {
  clientId: string;
  clientName: string;
  defaultOpen?: boolean;
}

export function ClientNutritionCard({ clientId, clientName, defaultOpen = false }: ClientNutritionCardProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { data: allSessions = [], isLoading } = useAllNutritionSessions();

  // Filter sessions for this client
  const clientSessions = allSessions.filter(s => s.client_id === clientId);
  const activeSessions = clientSessions.filter(s => s.status === 'active');
  const completedSessions = clientSessions.filter(s => s.status === 'completed');
  
  const activeSession = activeSessions[0];
  const totalSessions = clientSessions.length;

  // Calculate days and progress for active session
  const daysTotal = activeSession 
    ? differenceInDays(new Date(activeSession.end_date), new Date(activeSession.start_date))
    : 0;
  const daysPassed = activeSession 
    ? differenceInDays(new Date(), new Date(activeSession.start_date))
    : 0;
  const fillRate = daysTotal > 0 ? Math.round((activeSession?.entries_count || 0) / Math.max(daysPassed, 1) * 100) : 0;
  const daysRemaining = activeSession 
    ? differenceInDays(new Date(activeSession.end_date), new Date())
    : 0;

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-6 bg-secondary/50 rounded w-32 mb-3" />
        <div className="h-16 bg-secondary/30 rounded" />
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full glass rounded-2xl p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-xl',
              activeSession ? 'bg-success/10' : 'bg-secondary/50'
            )}>
              <Apple className={cn(
                'w-5 h-5',
                activeSession ? 'text-success' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Výživa</p>
              <p className="text-sm text-muted-foreground">
                {activeSession 
                  ? `Aktivní kampaň • ${activeSession.entries_count} záznamů`
                  : totalSessions > 0 
                    ? `${completedSessions.length} dokončených kampaní`
                    : 'Žádné kampaně'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeSession && (
              <Badge variant="secondary" className="bg-success/20 text-success border-0">
                Aktivní
              </Badge>
            )}
            <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 glass rounded-2xl space-y-4">
          {activeSession ? (
            <>
              {/* Active campaign stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Záznamy</span>
                  <span className="text-sm font-medium">{activeSession.entries_count} položek</span>
                </div>
                <Progress value={Math.min(fillRate, 100)} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Zbývá</p>
                    <p className="font-medium text-foreground">
                      {daysRemaining > 0 ? `${daysRemaining} dní` : 'Končí dnes'}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Trvání</p>
                    <p className="font-medium text-foreground">{daysTotal} dní</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(activeSession.start_date), 'd. MMM', { locale: cs })} - {format(new Date(activeSession.end_date), 'd. MMM yyyy', { locale: cs })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => navigate(`/nutrition/campaigns/${activeSession.id}`)}
                >
                  Detail kampaně
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : totalSessions > 0 ? (
            <>
              {/* Show recent completed campaigns */}
              <p className="text-xs text-muted-foreground">Poslední kampaně</p>
              <div className="space-y-2">
                {clientSessions.slice(0, 3).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/nutrition/campaigns/${session.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {session.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(session.start_date), 'd. MMM', { locale: cs })} - {format(new Date(session.end_date), 'd. MMM', { locale: cs })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.entries_count} záznamů
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => navigate('/nutrition')}
              >
                <Plus className="w-4 h-4" />
                Nová kampaň
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <Apple className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Zatím žádné nutriční kampaně</p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigate('/nutrition')}
              >
                <Plus className="w-4 h-4" />
                Vytvořit kampaň
              </Button>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
