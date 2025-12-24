import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp } from 'lucide-react';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface TopExercise {
  exerciseId: string;
  exerciseName: string;
  usageCount: number;
  percentage: number;
  trend: number[];
}

interface TopExercisesWidgetProps {
  data: TopExercise[];
  isLoading?: boolean;
}

function MiniSparkline({ data }: { data: number[] }) {
  const chartData = data.map((value, index) => ({ value, index }));
  
  return (
    <div className="w-12 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="url(#sparklineGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopExercisesWidget({ data, isLoading }: TopExercisesWidgetProps) {
  const navigate = useNavigate();
  const maxUsage = Math.max(...(data?.map(d => d.usageCount) || [1]));

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Top cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[140px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Top cviky
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
            Žádná data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          Top cviky
          <StatInfoTooltip 
            title="Top cviky"
            description="Nejčastěji používané cviky za posledních 30 dní se sparkline trendem"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 4).map((exercise, index) => (
          <div 
            key={exercise.exerciseId}
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors"
            onClick={() => navigate(`/exercises/${exercise.exerciseId}`)}
          >
            <span className="text-xs font-medium text-muted-foreground w-4">
              {index + 1}.
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{exercise.exerciseName}</p>
              <div className="h-1 bg-muted rounded-full mt-0.5 overflow-hidden">
                <div 
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${(exercise.usageCount / maxUsage) * 100}%` }}
                />
              </div>
            </div>
            <MiniSparkline data={exercise.trend} />
            <span className="text-xs text-muted-foreground shrink-0">{exercise.usageCount}×</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
