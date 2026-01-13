import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AnalyticsCard } from './AnalyticsCard';
import { Activity } from 'lucide-react';
import type { RpeTimelinePoint } from '@/hooks/useExerciseAnalyticsComplete';

interface RpeTimelineCardProps {
  data: RpeTimelinePoint[];
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Intenzita (RPE) v čase',
  description: 'Vývoj průměrného RPE po týdnech. Pomáhá sledovat únavu a plánovat deload.',
  calculation: 'Průměr RPE hodnot (1-10) za každý týden',
};

// RPE zones for legend
const RPE_ZONES = [
  { range: '1-4', label: 'Nízká', color: 'bg-green-500' },
  { range: '5-6', label: 'Střední', color: 'bg-yellow-500' },
  { range: '7-8', label: 'Vysoká', color: 'bg-orange-500' },
  { range: '9-10', label: 'Max', color: 'bg-red-500' },
];

export function RpeTimelineCard({ data, isLoading }: RpeTimelineCardProps) {
  const isEmpty = !data || data.every(d => d.avgRpe === 0);
  
  // Calculate overall average
  const validData = data.filter(d => d.avgRpe > 0);
  const overallAvg = validData.length > 0 
    ? validData.reduce((sum, d) => sum + d.avgRpe, 0) / validData.length 
    : null;

  return (
    <AnalyticsCard
      title="Intenzita (RPE)"
      icon={Activity}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Žádná RPE data za zvolené období"
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
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
              domain={[0, 10]}
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              ticks={[0, 5, 7, 10]}
              width={25}
            />
            <ReferenceLine 
              y={7} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [value.toFixed(1), 'RPE']}
              labelFormatter={(label) => `Týden ${label}`}
            />
            <Area
              type="monotone"
              dataKey="avgRpe"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              fill="url(#rpeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* RPE Zones Legend */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {RPE_ZONES.map((zone) => (
          <div key={zone.range} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${zone.color}`} />
            <span className="text-[10px] text-muted-foreground">{zone.range}</span>
          </div>
        ))}
        {overallAvg && (
          <span className="text-xs text-muted-foreground ml-auto">
            Ø <span className="font-medium text-foreground">{overallAvg.toFixed(1)}</span>
          </span>
        )}
      </div>
    </AnalyticsCard>
  );
}
