import { AnalyticsCard } from './AnalyticsCard';
import { TrendingUp } from 'lucide-react';
import type { WeightProgressionExercise } from '@/hooks/useExerciseAnalyticsComplete';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: WeightProgressionExercise[];
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function WeightProgressionCard({ data, isLoading }: Props) {
  if (data.length === 0 && !isLoading) return null;

  // Merge all weeks into unified timeline
  const allLabels = new Set<string>();
  data.forEach(ex => ex.weeks.forEach(w => allLabels.add(w.label)));
  const sortedLabels = Array.from(allLabels);

  const chartData = sortedLabels.map(label => {
    const point: Record<string, any> = { label };
    data.forEach(ex => {
      const week = ex.weeks.find(w => w.label === label);
      point[ex.exerciseName] = week?.avgWeight || null;
    });
    return point;
  });

  return (
    <AnalyticsCard
      title="Progrese vah v čase"
      icon={TrendingUp}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      helpContent={{
        title: 'Progrese vah v čase',
        description: 'Průměrná váha po týdnech u top 5 nejpoužívanějších cviků. Ukazuje trendy zlepšení nebo stagnace.',
      }}
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" kg" />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 10, lineHeight: '16px' }} formatter={(value: string) => value.length > 18 ? value.slice(0, 16) + '…' : value} />
          {data.map((ex, i) => (
            <Line
              key={ex.exerciseName}
              type="monotone"
              dataKey={ex.exerciseName}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}
