import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { TrendingUp, Users, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardHeaderProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const statusColors: Record<DayStatus, string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
};

export function DashboardHeader({ data, isLoading }: DashboardHeaderProps) {
  if (isLoading) {
    return (
      <div className="liquid-glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { capacity, todayEstimatedIncome, dayStatus } = data;
  
  return (
    <div className="liquid-glass rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Date and status */}
        <div className="flex items-center gap-3">
          <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[dayStatus])} />
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {format(new Date(), 'EEEE', { locale: cs })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'd. MMMM yyyy', { locale: cs })}
            </p>
          </div>
        </div>
        
        {/* Key metrics */}
        <div className="flex items-center gap-6">
          {/* Capacity */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {capacity.completed}/{capacity.total}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Tréninky
              </p>
            </div>
          </div>
          
          {/* Income */}
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {todayEstimatedIncome.toLocaleString('cs-CZ')} Kč
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Příjem dnes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
