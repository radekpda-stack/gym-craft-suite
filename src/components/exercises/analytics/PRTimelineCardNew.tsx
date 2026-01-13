import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalyticsCard } from './AnalyticsCard';
import { Trophy } from 'lucide-react';
import type { PRTimelinePoint } from '@/hooks/useExerciseAnalyticsComplete';

interface PRTimelineCardNewProps {
  data: PRTimelinePoint[];
  isLoading?: boolean;
}

const HELP_CONTENT = {
  title: 'Trend osobních rekordů',
  description: 'Sloupcový graf ukazuje počet nových PR za týden, linka kumulativní součet.',
  calculation: 'Počítají se záznamy s is_pr = true',
};

export function PRTimelineCardNew({ data, isLoading }: PRTimelineCardNewProps) {
  const isEmpty = !data || data.length === 0;
  const totalPRs = data.length > 0 ? data[data.length - 1]?.cumulative || 0 : 0;

  return (
    <AnalyticsCard
      title="PR trend"
      icon={Trophy}
      helpContent={HELP_CONTENT}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="Žádné PR za zvolené období"
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={30}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                value,
                name === 'count' ? 'Nové PR' : 'Celkem',
              ]}
              labelFormatter={(label) => `Týden ${label}`}
            />
            <Bar
              yAxisId="left"
              dataKey="count"
              fill="hsl(var(--chart-2))"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Celkem PR: <span className="font-medium text-foreground">{totalPRs}</span>
      </p>
    </AnalyticsCard>
  );
}
