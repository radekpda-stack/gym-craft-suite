import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ComparisonMode } from '@/hooks/useExerciseAnalyticsNew';

interface VolumeDataPoint {
  date: string;
  label: string;
  volume: number;
  volumeComparison?: number;
}

interface VolumeTimelineCardProps {
  data: VolumeDataPoint[];
  totalVolume: number;
  comparisonMode: ComparisonMode;
  onComparisonModeChange: (mode: ComparisonMode) => void;
  isLoading?: boolean;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return `${Math.round(value)}`;
}

export function VolumeTimelineCard({
  data,
  totalVolume,
  comparisonMode,
  onComparisonModeChange,
  isLoading,
}: VolumeTimelineCardProps) {
  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Objem v čase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-medium">Objem v čase</CardTitle>
            <span className="text-xs text-muted-foreground ml-2">
              Celkem: <span className="font-medium text-foreground">{formatVolume(totalVolume)} kg</span>
            </span>
          </div>
          <ToggleGroup
            type="single"
            size="sm"
            value={comparisonMode}
            onValueChange={(v) => v && onComparisonModeChange(v as ComparisonMode)}
            className="h-7"
          >
            <ToggleGroupItem value="client" className="text-xs px-2 h-7">
              Klient
            </ToggleGroupItem>
            <ToggleGroupItem value="all" className="text-xs px-2 h-7">
              Všichni
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
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
              {comparisonMode === 'all' && (
                <Area
                  type="monotone"
                  dataKey="volumeComparison"
                  name="Všichni"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  fill="url(#comparisonGrad)"
                  strokeDasharray="4 4"
                />
              )}
              <Area
                type="monotone"
                dataKey="volume"
                name={comparisonMode === 'client' ? 'Klient' : 'Vybraný'}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#volumeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
