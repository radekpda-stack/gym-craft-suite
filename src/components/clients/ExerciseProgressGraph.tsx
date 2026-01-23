/**
 * ExerciseProgressGraph - Shows a line chart of exercise progress over time
 * Displays weight/time/distance progression with highlighted PRs
 */
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { Trophy } from 'lucide-react';

interface ExerciseProgressGraphProps {
  history: ExerciseHistoryEntry[];
  metricType: 'weight' | 'time' | 'reps' | 'distance';
}

export function ExerciseProgressGraph({ history, metricType }: ExerciseProgressGraphProps) {
  // Reverse to show oldest first (chronological order)
  const chartData = useMemo(() => {
    const reversed = [...history].reverse();
    return reversed.map((entry, index) => {
      let value = 0;
      switch (metricType) {
        case 'weight':
          value = entry.weight_kg || 0;
          break;
        case 'time':
          value = entry.time_seconds || 0;
          break;
        case 'reps':
          value = entry.reps || 0;
          break;
        case 'distance':
          value = (entry.distance_meters || entry.height_cm || 0);
          break;
      }
      
      return {
        date: format(parseISO(entry.date), 'd.M', { locale: cs }),
        fullDate: format(parseISO(entry.date), 'd. MMM yyyy', { locale: cs }),
        value,
        displayValue: entry.displayValue,
        index,
      };
    });
  }, [history, metricType]);

  // Find the best value for highlighting
  const bestPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    
    return chartData.reduce((best, point) => {
      // For time-based exercises, lower is better
      if (metricType === 'time') {
        return point.value < best.value ? point : best;
      }
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

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            width={40}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [
              metricType === 'time' 
                ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
                : `${value} ${getYAxisLabel()}`,
              metricType === 'weight' ? 'Váha' : 
              metricType === 'time' ? 'Čas' :
              metricType === 'reps' ? 'Opakování' : 'Vzdálenost'
            ]}
            labelFormatter={(label, payload) => {
              if (payload?.[0]?.payload?.fullDate) {
                return payload[0].payload.fullDate;
              }
              return label;
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
          />
          {bestPoint && (
            <ReferenceDot
              x={bestPoint.date}
              y={bestPoint.value}
              r={8}
              fill="hsl(var(--warning))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      {bestPoint && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Trophy className="w-3 h-3 text-warning" />
          <span>PR: {bestPoint.displayValue} ({bestPoint.fullDate})</span>
        </div>
      )}
    </div>
  );
}
