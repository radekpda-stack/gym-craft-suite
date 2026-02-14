import { AnalyticsCard } from './AnalyticsCard';
import { Trophy } from 'lucide-react';
import type { TopExerciseByGender } from '@/hooks/useExerciseAnalyticsComplete';

interface Props {
  data: { male: TopExerciseByGender[]; female: TopExerciseByGender[] };
  isLoading: boolean;
}

function ExerciseList({ items, color }: { items: TopExerciseByGender[]; color: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((ex, i) => (
        <div key={ex.name} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium ${color}`}>
              {i + 1}
            </span>
            <span className="truncate">{ex.name}</span>
          </div>
          <span className="font-medium tabular-nums shrink-0 ml-2">{ex.maxWeight} kg</span>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Žádná data</p>
      )}
    </div>
  );
}

export function TopExercisesByGenderCard({ data, isLoading }: Props) {
  const isEmpty = data.male.length === 0 && data.female.length === 0;

  return (
    <AnalyticsCard
      title="Top cviky podle pohlaví"
      icon={Trophy}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Žádná data s přiřazeným pohlavím"
      helpContent={{
        title: 'Top cviky podle pohlaví',
        description: 'Top 5 cviků s nejvyšší maximální váhou, rozdělené podle pohlaví klientů.',
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-medium text-chart-1 mb-2">Muži</h4>
          <ExerciseList items={data.male} color="bg-chart-1/10 text-chart-1" />
        </div>
        <div>
          <h4 className="text-xs font-medium text-chart-4 mb-2">Ženy</h4>
          <ExerciseList items={data.female} color="bg-chart-4/10 text-chart-4" />
        </div>
      </div>
    </AnalyticsCard>
  );
}
