import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsCard } from './AnalyticsCard';
import type { ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';

interface VolumeDataPoint {
  date: string;
  label: string;
  volume: number;
  volumeComparison?: number;
}

interface VolumeTimelineCardProps {
  data: VolumeDataPoint[];
  comparisonMode: ComparisonMode;
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${Math.round(value)}`;
}

export function VolumeTimelineCard({
  data,
  comparisonMode,
  isLoading,
}: VolumeTimelineCardProps) {
  const isEmpty = !data || data.length === 0 || data.every(d => d.volume === 0);

  return (
    <AnalyticsCard
      title="Celkový objem"
      icon={TrendingUp}
      isLoading={isLoading}
      isEmpty={isEmpty}
      className="md:col-span-2"
    >
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="comparisonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
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
              width={40}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border rounded-lg px-3 py-2 shadow-lg">
                      <p className="font-medium text-xs">{label}</p>
                      {payload.map((p: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          {p.name}: {formatVolume(p.value)} kg
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <AnimatePresence mode="wait">
              {comparisonMode === 'all' && (
                <Area
                  key="comparison"
                  type="monotone"
                  dataKey="volumeComparison"
                  name="Průměr"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  fill="url(#comparisonGrad)"
                  strokeDasharray="4 4"
                  animationDuration={500}
                />
              )}
            </AnimatePresence>
            <Area
              type="monotone"
              dataKey="volume"
              name={comparisonMode === 'client' ? 'Klient' : 'Výběr'}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#volumeGrad)"
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
