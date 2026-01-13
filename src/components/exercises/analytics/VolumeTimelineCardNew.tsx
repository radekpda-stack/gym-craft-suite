import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalyticsCard } from './AnalyticsCard';
import { Weight } from 'lucide-react';
import type { VolumeTimelinePoint } from '@/hooks/useExerciseAnalyticsComplete';

interface VolumeTimelineCardNewProps {
  data: VolumeTimelinePoint[];
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${Math.round(value)}`;
}

const HELP_CONTENT = {
  title: 'Objem v čase',
  description: 'Vývoj tréninkového objemu (tonnage) po týdnech. Pomáhá sledovat progresivní přetěžování.',
  calculation: 'Objem = Σ (série × opakování × váha) za každý týden',
};

export function VolumeTimelineCardNew({ data, isLoading }: VolumeTimelineCardNewProps) {
  const isEmpty = !data || data.length === 0;
  const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);

  return (
    <AnalyticsCard
      title="Objem v čase"
      icon={Weight}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Žádná data pro zvolené období"
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatVolume}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${formatVolume(value)} kg`, 'Objem']}
              labelFormatter={(label) => `Týden ${label}`}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#volumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Celkem: <span className="font-medium text-foreground">{formatVolume(totalVolume)} kg</span>
      </p>
    </AnalyticsCard>
  );
}
