import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DashboardViewModel, DayStatus } from '@/hooks/useDashboardViewModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users, Banknote, TrendingUp, TrendingDown, Minus, BarChart3, Dumbbell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ActivityRing } from '@/components/ui/activity-ring';
import { motion } from 'framer-motion';

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
  ok: 'shadow-[0_0_16px_hsl(142_76%_36%/0.5)]',
  warning: 'shadow-[0_0_16px_hsl(38_92%_50%/0.5)]',
  critical: 'shadow-[0_0_16px_hsl(0_84%_60%/0.6)]',
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

// Premium Metric Card component
const MetricCard = ({ 
  icon: Icon, 
  value, 
  label, 
  trend 
}: { 
  icon: React.ElementType; 
  value: string | number; 
  label: string; 
  trend?: { current: number; previous: number };
}) => (
  <motion.div 
    className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 min-w-[70px]"
    whileHover={{ y: -2 }}
    transition={{ duration: 0.15 }}
  >
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      {trend && (
        <TrendIndicator current={trend.current} previous={trend.previous} />
      )}
    </div>
    <span className="text-lg font-bold tracking-tight text-foreground">{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
  </motion.div>
);

export function DashboardHeader({ data, isLoading }: DashboardHeaderProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 w-20 rounded-xl shrink-0" />
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
  
  return (
    <div className="mb-3 space-y-3">
      {/* Greeting + Date + Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Status dot with glow */}
          <div className={cn(
            'w-3 h-3 rounded-full shrink-0 animate-pulse',
            statusColors[dayStatus],
            statusGlow[dayStatus]
          )} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{greeting}</p>
            <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
              {format(today, 'EEEE', { locale: cs })}, {format(today, 'd. MMMM', { locale: cs })}
            </h1>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/training-mode')}
            className="h-9 px-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/30 transition-all"
          >
            <Dumbbell className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary hidden sm:inline">Trénink</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 px-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all"
          >
            <Link to="/statistics">
              <BarChart3 className="w-4 h-4 text-muted-foreground mr-2" />
              <span className="text-sm font-medium text-foreground/80 hidden sm:inline">Statistiky</span>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Premium Instrument Metrics */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {/* Capacity with Activity Ring */}
        <motion.div 
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 min-w-[80px]"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
        >
          <ActivityRing 
            progress={capacityProgress} 
            size="sm" 
            color={dayStatus === 'ok' ? 'success' : dayStatus === 'warning' ? 'warning' : 'destructive'}
            showPercentage={false}
          />
          <span className="text-sm font-bold tracking-tight text-foreground">
            {capacity.completed}/{capacity.total}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Kapacita</span>
        </motion.div>
        
        {/* Unique clients */}
        <MetricCard 
          icon={Users} 
          value={uniqueClientsToday} 
          label="Klienti" 
        />
        
        {/* Expected income */}
        <MetricCard 
          icon={Banknote} 
          value={formatCurrency(todayEstimatedIncome)} 
          label="Příjem"
          trend={{ current: weeklySummary.incomeThisWeek, previous: weeklySummary.incomeLastWeek }}
        />
        
        {/* Weekly trainings with trend */}
        <MetricCard 
          icon={Calendar} 
          value={weeklySummary.trainingsThisWeek} 
          label="Týden"
          trend={{ current: weeklySummary.trainingsThisWeek, previous: weeklySummary.trainingsLastWeek }}
        />
      </div>
    </div>
  );
}
