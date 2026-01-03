import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Calendar, UserPlus, ChevronDown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUnassignedSessions, useAssignClientToSession } from '@/hooks/useUnassignedSessions';
import { useClients } from '@/hooks/useClients';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function UnassignedSessionsCard() {
  const { data: sessions, isLoading } = useUnassignedSessions();
  const { data: clients } = useClients();
  const assignMutation = useAssignClientToSession();
  const [isOpen, setIsOpen] = useState(true);

  const handleAssignClient = async (
    sessionId: string, 
    clientId: string, 
    eventId?: string | null
  ) => {
    try {
      await assignMutation.mutateAsync({
        sessionId,
        clientId,
        learnAlias: true,
        eventId,
      });
      toast.success('Klient přiřazen k tréninku');
    } catch (error) {
      toast.error('Nepodařilo se přiřadit klienta');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="py-3 px-4">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return null;
  }

  const extractSessionTitle = (notes: string | null, sourceEvent?: { summary: string | null } | null) => {
    if (sourceEvent?.summary) return sourceEvent.summary;
    if (notes?.startsWith('Z kalendáře: ')) {
      return notes.replace('Z kalendáře: ', '').split('\n')[0];
    }
    return 'Trénink bez názvu';
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-warning/10 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-warning" />
                <span>Tréninky čekající na přiřazení</span>
                <Badge variant="secondary" className="ml-1 bg-warning/20 text-warning-foreground">
                  {sessions.length}
                </Badge>
              </CardTitle>
              <ChevronDown className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-3 space-y-2">
            {sessions.slice(0, 5).map((session) => {
              const title = extractSessionTitle(session.notes, session.source_event);
              const suggestions = session.source_event?.match_suggestions || [];
              const topSuggestion = suggestions[0];

              return (
                <div 
                  key={session.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(session.date), 'd. M.', { locale: cs })}
                    </span>
                    <span className="font-medium text-foreground">
                      {format(new Date(session.date), 'HH:mm')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{title}</p>
                    {topSuggestion && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Sparkles className="w-3 h-3 text-warning" />
                        <span>Návrh: {topSuggestion.name} ({topSuggestion.score}%)</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {topSuggestion ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleAssignClient(
                            session.id, 
                            topSuggestion.client_id,
                            session.source_ics_event_id
                          )}
                          disabled={assignMutation.isPending}
                        >
                          {topSuggestion.name.split(' ')[0]}
                        </Button>
                        <Select
                          onValueChange={(clientId) => handleAssignClient(
                            session.id, 
                            clientId,
                            session.source_ics_event_id
                          )}
                        >
                          <SelectTrigger className="w-8 h-7 px-0">
                            <ChevronDown className="w-3 h-3" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Select
                        onValueChange={(clientId) => handleAssignClient(
                          session.id, 
                          clientId,
                          session.source_ics_event_id
                        )}
                      >
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                          <SelectValue placeholder="Vybrat klienta" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}

            {sessions.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                + {sessions.length - 5} dalších tréninků
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
