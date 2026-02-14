import { AnalyticsCard } from './AnalyticsCard';
import { Award } from 'lucide-react';
import type { PRDistributionMonth } from '@/hooks/useExerciseAnalyticsComplete';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: PRDistributionMonth[];
  isLoading: boolean;
}

export function PRDistributionCard({ data, isLoading }: Props) {
  return (
    <AnalyticsCard
      title="PR distribuce v čase"
      icon={Award}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Žádné PR v tomto období"
      helpContent={{
        title: 'PR distribuce v čase',
        description: 'Počet osobních rekordů za měsíc, rozděleno podle pohlaví klientů.',
      }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -10, right: 10 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="male" name="Muži" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="female" name="Ženy" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}
