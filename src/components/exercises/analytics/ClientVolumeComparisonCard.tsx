import { AnalyticsCard } from './AnalyticsCard';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface ClientVolume {
  clientId: string;
  clientName: string;
  totalVolume: number;
}

interface Props {
  data: ClientVolume[];
  isLoading: boolean;
}

export function ClientVolumeComparisonCard({ data, isLoading }: Props) {
  const chartData = data.slice(0, 10).map(d => ({
    name: d.clientName.length > 12 ? d.clientName.slice(0, 12) + '…' : d.clientName,
    fullName: d.clientName,
    volume: Math.round(d.totalVolume / 1000), // in tonnes
  }));

  return (
    <AnalyticsCard
      title="Objem dle klienta"
      icon={BarChart3}
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="Žádná data"
      helpContent={{
        title: 'Objem dle klienta',
        description: 'Celkový objem zátěže (tun) za zvolené období pro každého klienta.',
        calculation: 'Objem = Σ (série × opakování × váha kg) / 1000',
      }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} unit=" t" />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
            formatter={(value: number) => [`${value} t`, 'Objem']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
          />
          <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}
