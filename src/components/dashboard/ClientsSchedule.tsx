import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { cs } from 'date-fns/locale';

type ViewMode = 'today' | 'week';

interface ScheduleItem {
  id: string;
  clientId: string;
  clientName: string;
  time: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  hasFeedback: boolean;
}

export function ClientsSchedule() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  
  const { data, isLoading } = useQuery({
    queryKey: ['clients-schedule', viewMode],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      if (viewMode === 'today') {
        startDate = startOfDay(now);
        endDate = endOfDay(now);
      } else {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      }
      
      const [trainingsResult, feedbackResult] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, status, client_id, clients(name)')
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString())
          .order('date', { ascending: true }),
        supabase
          .from('feedback_requests')
          .select('training_session_id, status')
          .eq('status', 'completed'),
      ]);
      
      const feedbackIds = new Set(
        (feedbackResult.data || []).map((f: any) => f.training_session_id)
      );
      
      const items: ScheduleItem[] = (trainingsResult.data || []).map((t: any) => ({
        id: t.id,
        clientId: t.client_id,
        clientName: (t.clients as any)?.name || 'Neznámý',
        time: format(new Date(t.date), 'HH:mm'),
        date: format(new Date(t.date), 'EEEE d.M.', { locale: cs }),
        status: t.status,
        hasFeedback: feedbackIds.has(t.id),
      }));
      
      return items;
    },
  });
  
  const getStatusIcon = (item: ScheduleItem) => {
    if (item.status === 'completed') {
      return item.hasFeedback ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <AlertCircle className="w-4 h-4 text-orange-500" />
      );
    }
    if (item.status === 'cancelled') {
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
    return <Clock className="w-4 h-4 text-blue-500" />;
  };
  
  const getStatusBg = (item: ScheduleItem) => {
    if (item.status === 'completed') {
      return item.hasFeedback ? 'bg-green-500/5' : 'bg-orange-500/5';
    }
    if (item.status === 'cancelled') {
      return 'bg-destructive/5';
    }
    return 'bg-blue-500/5';
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Klienti
          </CardTitle>
          
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('today')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'today' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent text-muted-foreground hover:bg-secondary'
              )}
            >
              Dnes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'week' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-transparent text-muted-foreground hover:bg-secondary'
              )}
            >
              Týden
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="space-y-2">
            {data.slice(0, 8).map(item => (
              <button
                key={item.id}
                onClick={() => navigate(`/trainings/${item.id}`)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-secondary/50',
                  getStatusBg(item)
                )}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background/50">
                  {getStatusIcon(item)}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm truncate">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {viewMode === 'week' ? `${item.date} • ` : ''}{item.time}
                  </p>
                </div>
                
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            
            {data.length > 8 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => navigate('/schedule')}
              >
                Zobrazit všechny ({data.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {viewMode === 'today' ? 'Dnes žádné tréninky' : 'Tento týden žádné tréninky'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
