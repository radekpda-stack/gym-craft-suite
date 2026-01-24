import { Card } from '@/components/ui/card';
import { CalendarDays, TrendingUp, TrendingDown, Dumbbell, Target } from 'lucide-react';
import { StatInfoTooltip } from './StatInfoTooltip';
import { cn } from '@/lib/utils';

interface TrainingHeroKPIProps {
  totalTrainings: number;
  trainingsThisMonth: number;
  avgPerWeek: number;
  mostFrequentType: string | null;
  // New: trend vs previous period
  trendVsPrevious?: {
    value: number; // percentage change
    label: string; // e.g. "vs minulý měsíc"
  };
}

const TOOLTIPS = {
  total: {
    title: "Celkem tréninků",
    description: "Celkový počet dokončených tréninků ve zvoleném období.",
    calculation: "Počet záznamů v training_sessions se statusem 'completed' v daném časovém rozmezí."
  },
  thisMonth: {
    title: "Tento měsíc",
    description: "Počet dokončených tréninků od začátku aktuálního měsíce.",
    calculation: "Tréninky s datem >= první den aktuálního měsíce."
  },
  avgWeek: {
    title: "Průměr za týden",
    description: "Průměrný počet tréninků za jeden kalendářní týden.",
    calculation: "Celkový počet tréninků ÷ počet týdnů ve zvoleném období."
  },
  frequentType: {
    title: "Nejčastější typ",
    description: "Typ tréninku, který se ve vašem rozvrhu objevuje nejčastěji.",
    calculation: "Typ s nejvyšším počtem výskytů mezi všemi dokončenými tréninky."
  }
};

export function TrainingHeroKPI({
  totalTrainings,
  trainingsThisMonth,
  avgPerWeek,
  mostFrequentType,
  trendVsPrevious,
}: TrainingHeroKPIProps) {
  const kpis = [
    {
      label: 'Celkem tréninků',
      value: totalTrainings,
      icon: CalendarDays,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      tooltip: TOOLTIPS.total,
      trend: trendVsPrevious,
    },
    {
      label: 'Tento měsíc',
      value: trainingsThisMonth,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      tooltip: TOOLTIPS.thisMonth,
    },
    {
      label: 'Průměr/týden',
      value: avgPerWeek.toFixed(1),
      icon: Dumbbell,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20',
      tooltip: TOOLTIPS.avgWeek,
    },
    {
      label: 'Nejčastější typ',
      value: mostFrequentType || '—',
      icon: Target,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      isText: true,
      tooltip: TOOLTIPS.frequentType,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => (
        <Card 
          key={kpi.label} 
          className={cn(
            "p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden border",
            kpi.borderColor
          )}
        >
          {/* Background gradient */}
          <div className={cn("absolute inset-0 opacity-30", `bg-gradient-to-br ${kpi.bgColor} to-transparent`)} />
          
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={cn("p-2 rounded-xl shrink-0", kpi.bgColor)}>
                <kpi.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", kpi.color)} />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground truncate">
                {kpi.label}
              </span>
            </div>
            <StatInfoTooltip
              title={kpi.tooltip.title}
              description={kpi.tooltip.description}
              calculation={kpi.tooltip.calculation}
            />
          </div>
          
          <div className="relative">
            <p className={cn(
              "text-2xl sm:text-3xl font-bold truncate max-w-full",
              kpi.isText ? 'text-base sm:text-lg' : ''
            )}>
              {kpi.value}
            </p>
            
            {/* Trend indicator */}
            {kpi.trend && kpi.trend.value !== 0 && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-1",
                kpi.trend.value > 0 ? "text-success" : "text-destructive"
              )}>
                {kpi.trend.value > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {kpi.trend.value > 0 ? '+' : ''}{kpi.trend.value}% {kpi.trend.label}
                </span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
