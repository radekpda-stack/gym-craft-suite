import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users, Banknote, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DashboardHeaderProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const statusColors: Record<DayStatus, string> = {
  ok: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

const statusGlow: Record<DayStatus, string> = {
  ok: '',
  warning: 'shadow-[0_0_12px_hsl(38_80%_50%/0.4)]',
  critical: 'shadow-[0_0_12px_hsl(0_70%_50%/0.5)]',
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'Dobrou noc';
  if (hour < 12) return 'Dobré ráno';
  if (hour < 18) return 'Dobré odpoledne';
  return 'Dobrý večer';
};

const TrendIndicator = ({ current, previous }: { current: number; previous: number }) => {
  if (current === previous || previous === 0) {
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
  if (current > previous) {
    return <TrendingUp className="w-3 h-3 text-success" />;
  }
  return <TrendingDown className="w-3 h-3 text-destructive" />;
};

export function DashboardHeader({ data, isLoading }: DashboardHeaderProps) {
  if (isLoading) {
    return (
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-16 rounded-lg" />
            <Skeleton className="h-10 w-16 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { dayStatus, capacity, todayEstimatedIncome, uniqueClientsToday, weeklySummary, trends } = data;
  const today = new Date();
  const greeting = getGreeting();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };
  
  return (
    <div className="mb-2 space-y-1">
      {/* Greeting + Date */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0 animate-pulse',
            statusColors[dayStatus],
            statusGlow[dayStatus]
          )} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{greeting}</p>
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">
              {format(today, 'EEEE', { locale: cs })}, {format(today, 'd. MMMM', { locale: cs })}
            </h1>
          </div>
        </div>
      </div>
      
      {/* Quick metrics - now visible on mobile too */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {/* Trainings count with trend */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            {capacity.completed}/{capacity.total}
          </span>
          <TrendIndicator 
            current={weeklySummary.trainingsThisWeek} 
            previous={weeklySummary.trainingsLastWeek} 
          />
        </div>
        
        {/* Unique clients - now visible on mobile */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50 shrink-0">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            {uniqueClientsToday}
          </span>
        </div>
        
        {/* Expected income with trend */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-secondary/50 shrink-0">
          <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            {formatCurrency(todayEstimatedIncome)}
          </span>
          <TrendIndicator 
            current={weeklySummary.incomeThisWeek} 
            previous={weeklySummary.incomeLastWeek} 
          />
        </div>
      </div>
    </div>
  );
}
