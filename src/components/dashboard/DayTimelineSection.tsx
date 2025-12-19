import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isSameDay, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { DashboardViewModel, ScheduleItem } from '@/hooks/useDashboardViewModel';

interface DayTimelineSectionProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

type ViewMode = 'today' | 'week';

function TimelineBlock({ item, isCompact = false }: { item: ScheduleItem; isCompact?: boolean }) {
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
  
  return (
    <button
      onClick={() => navigate(`/trainings/${item.id}`)}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
        'hover:scale-[1.01] active:scale-[0.99]',
        config.bg,
        config.border
      )}
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

function TimelineView({ items, viewMode }: { items: ScheduleItem[]; viewMode: ViewMode }) {
  const navigate = useNavigate();
  
  if (viewMode === 'today') {
    // Simple list for today
    return (
      <div className="space-y-2">
        {items.slice(0, 8).map(item => (
          <TimelineBlock key={item.id} item={item} isCompact />
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
              <TimelineBlock key={item.id} item={item} isCompact />
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
          <TimelineView items={items} viewMode={viewMode} />
        ) : (
          <EmptyState viewMode={viewMode} />
        )}
      </CardContent>
    </Card>
  );
}
