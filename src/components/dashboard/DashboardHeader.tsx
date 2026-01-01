import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users, Banknote } from 'lucide-react';

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

export function DashboardHeader({ data, isLoading }: DashboardHeaderProps) {
  if (isLoading) {
    return (
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-20 rounded-lg" />
            <Skeleton className="h-12 w-20 rounded-lg" />
            <Skeleton className="h-12 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { dayStatus, capacity, todayEstimatedIncome, uniqueClientsToday } = data;
  const today = new Date();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(value);
  };
  
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between gap-4">
        {/* Date section */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            statusColors[dayStatus],
            statusGlow[dayStatus]
          )} />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              {format(today, 'EEEE', { locale: cs })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(today, 'd. MMMM', { locale: cs })}
            </p>
          </div>
        </div>
        
        {/* Quick metrics */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Trainings count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {capacity.completed}/{capacity.total}
            </span>
          </div>
          
          {/* Unique clients */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {uniqueClientsToday}
            </span>
          </div>
          
          {/* Expected income */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50">
            <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {formatCurrency(todayEstimatedIncome)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
