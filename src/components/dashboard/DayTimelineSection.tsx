import { useState, memo, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';
import { useUpdateTrainingSession } from '@/hooks/useTrainingSessions';
import { toast } from 'sonner';

interface DayTimelineSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

type ViewMode = 'today' | 'week';

// Apple Calendar style timeline block
const TimelineBlock = memo(function TimelineBlock({ 
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
  
  const getStatusClass = () => {
    if (item.status === 'cancelled') return 'timeline-item-cancelled';
    if (item.status === 'completed') {
      if (item.hasIssue) return 'timeline-item-issue';
      return 'timeline-item-completed';
    }
    return 'timeline-item-scheduled';
  };

  const getStatusIcon = () => {
    if (item.status === 'cancelled') return XCircle;
    if (item.status === 'completed') {
      if (item.hasIssue) return AlertCircle;
      return CheckCircle2;
    }
    return Clock;
  };

  const getIconColor = () => {
    if (item.status === 'cancelled') return 'text-muted-foreground/40';
    if (item.status === 'completed') {
      if (item.hasIssue) return 'text-warning/70';
      return 'text-success/70';
    }
    return 'text-accent/70';
  };

  const StatusIcon = getStatusIcon();
  
  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onComplete?.(item.id);
  };
  
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyLink?.(item.id);
  };
  
  return (
    <div className={cn('timeline-item', getStatusClass())}>
      <button
        onClick={() => navigate(`/trainings/${item.id}`)}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <StatusIcon className={cn('w-4 h-4 shrink-0', getIconColor())} />
        
        <div className="flex-1 text-left min-w-0">
          <p className="font-medium text-sm truncate text-foreground">
            {item.clientName}
          </p>
          <p className="text-xs text-muted-foreground">
            {!isCompact && format(item.date, 'EEE', { locale: cs }) + ' · '}
            {item.time}
          </p>
        </div>
        
        {item.status === 'completed' && !item.hasFeedback && (
          <span className="text-[10px] font-medium text-warning/80 px-2 py-0.5 rounded-full bg-warning/10">
            FB
          </span>
        )}
      </button>
      
      {/* Quick Actions - minimal */}
      {item.status === 'scheduled' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleComplete}
          className="h-8 w-8 rounded-full shrink-0 text-success/70 hover:text-success hover:bg-success/10"
        >
          <Check className="w-4 h-4" />
        </Button>
      )}
      
      {item.status === 'completed' && !item.hasFeedback && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopyLink}
          className="h-8 w-8 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Link2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

function EmptyState({ viewMode }: { viewMode: ViewMode }) {
  return (
    <div className="text-center py-12">
      <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
      <p className="text-sm text-muted-foreground">
        {viewMode === 'today' ? 'Žádné tréninky' : 'Tento týden prázdný'}
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
          <button
            onClick={() => navigate('/schedule')}
            className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            +{items.length - 8} další
          </button>
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
        label: format(item.date, 'EEE d.M.', { locale: cs }),
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
            'text-[10px] font-medium uppercase tracking-wider mb-2 px-1',
            day.isToday ? 'text-blue-400' : 'text-muted-foreground/60'
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
              <p className="text-[10px] text-muted-foreground/60 text-center py-1">
                +{day.items.length - 4}
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
      toast.success('Dokončeno');
    } catch (error) {
      console.error('Error completing training:', error);
      toast.error('Chyba');
    }
  };
  
  const handleCopyLink = async (trainingId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: feedbackRequest } = await supabase
        .from('feedback_requests')
        .select('token')
        .eq('training_session_id', trainingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Always use production URL for public feedback links
      const PRODUCTION_FEEDBACK_URL = 'https://justmoveasistent.lovable.app';
      
      if (feedbackRequest?.token) {
        const feedbackUrl = `${PRODUCTION_FEEDBACK_URL}/feedback/${feedbackRequest.token}`;
        await navigator.clipboard.writeText(feedbackUrl);
        toast.success('Zkopírováno');
      } else {
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
          
          const feedbackUrl = `${PRODUCTION_FEEDBACK_URL}/feedback/${newRequest.token}`;
          await navigator.clipboard.writeText(feedbackUrl);
          toast.success('Vytvořeno a zkopírováno');
        }
      }
    } catch (error) {
      console.error('Error copying feedback link:', error);
      toast.error('Chyba');
    }
  };
  
  if (isLoading) {
    return (
      <div className="premium-layer p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const items = viewMode === 'today' ? data.todaySchedule : data.weekSchedule;

  return (
    <div className="premium-layer p-4">
      {/* Header - minimal */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-foreground">Klienti</span>
        
        {/* Segmented control - Apple style */}
        <div className="flex rounded-lg bg-secondary/30 p-0.5">
          <button
            onClick={() => setViewMode('today')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all duration-150',
              viewMode === 'today' 
                ? 'bg-background/80 text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Dnes
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-all duration-150',
              viewMode === 'week' 
                ? 'bg-background/80 text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Týden
          </button>
        </div>
      </div>
      
      {/* Timeline */}
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
    </div>
  );
}
