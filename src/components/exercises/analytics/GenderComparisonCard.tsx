import { AnalyticsCard } from './AnalyticsCard';
import { Users } from 'lucide-react';
import type { GenderComparison } from '@/hooks/useExerciseAnalyticsComplete';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: GenderComparison;
  isLoading: boolean;
}

export function GenderComparisonCard({ data, isLoading }: Props) {
  const isEmpty = data.male.entryCount === 0 && data.female.entryCount === 0;

  const chartData = [
    { metric: 'Ø váha', Muži: data.male.avgWeight, Ženy: data.female.avgWeight },
    { metric: 'Max', Muži: data.male.maxWeight, Ženy: data.female.maxWeight },
    { metric: 'PR', Muži: data.male.prCount, Ženy: data.female.prCount },
  ];

  const tonnageData = [
    { metric: 'Tonnage (t)', Muži: Math.round(data.male.tonnage / 1000), Ženy: Math.round(data.female.tonnage / 1000) },
  ];

  return (
    <AnalyticsCard
      title="Srovnání podle pohlaví"
      icon={Users}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Žádná data s přiřazeným pohlavím"
      helpContent={{
        title: 'Srovnání podle pohlaví',
        description: 'Průměrné a maximální váhy, PR a objem tréninků rozdělené podle pohlaví klientů.',
      }}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div className="rounded-lg bg-chart-1/10 p-2">
            <span className="text-muted-foreground">Muži</span>
            <p className="text-lg font-semibold text-chart-1">{data.male.clientCount}</p>
            <span className="text-muted-foreground">{data.male.entryCount} záznamů</span>
          </div>
          <div className="rounded-lg bg-chart-4/10 p-2">
            <span className="text-muted-foreground">Ženy</span>
            <p className="text-lg font-semibold text-chart-4">{data.female.clientCount}</p>
            <span className="text-muted-foreground">{data.female.entryCount} záznamů</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="metric" type="category" tick={{ fontSize: 10 }} width={65} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="Muži" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={12} />
            <Bar dataKey="Ženy" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
