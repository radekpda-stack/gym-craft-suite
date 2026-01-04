import { Card } from '@/components/ui/card';
import { CalendarDays, TrendingUp, Dumbbell, Target } from 'lucide-react';

interface TrainingHeroKPIProps {
  totalTrainings: number;
  trainingsThisMonth: number;
  avgPerWeek: number;
  mostFrequentType: string | null;
}

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
    },
    {
      label: 'Tento měsíc',
      value: trainingsThisMonth,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Průměr/týden',
      value: avgPerWeek.toFixed(1),
      icon: Dumbbell,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Nejčastější typ',
      value: mostFrequentType || '—',
      icon: Target,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="p-3 sm:p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 sm:p-2 rounded-lg ${kpi.bgColor}`}>
              <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              {kpi.label}
            </span>
          </div>
          <p className={`text-xl sm:text-2xl font-bold ${kpi.isText ? 'text-base sm:text-lg' : ''}`}>
            {kpi.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
