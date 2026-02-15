import { AnalyticsCard } from './AnalyticsCard';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface ClientWeeklyWeight {
  clientName: string;
  weeks: { label: string; avgWeight: number }[];
}

interface Props {
  data: ClientWeeklyWeight[];
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ClientWeightProgressionCard({ data, isLoading }: Props) {
  // Merge all weeks into a single dataset
  const allLabels = [...new Set(data.flatMap(d => d.weeks.map(w => w.label)))];
  const chartData = allLabels.map(label => {
    const point: Record<string, any> = { label };
    data.forEach(d => {
      const week = d.weeks.find(w => w.label === label);
      point[d.clientName] = week?.avgWeight || null;
    });
    return point;
  });

  return (
    <AnalyticsCard
      title="Progrese vah klientů"
      icon={TrendingUp}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Nedostatek dat"
      helpContent={{
        title: 'Progrese vah klientů',
        description: 'Týdenní průměrná váha top 5 klientů — ukazuje posuny klientů v čase.',
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ left: -10, right: 10 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" kg" />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.map((d, i) => (
            <Line
              key={d.clientName}
              type="monotone"
              dataKey={d.clientName}
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
