import { AnalyticsCard } from './AnalyticsCard';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExerciseRpeRanking } from '@/hooks/useExerciseAnalyticsComplete';

interface RPEByExerciseCardProps {
  data: ExerciseRpeRanking[];
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'RPE dle cviku',
  description: 'Žebříček cviků seřazených podle průměrného RPE – ukazuje které pohyby jsou nejnáročnější a které nejlehčí.',
  calculation: 'Průměrné RPE ze všech záznamů daného cviku (min. 3 záznamy s RPE)',
};

export function RPEByExerciseCard({ data, isLoading }: RPEByExerciseCardProps) {
  const isEmpty = !data || data.length === 0;
  const top5 = data.slice(0, 5);
  const bottom5 = data.length > 5 ? data.slice(-5).reverse() : [];

  return (
    <AnalyticsCard
      title="RPE dle cviku"
      icon={Activity}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Nedostatek dat s RPE"
    >
      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
        {/* Highest RPE */}
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Nejtěžší</p>
          {top5.map((ex) => (
            <ExerciseRpeBar key={ex.name} item={ex} maxRpe={10} />
          ))}
        </div>

        {/* Lowest RPE */}
        {bottom5.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-medium">Nejlehčí</p>
            {bottom5.map((ex) => (
              <ExerciseRpeBar key={ex.name} item={ex} maxRpe={10} />
            ))}
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}

function ExerciseRpeBar({ item, maxRpe }: { item: ExerciseRpeRanking; maxRpe: number }) {
  const pct = (item.avgRpe / maxRpe) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] truncate w-24 shrink-0 text-foreground">{item.name}</span>
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            item.avgRpe >= 8.5 ? "bg-destructive/60" :
            item.avgRpe >= 7 ? "bg-warning/60" :
            "bg-primary/40"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums font-medium w-8 text-right text-muted-foreground">
        {item.avgRpe}
      </span>
      <span className="text-[8px] text-muted-foreground w-6 text-right">
        ({item.entryCount})
      </span>
    </div>
  );
}
