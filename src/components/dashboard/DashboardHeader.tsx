import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
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

const statusGlow: Record<DayStatus, string> = {
  ok: '',
  warning: 'shadow-[0_0_12px_hsl(38_80%_50%/0.4)]',
  critical: 'shadow-[0_0_12px_hsl(0_70%_50%/0.5)]',
};

export function DashboardHeader({ data, isLoading }: DashboardHeaderProps) {
  if (isLoading) {
    return (
      <div className="mb-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>
    );
  }
  
  if (!data) return null;
  
  const { dayStatus } = data;
  const today = new Date();
  
  return (
    <div className="mb-6">
      {/* Large date display */}
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-3 h-3 rounded-full',
          statusColors[dayStatus],
          statusGlow[dayStatus]
        )} />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {format(today, 'EEEE', { locale: cs })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(today, 'd. MMMM yyyy', { locale: cs })}
          </p>
        </div>
      </div>
    </div>
  );
}
