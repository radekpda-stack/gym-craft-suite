import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatChallengeScore } from '@/lib/challengeUtils';

interface Submission {
  id: string;
  score_primary: number;
  submitted_at: string | null;
  status: string;
}

interface ChallengeProgressChartProps {
  submissions: Submission[];
  primaryMetric: string;
  scoringType: string;
  unitLabel?: string | null;
}

export function ChallengeProgressChart({
  submissions,
  primaryMetric,
  scoringType,
  unitLabel,
}: ChallengeProgressChartProps) {
  const chartData = useMemo(() => {
    return submissions
      .filter(s => s.submitted_at)
      .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime())
      .map((sub, index) => ({
        index: index + 1,
        score: sub.score_primary,
        date: sub.submitted_at,
        formattedDate: format(new Date(sub.submitted_at!), 'd. M.', { locale: cs }),
        formattedScore: formatChallengeScore(sub.score_primary, primaryMetric),
      }));
  }, [submissions, primaryMetric]);

  const bestScore = useMemo(() => {
    if (chartData.length === 0) return null;
    const scores = chartData.map(d => d.score);
    return scoringType === 'time_lower_better' ? Math.min(...scores) : Math.max(...scores);
  }, [chartData, scoringType]);

  if (chartData.length < 2) {
    return null;
  }

  const isTimeMetric = primaryMetric === 'time_seconds' || primaryMetric === 'time_ms';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Tvůj progress
        </CardTitle>
        <CardDescription>
          {chartData.length} pokusů
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => isTimeMetric ? formatChallengeScore(value, primaryMetric) : value}
                reversed={scoringType === 'time_lower_better'}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium">{data.formattedScore}</p>
                      <p className="text-xs text-muted-foreground">{data.formattedDate}</p>
                    </div>
                  );
                }}
              />
              {bestScore != null && (
                <ReferenceLine 
                  y={bestScore} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: 'Nejlepší', 
                    position: 'insideTopRight',
                    fill: 'hsl(var(--primary))',
                    fontSize: 10 
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
