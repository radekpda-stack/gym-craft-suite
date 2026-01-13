import { useState } from 'react';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Plus, Copy, ExternalLink, Calendar, Check, RotateCcw, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useNutritionLogSessions, useCreateNutritionLogSession, NutritionLogSession } from '@/hooks/useNutritionLog';
import { NutritionLogDetail } from './NutritionLogDetail';
import { cn } from '@/lib/utils';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';

interface ClientNutritionTabProps {
  clientId: string;
  clientName: string;
}

export function ClientNutritionTab({ clientId, clientName }: ClientNutritionTabProps) {
  const { trackFeature } = useFeatureTracking();
  const { data: sessions = [], isLoading } = useNutritionLogSessions(clientId);
  const createSession = useCreateNutritionLogSession();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleCreateSession = async () => {
    try {
      await createSession.mutateAsync({ clientId, startDate: selectedDate });
      toast.success('7denní log vytvořen');
      trackFeature('nutrition_session_create', 'nutrition');
      setCreateDialogOpen(false);
    } catch (error) {
      toast.error('Nepodařilo se vytvořit log');
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/nutrition-log/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Odkaz zkopírován do schránky');
    trackFeature('nutrition_link_copy', 'nutrition');
  };

  const getPublicUrl = (token: string) => `${window.location.origin}/nutrition-log/${token}`;

  if (selectedSessionId) {
    return (
      <NutritionLogDetail
        sessionId={selectedSessionId}
        clientName={clientName}
        onBack={() => setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Strava (7 dní)</h3>
          <p className="text-sm text-muted-foreground">
            Sledování jídelníčku klienta po dobu 7 dnů
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Vytvořit nový log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vytvořit 7denní jídelní log</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Datum začátku</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(selectedDate, 'd. MMMM yyyy', { locale: cs })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      locale={cs}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground">
                Log bude platný od {format(selectedDate, 'd.M.', { locale: cs })} do {format(addDays(selectedDate, 6), 'd.M.yyyy', { locale: cs })}
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Instrukce pro klienta:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Zapisujte vše co jíte a pijete</li>
                  <li>Uvádějte přibližné porce</li>
                  <li>Nezapomeňte na kávu a ostatní nápoje</li>
                  <li>Čím detailnější, tím lepší analýza</li>
                </ul>
              </div>
              <Button onClick={handleCreateSession} className="w-full" disabled={createSession.isPending}>
                {createSession.isPending ? 'Vytvářím...' : 'Vytvořit log'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Načítám...</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Zatím žádné jídelní logy</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vytvořte první 7denní log pro sledování stravy klienta
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onCopyLink={() => copyLink(session.token)}
              onOpenDetail={() => setSelectedSessionId(session.id)}
              publicUrl={getPublicUrl(session.token)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: NutritionLogSession;
  onCopyLink: () => void;
  onOpenDetail: () => void;
  publicUrl: string;
}

function SessionCard({ session, onCopyLink, onOpenDetail, publicUrl }: SessionCardProps) {
  const startDate = parseISO(session.start_date);
  const endDate = parseISO(session.end_date);
  const isActive = session.status === 'active';
  const isCurrent = isWithinInterval(new Date(), { start: startDate, end: addDays(endDate, 1) });

  return (
    <Card className={cn(isActive && isCurrent && 'border-primary')}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {format(startDate, 'd.M.', { locale: cs })} – {format(endDate, 'd.M.yyyy', { locale: cs })}
                </span>
                <Badge variant={isActive ? 'default' : 'secondary'}>
                  {isActive ? 'Aktivní' : 'Dokončeno'}
                </Badge>
                {isActive && isCurrent && (
                  <Badge variant="outline" className="text-primary border-primary">
                    Probíhá
                  </Badge>
                )}
                {(session as any).is_self_service && (
                  <Badge variant="outline" className="text-warning border-warning bg-warning/10 dark:bg-warning/20">
                    Self-service
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Vytvořeno {format(parseISO(session.created_at), 'd.M.yyyy HH:mm', { locale: cs })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Kopírovat odkaz
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button size="sm" onClick={onOpenDetail}>
              <Eye className="h-4 w-4 mr-2" />
              Detail
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
