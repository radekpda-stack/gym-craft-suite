import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { LayoutGrid } from 'lucide-react';
import { AnalyticsCard } from './AnalyticsCard';

interface LoadDistributionItem {
  group: string;
  label: string;
  value: number;
  comparisonValue: number;
}

interface LoadDistributionCardProps {
  data: LoadDistributionItem[];
  isLoading?: boolean;
  helpText?: string;
}

export function LoadDistributionCard({ data, isLoading, helpText }: LoadDistributionCardProps) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.value === 0 && d.comparisonValue === 0);

  const legend = (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span>Výběr</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
        <span>Průměr</span>
      </div>
    </div>
  );

  return (
    <AnalyticsCard
      title="Rozložení zátěže"
      icon={LayoutGrid}
      isLoading={isLoading}
      isEmpty={isEmpty}
      actions={legend}
      helpText={helpText}
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            barCategoryGap="20%"
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              hide
            />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              width={70}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                      <p className="font-medium text-xs">{d.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Výběr: {d.value}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Průměr: {d.comparisonValue}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="comparisonValue"
              fill="hsl(var(--muted-foreground))"
              opacity={0.3}
              radius={[0, 4, 4, 0]}
              barSize={8}
              animationDuration={500}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              barSize={8}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
