import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Dumbbell, 
  MessageSquare, 
  Utensils, 
  StickyNote,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';

interface ClientHistoryBlockProps {
  clientId: string;
}

interface HistoryItem {
  id: string;
  type: 'training' | 'feedback' | 'nutrition' | 'note';
  date: string;
  title: string;
  subtitle?: string;
  status?: 'completed' | 'scheduled' | 'canceled' | 'pending';
  url?: string;
}

export function ClientHistoryBlock({ clientId }: ClientHistoryBlockProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('trainings');
  
  // Fetch trainings
  const { data: trainings, isLoading: trainingsLoading } = useQuery({
    queryKey: ['client-history-trainings', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_sessions')
        .select('id, date, status, notes, final_price, payment_status')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(20);
      
      return (data || []).map(t => ({
        id: t.id,
        type: 'training' as const,
        date: format(new Date(t.date), 'd.M.yyyy HH:mm', { locale: cs }),
        title: 'Trénink',
        subtitle: t.final_price ? formatCurrency(t.final_price) : undefined,
        status: t.status as 'completed' | 'scheduled' | 'canceled',
        url: `/trainings/${t.id}`,
      }));
    },
  });
  
  // Fetch feedback
  const { data: feedback, isLoading: feedbackLoading } = useQuery({
    queryKey: ['client-history-feedback', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('feedback_requests')
        .select('id, created_at, completed_at, status, training_session_id')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      return (data || []).map(f => ({
        id: f.id,
        type: 'feedback' as const,
        date: format(new Date(f.completed_at || f.created_at), 'd.M.yyyy', { locale: cs }),
        title: f.status === 'completed' ? 'Feedback vyplněn' : 'Čeká na vyplnění',
        subtitle: undefined,
        status: f.status === 'completed' ? 'completed' as const : 'pending' as const,
        url: f.training_session_id ? `/trainings/${f.training_session_id}` : undefined,
      }));
    },
  });
  
  // Fetch nutrition sessions
  const { data: nutrition, isLoading: nutritionLoading } = useQuery({
    queryKey: ['client-history-nutrition', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('nutrition_log_sessions')
        .select('id, start_date, end_date, status')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return (data || []).map(n => ({
        id: n.id,
        type: 'nutrition' as const,
        date: `${format(new Date(n.start_date), 'd.M.', { locale: cs })} - ${format(new Date(n.end_date), 'd.M.yyyy', { locale: cs })}`,
        title: n.status === 'active' ? 'Aktivní sezení' : 'Ukončené sezení',
        subtitle: undefined,
        status: n.status === 'active' ? 'scheduled' as const : 'completed' as const,
      }));
    },
  });
  
  const StatusIcon = ({ status }: { status?: string }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'canceled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Calendar className="w-4 h-4 text-muted-foreground" />;
    }
  };
  
  const HistoryListItem = ({ item }: { item: HistoryItem }) => (
    <button
      onClick={() => item.url && navigate(item.url)}
      disabled={!item.url}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors',
        item.url ? 'hover:bg-secondary/50 cursor-pointer' : 'cursor-default',
        'bg-secondary/30'
      )}
    >
      <StatusIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">{item.date}</p>
      </div>
      {item.subtitle && (
        <span className="text-sm font-medium text-muted-foreground">{item.subtitle}</span>
      )}
      {item.url && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
    </button>
  );
  
  const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
    <div className="text-center py-8">
      <Icon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="glass rounded-xl overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border/50">
          <TabsList className="w-full h-auto p-1 bg-transparent rounded-none justify-start gap-1 overflow-x-auto">
            <TabsTrigger
              value="trainings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-sm gap-1.5"
            >
              <Dumbbell className="w-4 h-4" />
              <span>Tréninky</span>
              {trainings && trainings.length > 0 && (
                <span className="text-xs opacity-70">({trainings.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="feedback"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-sm gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Feedback</span>
            </TabsTrigger>
            <TabsTrigger
              value="nutrition"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-sm gap-1.5"
            >
              <Utensils className="w-4 h-4" />
              <span>Strava</span>
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2 text-sm gap-1.5"
            >
              <StickyNote className="w-4 h-4" />
              <span>Poznámky</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="p-3 max-h-[400px] overflow-y-auto">
          <TabsContent value="trainings" className="m-0 space-y-2">
            {trainingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : trainings && trainings.length > 0 ? (
              trainings.map(item => <HistoryListItem key={item.id} item={item} />)
            ) : (
              <EmptyState icon={Dumbbell} message="Zatím žádné tréninky" />
            )}
          </TabsContent>
          
          <TabsContent value="feedback" className="m-0 space-y-2">
            {feedbackLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : feedback && feedback.length > 0 ? (
              feedback.map(item => <HistoryListItem key={item.id} item={item} />)
            ) : (
              <EmptyState icon={MessageSquare} message="Zatím žádný feedback" />
            )}
          </TabsContent>
          
          <TabsContent value="nutrition" className="m-0 space-y-2">
            {nutritionLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : nutrition && nutrition.length > 0 ? (
              nutrition.map(item => <HistoryListItem key={item.id} item={item} />)
            ) : (
              <EmptyState icon={Utensils} message="Zatím žádné záznamy stravy" />
            )}
          </TabsContent>
          
          <TabsContent value="notes" className="m-0">
            <EmptyState icon={StickyNote} message="Zatím žádné poznámky" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
