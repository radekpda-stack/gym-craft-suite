import { AnalyticsCard } from './AnalyticsCard';
import { Grid3X3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ExerciseClientEntry {
  exerciseName: string;
  clients: { name: string; count: number; maxWeight: number | null }[];
}

interface Props {
  data: ExerciseClientEntry[];
  isLoading: boolean;
}

export function ExercisePopularityByClientCard({ data, isLoading }: Props) {
  return (
    <AnalyticsCard
      title="Cviky × klienti"
      icon={Grid3X3}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Žádná data"
      helpContent={{
        title: 'Cviky × klienti',
        description: 'Jaký cvik u kterého klienta a jak často, s max váhou.',
      }}
    >
      <ScrollArea className="h-[260px]">
        <div className="space-y-3">
          {data.slice(0, 15).map((ex) => (
            <div key={ex.exerciseName}>
              <p className="text-xs font-medium text-foreground mb-1">{ex.exerciseName}</p>
              <div className="flex flex-wrap gap-1">
                {ex.clients.map((c) => (
                  <span
                    key={c.name}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 border border-border/30 text-muted-foreground"
                  >
                    {c.name} <span className="font-medium text-foreground">{c.count}×</span>
                    {c.maxWeight != null && <span className="ml-0.5 text-primary">({c.maxWeight}kg)</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </AnalyticsCard>
  );
}
