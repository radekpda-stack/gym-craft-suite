import { Card } from '@/components/ui/card';
import { CalendarDays, TrendingUp, Dumbbell, Target } from 'lucide-react';
import { StatInfoTooltip } from './StatInfoTooltip';
import { cn } from '@/lib/utils';

interface TrainingHeroKPIProps {
  totalTrainings: number;
  trainingsThisMonth: number;
  avgPerWeek: number;
  mostFrequentType: string | null;
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
    },
    {
      label: 'Tento měsíc',
      value: trainingsThisMonth,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      tooltip: TOOLTIPS.thisMonth,
    },
    {
      label: 'Průměr/týden',
      value: avgPerWeek.toFixed(1),
      icon: Dumbbell,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      tooltip: TOOLTIPS.avgWeek,
    },
    {
      label: 'Nejčastější typ',
      value: mostFrequentType || '—',
      icon: Target,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
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
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-xl", kpi.bgColor)}>
                <kpi.icon className={cn("h-4 w-4 sm:h-5 sm:w-5", kpi.color)} />
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {kpi.label}
              </span>
            </div>
            <StatInfoTooltip
              title={kpi.tooltip.title}
              description={kpi.tooltip.description}
              calculation={kpi.tooltip.calculation}
            />
          </div>
          
          <p className={cn(
            "relative text-2xl sm:text-3xl font-bold",
            kpi.isText ? 'text-lg sm:text-xl' : ''
          )}>
            {kpi.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
