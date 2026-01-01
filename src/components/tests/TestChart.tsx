import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TestSession } from '@/types/tests';
import { formatDuration } from '@/lib/utils';

interface TestChartProps {
  sessions: TestSession[];
  primaryMetricKey: string;
  isBetterLower: boolean;
}

export function TestChart({ sessions, primaryMetricKey, isBetterLower }: TestChartProps) {
  const data = useMemo(() => {
    return sessions
      .slice()
      .reverse()
      .map(session => ({
        date: new Date(session.date_time).toLocaleDateString('cs-CZ'),
        value: session.metrics_json[primaryMetricKey] as number,
        isValid: session.is_valid,
        isComparable: session.is_comparable,
      }))
      .filter(d => d.value != null);
  }, [sessions, primaryMetricKey]);

  const prValue = useMemo(() => {
    const validComparable = sessions.filter(s => s.is_valid && s.is_comparable);
    if (validComparable.length === 0) return null;
    
    const values = validComparable.map(s => s.metrics_json[primaryMetricKey] as number).filter(v => v != null);
    if (values.length === 0) return null;
    
    return isBetterLower ? Math.min(...values) : Math.max(...values);
  }, [sessions, primaryMetricKey, isBetterLower]);

  const formatValue = (value: number) => {
    if (primaryMetricKey.includes('time') || primaryMetricKey === 'time_s') {
      return formatDuration(value);
    }
    if (primaryMetricKey.includes('pace')) {
      return formatDuration(value);
    }
    if (primaryMetricKey.includes('pct') || primaryMetricKey.includes('drift')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nedostatek dat pro zobrazení grafu
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={formatValue}
            domain={['auto', 'auto']}
            reversed={isBetterLower}
          />
          <Tooltip
            formatter={(value: number) => [formatValue(value), 'Výsledek']}
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          {prValue && (
            <ReferenceLine
              y={prValue}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              label={{
                value: `PR: ${formatValue(prValue)}`,
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--primary))',
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
