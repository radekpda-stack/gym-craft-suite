/**
 * TrainingSummaryStats - Mini statistics for training
 */
import { Dumbbell, Layers, Weight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingSummaryStatsProps {
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  rpe?: number | null;
  className?: string;
}

export function TrainingSummaryStats({
  exerciseCount,
  setCount,
  totalVolume,
  rpe,
  className,
}: TrainingSummaryStatsProps) {
  const stats = [
    {
      icon: Dumbbell,
      value: exerciseCount,
      label: 'cviků',
    },
    {
      icon: Layers,
      value: setCount,
      label: 'sérií',
    },
    {
      icon: Weight,
      value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}t` : '—',
      label: 'objem',
    },
  ];

  return (
    <div className={cn('flex items-center justify-around py-3', className)}>
      {stats.map((stat, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <stat.icon className="w-4 h-4 text-muted-foreground mb-0.5" />
          <span className="text-lg font-bold text-foreground">{stat.value}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</span>
        </div>
      ))}
      {rpe && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-muted-foreground mb-0.5">RPE</span>
          <span className="text-lg font-bold text-foreground">{rpe}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">náročnost</span>
        </div>
      )}
    </div>
  );
}
