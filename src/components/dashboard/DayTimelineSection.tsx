import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Link2,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';
import { useUpdateTrainingSession } from '@/hooks/useTrainingSessions';
import { useFeedbackRequest } from '@/hooks/useFeedbackLink';
import { toast } from 'sonner';

interface DayTimelineSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

type ViewMode = 'today' | 'week';

function TimelineBlock({ 
  item, 
  isCompact = false,
  onComplete,
  onCopyLink,
}: { 
  item: ScheduleItem; 
  isCompact?: boolean;
  onComplete?: (id: string) => void;
  onCopyLink?: (id: string) => void;
}) {
  const navigate = useNavigate();
  
  const getStatusConfig = () => {
    if (item.status === 'cancelled') {
      return {
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        icon: XCircle,
        iconColor: 'text-destructive',
      };
    }
    if (item.status === 'completed') {
      if (item.hasIssue) {
        return {
          bg: 'bg-[hsl(38_92%_50%/0.1)]',
          border: 'border-[hsl(38_92%_50%/0.3)]',
          icon: AlertCircle,
          iconColor: 'text-[hsl(38_92%_50%)]',
        };
      }
      if (!item.hasFeedback) {
        return {
          bg: 'bg-[hsl(38_92%_50%/0.08)]',
          border: 'border-[hsl(38_92%_50%/0.2)]',
          icon: Clock,
          iconColor: 'text-[hsl(38_92%_50%)]',
        };
      }
      return {
        bg: 'bg-[hsl(142_76%_36%/0.08)]',
        border: 'border-[hsl(142_76%_36%/0.2)]',
        icon: CheckCircle2,
        iconColor: 'text-[hsl(142_76%_36%)]',
      };
    }
    // scheduled
    return {
      bg: 'bg-primary/8',
      border: 'border-primary/20',
      icon: Clock,
      iconColor: 'text-primary',
    };
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete?.(item.id);
  };
  
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyLink?.(item.id);
  };
  
  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
        config.bg,
        config.border
      )}
    >
      <button
        onClick={() => navigate(`/trainings/${item.id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
          config.bg
        )}>
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
        
        <div className="flex-1 text-left min-w-0">
          <p className="font-medium text-sm truncate text-foreground">
            {item.clientName}
          </p>
          <p className="text-xs text-muted-foreground">
            {!isCompact && format(item.date, 'EEEE', { locale: cs }) + ' • '}
            {item.time}
          </p>
        </div>
        
        {item.status === 'completed' && !item.hasFeedback && (
          <span className="text-[10px] font-medium text-[hsl(38_92%_50%)] bg-[hsl(38_92%_50%/0.1)] px-2 py-1 rounded-full">
            Bez FB
          </span>
        )}
      </button>
      
      {/* Quick Actions */}
      {item.status === 'scheduled' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleComplete}
          className="shrink-0 h-8 px-2 text-xs gap-1 text-[hsl(142_76%_36%)] hover:text-[hsl(142_76%_36%)] hover:bg-[hsl(142_76%_36%/0.1)]"
        >
          <Check className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hotovo</span>
        </Button>
      )}
      
      {item.status === 'completed' && !item.hasFeedback && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          className="shrink-0 h-8 px-2 text-xs gap-1"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Odkaz</span>
        </Button>
      )}
    </div>
  );
}

function EmptyState({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="text-center py-10">
      <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">
        {viewMode === 'today' ? 'Dnes žádné tréninky' : 'Tento týden žádné tréninky'}
      </p>
    </div>
  );
}

function TimelineView({ 
  items, 
  viewMode,
  onComplete,
  onCopyLink,
}: { 
  items: ScheduleItem[]; 
  viewMode: ViewMode;
  onComplete?: (id: string) => void;
  onCopyLink?: (id: string) => void;
}) {
  const navigate = useNavigate();
  
  if (viewMode === 'today') {
    // Simple list for today
    return (
      <div className="space-y-2">
        {items.slice(0, 8).map(item => (
          <TimelineBlock 
            key={item.id} 
            item={item} 
            isCompact 
            onComplete={onComplete}
            onCopyLink={onCopyLink}
          />
        ))}
        {items.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => navigate('/calendar')}
          >
            Zobrazit všechny ({items.length})
          </Button>
        )}
      </div>
    );
  }
  
  // Group by day for week view
  const groupedByDay = items.reduce((acc, item) => {
    const dayKey = format(item.date, 'yyyy-MM-dd');
    if (!acc[dayKey]) {
      acc[dayKey] = {
        date: item.date,
        label: format(item.date, 'EEEE d.M.', { locale: cs }),
        isToday: isSameDay(item.date, new Date()),
        items: [],
      };
    }
    acc[dayKey].items.push(item);
    return acc;
  }, {} as Record<string, { date: Date; label: string; isToday: boolean; items: ScheduleItem[] }>);
  
  const days = Object.values(groupedByDay).sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );
  
  return (
    <div className="space-y-4">
      {days.map(day => (
        <div key={day.label}>
          <div className={cn(
            'text-xs font-semibold uppercase tracking-wider mb-2 px-1',
            day.isToday ? 'text-primary' : 'text-muted-foreground'
          )}>
            {day.isToday ? 'Dnes' : day.label}
          </div>
          <div className="space-y-2">
            {day.items.slice(0, 4).map(item => (
              <TimelineBlock 
                key={item.id} 
                item={item} 
                isCompact 
                onComplete={onComplete}
                onCopyLink={onCopyLink}
              />
            ))}
            {day.items.length > 4 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{day.items.length - 4} další
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DayTimelineSection({ data, isLoading }: DayTimelineSectionProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const updateTraining = useUpdateTrainingSession();
  
  const handleComplete = async (trainingId: string) => {
    try {
      await updateTraining.mutateAsync({
        id: trainingId,
        input: { status: 'completed' },
      });
      toast.success('Trénink označen jako dokončený');
    } catch (error) {
      console.error('Error completing training:', error);
      toast.error('Nepodařilo se dokončit trénink');
    }
  };
  
  const handleCopyLink = async (trainingId: string) => {
    try {
      // Create feedback link
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: feedbackRequest } = await supabase
        .from('feedback_requests')
        .select('token')
        .eq('training_session_id', trainingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (feedbackRequest?.token) {
        const feedbackUrl = `${window.location.origin}/feedback/${feedbackRequest.token}`;
        await navigator.clipboard.writeText(feedbackUrl);
        toast.success('Odkaz zkopírován do schránky');
      } else {
        // Create new feedback request
        const { data: training } = await supabase
          .from('training_sessions')
          .select('client_id')
          .eq('id', trainingId)
          .single();
        
        if (training?.client_id) {
          const { data: newRequest, error } = await supabase
            .from('feedback_requests')
            .insert({
              training_session_id: trainingId,
              client_id: training.client_id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select('token')
            .single();
          
          if (error) throw error;
          
          const feedbackUrl = `${window.location.origin}/feedback/${newRequest.token}`;
          await navigator.clipboard.writeText(feedbackUrl);
          toast.success('Odkaz vytvořen a zkopírován do schránky');
        }
      }
    } catch (error) {
      console.error('Error copying feedback link:', error);
      toast.error('Nepodařilo se zkopírovat odkaz');
    }
  };
  
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const items = viewMode === 'today' ? data.todaySchedule : data.weekSchedule;

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
        {items.length > 0 ? (
          <TimelineView 
            items={items} 
            viewMode={viewMode} 
            onComplete={handleComplete}
            onCopyLink={handleCopyLink}
          />
        ) : (
          <EmptyState viewMode={viewMode} />
        )}
      </CardContent>
    </Card>
  );
}
