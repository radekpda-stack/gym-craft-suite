import { useState } from 'react';
import { 
  BarChart3,
  Dumbbell,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CalendarX,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { DashboardViewModel } from '@/hooks/useDashboardViewModel';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { StatDetailModal } from './StatDetailModal';

interface UnifiedQuickStatsProps {
  data: DashboardViewModel | undefined;
  isLoading: boolean;
}

type StatId = 'trainings' | 'income' | 'unpaid' | 'cancellations';

function TrendIcon({ value, className }: { value: number; className?: string }) {
  if (value > 0) return <TrendingUp className={cn('w-3 h-3', className)} />;
  if (value < 0) return <TrendingDown className={cn('w-3 h-3', className)} />;
  return null;
}

export function UnifiedQuickStats({ data, isLoading }: UnifiedQuickStatsProps) {
  const [activeModal, setActiveModal] = useState<StatId | null>(null);
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();

  if (isLoading || kpisLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !kpis) return null;

  const { weeklySummary, trends } = data;

  const getWeekChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const trainingsWeekChange = getWeekChangePercent(weeklySummary.trainingsThisWeek, weeklySummary.trainingsLastWeek);
  const incomeWeekChange = getWeekChangePercent(weeklySummary.incomeThisWeek, weeklySummary.incomeLastWeek);

  const stats = [
    {
      id: 'trainings' as StatId,
      icon: Dumbbell,
      label: 'Tréninky',
      weekValue: weeklySummary.trainingsThisWeek,
      weekChange: trainingsWeekChange,
      monthValue: trends.trainingsThisMonth,
      monthChange: trends.trainingsChange,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      id: 'income' as StatId,
      icon: Wallet,
      label: 'Příjem',
      weekValue: formatCurrency(weeklySummary.incomeThisWeek),
      weekChange: incomeWeekChange,
      monthValue: formatCurrency(trends.incomeThisMonth),
      monthChange: trends.incomeChange,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      id: 'cancellations' as StatId,
      icon: CalendarX,
      label: 'Zrušeno',
      weekValue: kpis?.totalCancellations || 0,
      weekChange: 0,
      monthValue: `${trends.cancellationRate}%`,
      monthChange: 0,
      color: (kpis?.lateCancellations || 0) > 0 ? 'text-destructive' : 'text-muted-foreground',
      bgColor: (kpis?.lateCancellations || 0) > 0 ? 'bg-destructive/10' : 'bg-secondary/30',
      invertTrend: true,
    },
    {
      id: 'unpaid' as StatId,
      icon: AlertTriangle,
      label: 'Nezaplaceno',
      weekValue: kpis?.unpaidCount || 0,
      weekChange: 0,
      monthValue: formatCurrency(kpis?.unpaidAmount || 0),
      monthChange: 0,
      color: (kpis?.unpaidCount || 0) > 0 ? 'text-amber-500' : 'text-muted-foreground',
      bgColor: (kpis?.unpaidCount || 0) > 0 ? 'bg-amber-500/10' : 'bg-secondary/30',
      warning: (kpis?.unpaidCount || 0) > 0,
    },
  ];

  return (
    <>
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Přehled
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(stat => (
              <button
                key={stat.id}
                onClick={() => setActiveModal(stat.id)}
                className={cn(
                  'flex flex-col items-start p-3 rounded-xl text-left transition-all',
                  'hover:scale-[1.02] active:scale-[0.99]',
                  stat.bgColor,
                  stat.warning && 'ring-1 ring-amber-500/30'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                
                {/* Week row */}
                <div className="flex items-baseline gap-1.5 w-full">
                  <span className="text-lg font-bold text-foreground">{stat.weekValue}</span>
                  {stat.weekChange !== 0 && (
                    <span className={cn(
                      'flex items-center gap-0.5 text-[10px] font-medium',
                      (stat.invertTrend ? stat.weekChange <= 0 : stat.weekChange > 0) 
                        ? 'text-emerald-500' 
                        : 'text-destructive'
                    )}>
                      <TrendIcon value={stat.weekChange} />
                      {stat.weekChange > 0 ? '+' : ''}{stat.weekChange}%
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">tento týden</span>
                
                {/* Month row */}
                <div className="flex items-baseline gap-1.5 mt-1.5 pt-1.5 border-t border-border/30 w-full">
                  <span className="text-sm font-medium text-muted-foreground">{stat.monthValue}</span>
                  {stat.monthChange !== 0 && (
                    <span className={cn(
                      'flex items-center gap-0.5 text-[10px]',
                      (stat.invertTrend ? stat.monthChange <= 0 : stat.monthChange > 0) 
                        ? 'text-emerald-500' 
                        : 'text-destructive'
                    )}>
                      <TrendIcon value={stat.monthChange} />
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/70">tento měsíc</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trainings Modal */}
      <StatDetailModal
        open={activeModal === 'trainings'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Statistiky tréninků"
        icon={Dumbbell}
        mainValue={trends.trainingsThisMonth}
        mainLabel="Tréninků tento měsíc"
        stats={[
          { label: 'Tento týden', value: weeklySummary.trainingsThisWeek },
          { label: 'Minulý týden', value: weeklySummary.trainingsLastWeek },
          { label: 'Minulý měsíc', value: trends.trainingsLastMonth, trend: trends.trainingsChange },
          { label: 'Celkem letos', value: kpis?.trainingsThisYear || 0, highlight: true },
        ]}
      />

      {/* Income Modal */}
      <StatDetailModal
        open={activeModal === 'income'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Přehled příjmů"
        icon={Wallet}
        mainValue={formatCurrency(trends.incomeThisMonth)}
        mainLabel="Příjem tento měsíc"
        stats={[
          { label: 'Tento týden', value: formatCurrency(weeklySummary.incomeThisWeek) },
          { label: 'Minulý týden', value: formatCurrency(weeklySummary.incomeLastWeek) },
          { label: 'Minulý měsíc', value: formatCurrency(trends.incomeLastMonth), trend: trends.incomeChange },
          { label: 'Přijaté kredity', value: formatCurrency(trends.creditsReceived), highlight: true },
        ]}
      />

      {/* Cancellations Modal */}
      <StatDetailModal
        open={activeModal === 'cancellations'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Zrušené tréninky"
        icon={CalendarX}
        mainValue={kpis?.totalCancellations || 0}
        mainLabel="Zrušených tréninků"
        stats={[
          { label: 'Pozdní zrušení', value: kpis?.lateCancellations || 0, highlight: (kpis?.lateCancellations || 0) > 0 },
          { label: 'Míra zrušení', value: `${trends.cancellationRate}%` },
          { label: 'Celkem tréninků', value: trends.totalTrainingsCount },
        ]}
      />

      {/* Unpaid Modal */}
      <StatDetailModal
        open={activeModal === 'unpaid'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Nezaplacené tréninky"
        icon={AlertTriangle}
        mainValue={formatCurrency(kpis?.unpaidAmount || 0)}
        mainLabel={`${kpis?.unpaidCount || 0} nezaplacených tréninků`}
        stats={[
          { label: 'Klientů s dluhem', value: kpis?.unpaidClientsCount || 0 },
          { label: 'Průměr na klienta', value: formatCurrency(kpis?.avgUnpaidPerClient || 0) },
          { label: 'Nejstarší dluh', value: kpis?.oldestUnpaidDays ? `${kpis.oldestUnpaidDays} dní` : '—' },
        ]}
      />
    </>
  );
}
