/**
 * ExerciseProgressGraph - Multi-metric chart with volume bars, RPE overlay, trend line
 */
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceDot, ReferenceLine, Area,
} from 'recharts';
import { ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { Trophy } from 'lucide-react';

interface ExerciseProgressGraphProps {
  history: ExerciseHistoryEntry[];
  metricType: 'weight' | 'time' | 'reps' | 'distance';
}

// Simple linear regression
function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.y || 0 };
  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function getRpeColor(rpe: number | null): string {
  if (!rpe) return 'hsl(var(--primary))';
  if (rpe <= 6) return 'hsl(var(--success))';
  if (rpe <= 8) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export function ExerciseProgressGraph({ history, metricType }: ExerciseProgressGraphProps) {
  const chartData = useMemo(() => {
    const reversed = [...history].reverse();
    return reversed.map((entry, index) => {
      let value = 0;
      switch (metricType) {
        case 'weight': value = entry.weight_kg || 0; break;
        case 'time': value = entry.time_seconds || 0; break;
        case 'reps': value = entry.reps || 0; break;
        case 'distance': value = (entry.distance_meters || entry.height_cm || 0); break;
      }
      
      const volume = (entry.sets || 1) * (entry.reps || 1) * (entry.weight_kg || 0);

      return {
        date: format(parseISO(entry.date), 'd.M', { locale: cs }),
        fullDate: format(parseISO(entry.date), 'd. MMM yyyy', { locale: cs }),
        value,
        volume: volume > 0 ? volume : undefined,
        rpe: entry.rpe,
        rpeColor: getRpeColor(entry.rpe),
        displayValue: entry.displayValue,
        index,
      };
    });
  }, [history, metricType]);

  // Average and trend
  const { average, trendStart, trendEnd } = useMemo(() => {
    if (chartData.length < 2) return { average: 0, trendStart: 0, trendEnd: 0 };
    const avg = chartData.reduce((s, d) => s + d.value, 0) / chartData.length;
    const reg = linearRegression(chartData.map((d, i) => ({ x: i, y: d.value })));
    return {
      average: Math.round(avg * 10) / 10,
      trendStart: Math.round((reg.intercept) * 10) / 10,
      trendEnd: Math.round((reg.slope * (chartData.length - 1) + reg.intercept) * 10) / 10,
    };
  }, [chartData]);

  // Best point
  const bestPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((best, point) => {
      if (metricType === 'time') return point.value < best.value ? point : best;
      return point.value > best.value ? point : best;
    }, chartData[0]);
  }, [chartData, metricType]);

  if (chartData.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Potřeba alespoň 2 záznamy pro zobrazení grafu
      </div>
    );
  }

  const getYAxisLabel = () => {
    switch (metricType) {
      case 'weight': return 'kg';
      case 'time': return 's';
      case 'reps': return 'reps';
      case 'distance': return 'm';
    }
  };

  const hasVolume = chartData.some(d => d.volume && d.volume > 0);
  const hasRpe = chartData.some(d => d.rpe != null);

  // Trend line data: add trendValue to first and last points
  const dataWithTrend = chartData.map((d, i) => {
    const n = chartData.length - 1;
    return {
      ...d,
      trendValue: n > 0 ? trendStart + (trendEnd - trendStart) * (i / n) : trendStart,
    };
  });

  return (
    <div className="space-y-1">
      <div className={hasVolume ? "h-52" : "h-40"} style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataWithTrend} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="main"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              width={40}
            />
            {hasVolume && (
              <YAxis
                yAxisId="volume"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={false}
                width={0}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'volume' || name === 'Objem') return [`${value} kg·reps`, 'Objem'];
                if (name === 'trendValue' || name === 'Trend') return [`${value} ${getYAxisLabel()}`, 'Trend'];
                if (metricType === 'time')
                  return [`${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`, 'Čas'];
                return [`${value} ${getYAxisLabel()}`, metricType === 'weight' ? 'Váha' : metricType === 'reps' ? 'Opakování' : 'Vzdálenost'];
              }}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload;
                if (!p) return '';
                let label = p.fullDate;
                if (p.rpe) label += ` | RPE ${p.rpe}`;
                return label;
              }}
            />

            {/* Average reference line */}
            <ReferenceLine
              yAxisId="main"
              y={average}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />

            {/* Volume bars */}
            {hasVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                name="Objem"
                fill="hsl(var(--primary))"
                fillOpacity={0.12}
                radius={[3, 3, 0, 0]}
                barSize={12}
              />
            )}

            {/* Trend line */}
            <Line
              yAxisId="main"
              type="linear"
              dataKey="trendValue"
              name="Trend"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={false}
            />

            {/* Main value line */}
            <Line
              yAxisId="main"
              type="monotone"
              dataKey="value"
              name="Výkon"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy) return <circle key={props.key} />;
                const color = hasRpe && payload.rpe ? getRpeColor(payload.rpe) : 'hsl(var(--primary))';
                return (
                  <circle
                    key={props.key}
                    cx={cx}
                    cy={cy}
                    r={hasRpe && payload.rpe ? 5 : 3}
                    fill={color}
                    stroke="hsl(var(--background))"
                    strokeWidth={hasRpe && payload.rpe ? 2 : 1}
                  />
                );
              }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />

            {/* PR highlight */}
            {bestPoint && (
              <ReferenceDot
                yAxisId="main"
                x={bestPoint.date}
                y={bestPoint.value}
                r={9}
                fill="hsl(var(--warning))"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend row */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground flex-wrap px-2">
        {bestPoint && (
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-warning" />
            PR: {bestPoint.displayValue}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-4 h-px bg-muted-foreground inline-block" style={{ borderTop: '1.5px dashed' }} />
          Průměr: {average} {getYAxisLabel()}
        </span>
        {trendEnd !== trendStart && (
          <span className="flex items-center gap-1">
            {trendEnd > trendStart ? '↗' : '↘'} Trend {trendEnd > trendStart ? '+' : ''}{Math.round(((trendEnd - trendStart) / (trendStart || 1)) * 100)}%
          </span>
        )}
        {hasRpe && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success inline-block" /> RPE ≤6
            <span className="w-2 h-2 rounded-full bg-warning inline-block" /> 7-8
            <span className="w-2 h-2 rounded-full bg-destructive inline-block" /> 9+
          </span>
        )}
      </div>
    </div>
  );
}
