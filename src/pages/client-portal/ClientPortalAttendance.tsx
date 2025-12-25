import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientTrainingSessions } from '@/hooks/useClientPortalData';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientPortalAttendance() {
  const { clientId } = useClientPortal();
  const { data: sessions, isLoading } = useClientTrainingSessions(clientId ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Docházka</h1>
        <p className="text-muted-foreground">Posledních 8 týdnů</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Historie tréninků
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : sessions?.length === 0 ? (
            <p className="text-muted-foreground text-sm">Zatím žádné tréninky</p>
          ) : (
            <div className="space-y-3">
              {sessions?.slice(0, 10).map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      session.status === 'completed' ? "bg-success/10" : "bg-destructive/10"
                    )}>
                      {session.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {format(parseISO(session.date), 'EEEE d. MMMM', { locale: cs })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.duration ?? 60} min
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
