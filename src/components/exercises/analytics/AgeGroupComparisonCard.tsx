import { AnalyticsCard } from './AnalyticsCard';
import { Calendar } from 'lucide-react';
import type { AgeGroupStats } from '@/hooks/useExerciseAnalyticsComplete';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: AgeGroupStats[];
  isLoading: boolean;
}

export function AgeGroupComparisonCard({ data, isLoading }: Props) {
  const totalClients = data.reduce((s, d) => s + d.clientCount, 0);

  return (
    <AnalyticsCard
      title="Srovnání podle věku"
      icon={Calendar}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Žádní klienti s vyplněným datem narození"
      helpContent={{
        title: 'Srovnání podle věku',
        description: `Statistiky rozdělené do věkových skupin. Data dostupná pro ${totalClients} klientů.`,
      }}
    >
      <div className="space-y-2">
        {totalClients > 0 && totalClients < 10 && (
          <p className="text-xs text-muted-foreground">Data pro {totalClients} klientů s vyplněným datem narození</p>
        )}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ left: -10, right: 10 }}>
            <XAxis dataKey="ageGroup" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = { avgWeight: 'Ø váha', maxWeight: 'Max váha', prCount: 'PR' };
                return [value, labels[name] || name];
              }}
            />
            <Legend formatter={(v) => ({ avgWeight: 'Ø váha', maxWeight: 'Max váha', prCount: 'PR' }[v] || v)} />
            <Bar dataKey="avgWeight" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} barSize={14} />
            <Bar dataKey="maxWeight" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={14} />
            <Bar dataKey="prCount" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
