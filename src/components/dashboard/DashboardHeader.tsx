import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Banknote, TrendingUp, TrendingDown, Minus, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ActivityRing } from '@/components/ui/activity-ring';
import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

const statusGradients: Record<DayStatus, string> = {
  ok: 'from-success to-success/60',
  warning: 'from-warning to-warning/60',
  critical: 'from-destructive to-destructive/60',
};

const statusGlow: Record<DayStatus, string> = {
  ok: 'shadow-[0_0_20px_hsl(142_76%_36%/0.4)]',
  warning: 'shadow-[0_0_20px_hsl(38_92%_50%/0.4)]',
  critical: 'shadow-[0_0_20px_hsl(0_84%_60%/0.5)]',
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
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  }
  if (current > previous) {
    return <TrendingUp className="w-3.5 h-3.5 text-success" />;
  }
  return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
};

export function DashboardHeader({ data, isLoading }: DashboardHeaderProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/30">
          <Skeleton className="h-1.5 w-full rounded-full mb-4" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const { dayStatus, capacity, todayEstimatedIncome, uniqueClientsToday, weeklySummary } = data;
  const today = new Date();
  const greeting = getGreeting();
  const capacityProgress = capacity.total > 0 ? Math.round((capacity.completed / capacity.total) * 100) : 0;
  
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'decimal', 
      maximumFractionDigits: 0 
    }).format(value);
  };

  const incomeChange = weeklySummary.incomeLastWeek > 0 
    ? Math.round(((weeklySummary.incomeThisWeek - weeklySummary.incomeLastWeek) / weeklySummary.incomeLastWeek) * 100)
    : 0;
  
  return (
    <div className="space-y-4">
      {/* Premium Hero Card with Status Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative overflow-hidden rounded-2xl p-4",
          "bg-card/80 backdrop-blur-md border border-border/30",
          statusGlow[dayStatus]
        )}
      >
        {/* Status Gradient Bar */}
        <div className="relative h-1.5 rounded-full overflow-hidden bg-muted/30 mb-4">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={cn(
              "h-full rounded-full bg-gradient-to-r",
              statusGradients[dayStatus]
            )}
          />
          {dayStatus === 'ok' && (
            <div className="absolute inset-0 bg-success/20 animate-pulse rounded-full" />
          )}
        </div>

        {/* Greeting + Date + Action */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {greeting}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {format(today, 'EEEE', { locale: cs })}, {format(today, 'd. MMMM', { locale: cs })}
            </h1>
          </div>
          
          <Button
            onClick={() => navigate('/training-mode')}
            className={cn(
              "shrink-0 h-10 px-4 rounded-xl font-semibold",
              "bg-primary hover:bg-primary/90",
              "shadow-lg shadow-primary/25",
              "transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            )}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Trénink</span>
          </Button>
        </div>
      </motion.div>
      
      {/* Premium Metric Instruments - Large Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Capacity Card with Activity Ring */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className={cn(
            "relative p-3 sm:p-4 rounded-2xl",
            "bg-card/80 backdrop-blur-md border border-border/30",
            "transition-all duration-200 hover:shadow-lg"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <ActivityRing 
                progress={capacityProgress} 
                size="lg" 
                color={dayStatus === 'ok' ? 'success' : dayStatus === 'warning' ? 'warning' : 'destructive'}
                showPercentage={false}
                strokeWidth={6}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold tabular-nums leading-none">
                  {capacity.completed}
                </span>
                <span className="text-xs text-muted-foreground">/{capacity.total}</span>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Kapacita
              </p>
              <p className="text-xs font-medium text-foreground/80">
                {capacityProgress}% využito
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Clients Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className={cn(
            "relative p-3 sm:p-4 rounded-2xl",
            "bg-card/80 backdrop-blur-md border border-border/30",
            "transition-all duration-200 hover:shadow-lg"
          )}
        >
          <div className="flex flex-col items-center gap-2 h-full justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
                {uniqueClientsToday}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Klientů dnes
              </p>
            </div>
          </div>
        </motion.div>
        
        {/* Income Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className={cn(
            "relative p-3 sm:p-4 rounded-2xl",
            "bg-card/80 backdrop-blur-md border border-border/30",
            "transition-all duration-200 hover:shadow-lg"
          )}
        >
          <div className="flex flex-col items-center gap-2 h-full justify-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-success/10 flex items-center justify-center">
              <Banknote className="w-6 h-6 sm:w-7 sm:h-7 text-success" />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <p className="text-xl sm:text-2xl font-bold tabular-nums text-foreground">
                  {formatCurrency(todayEstimatedIncome)}
                </p>
                <span className="text-sm text-muted-foreground">Kč</span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <TrendIndicator 
                  current={weeklySummary.incomeThisWeek} 
                  previous={weeklySummary.incomeLastWeek} 
                />
                <span className={cn(
                  "text-xs font-medium",
                  incomeChange > 0 ? "text-success" : incomeChange < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {incomeChange > 0 ? '+' : ''}{incomeChange}%
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">
                Dnešní příjem
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
