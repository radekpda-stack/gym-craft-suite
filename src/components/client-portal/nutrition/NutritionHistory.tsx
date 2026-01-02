import { format, parseISO, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface NutritionSession {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  entries_count: number;
}

interface NutritionHistoryProps {
  sessions: NutritionSession[];
  isLoading: boolean;
  currentSessionId?: string;
}

export function NutritionHistory({ sessions, isLoading, currentSessionId }: NutritionHistoryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historie kampaní
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const pastSessions = sessions.filter(s => s.id !== currentSessionId);

  if (pastSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historie kampaní
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Zatím nemáš žádné dokončené kampaně</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Historie kampaní
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pastSessions.map((session) => {
          const startDate = parseISO(session.start_date);
          const endDate = parseISO(session.end_date);
          const totalDays = differenceInDays(endDate, startDate) + 1;
          const isCompleted = session.status === 'completed';

          return (
            <div 
              key={session.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                isCompleted ? "bg-green-500/5 border-green-500/20" : "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  isCompleted ? "bg-green-500/10" : "bg-muted"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>
                      {format(startDate, 'd. M.', { locale: cs })} – {format(endDate, 'd. M. yyyy', { locale: cs })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {totalDays} dní • {session.entries_count} záznamů
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  isCompleted && "bg-green-500/10 text-green-600 border-green-500/20"
                )}
              >
                {isCompleted ? 'Dokončeno' : 'Neaktivní'}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
