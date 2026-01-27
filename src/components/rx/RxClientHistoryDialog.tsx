import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRxClientProgression } from '@/hooks/useRxClientHistory';
import { formatRxScore } from '@/hooks/useRxWorkoutResults';
import type { RxScoringMode } from '@/hooks/useRxWorkouts';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Trophy, TrendingUp, Calendar, Target, Flame } from 'lucide-react';

interface RxClientHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: string;
  workoutName: string;
  clientId: string;
  clientName: string;
  scoringMode: RxScoringMode;
}

export function RxClientHistoryDialog({
  open,
  onOpenChange,
  workoutId,
  workoutName,
  clientId,
  clientName,
  scoringMode,
}: RxClientHistoryDialogProps) {
  const { history, isLoading, stats } = useRxClientProgression(workoutId, clientId);

  const chartData = useMemo(() => {
    return history
      .filter(r => !r.is_capped)
      .map(r => ({
        date: format(new Date(r.performed_at), 'd.M.', { locale: cs }),
        fullDate: format(new Date(r.performed_at), 'd. MMMM yyyy', { locale: cs }),
        score: r.score_primary,
        formattedScore: formatRxScore(r.score_primary, scoringMode, r.score_secondary),
        isPR: r.is_personal_record,
      }));
  }, [history, scoringMode]);

  // For time-based workouts, we want to show time in a readable format on Y axis
  const formatYAxis = (value: number) => {
    if (scoringMode === 'for_time') {
      const mins = Math.floor(value / 60);
      const secs = Math.round(value % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{data.fullDate}</p>
          <p className="text-lg font-bold text-primary">{data.formattedScore}</p>
          {data.isPR && (
            <Badge variant="secondary" className="mt-1">
              <Trophy className="h-3 w-3 mr-1" />
              PR
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historie: {clientName}
          </DialogTitle>
          <DialogDescription>
            {workoutName}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Žádné záznamy
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{stats?.totalAttempts}</p>
                <p className="text-xs text-muted-foreground">pokusů</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <p className="text-2xl font-bold">
                  {stats?.bestScore ? formatRxScore(stats.bestScore, scoringMode) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">nejlepší</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {stats?.latestScore ? formatRxScore(stats.latestScore, scoringMode) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">poslední</p>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatYAxis}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      domain={scoringMode === 'for_time' ? ['auto', 'auto'] : [0, 'auto']}
                      reversed={scoringMode === 'for_time'}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {stats?.bestScore && (
                      <ReferenceLine 
                        y={stats.bestScore} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="5 5"
                        label={{ value: 'PR', position: 'right', fontSize: 12 }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isPR) {
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="hsl(var(--primary))"
                              stroke="white"
                              strokeWidth={2}
                            />
                          );
                        }
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="hsl(var(--primary))"
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* History list */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <h4 className="text-sm font-medium text-muted-foreground">Všechny pokusy</h4>
              {history
                .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())
                .map((result) => (
                  <div 
                    key={result.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(result.performed_at), 'd.M.yyyy', { locale: cs })}
                      </span>
                      {result.is_personal_record && (
                        <Badge variant="secondary" className="text-xs">
                          <Trophy className="h-3 w-3 mr-1" />
                          PR
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {result.is_capped && (
                        <Badge variant="outline" className="text-xs">
                          CAP
                        </Badge>
                      )}
                      <span className="font-mono font-medium">
                        {result.is_capped 
                          ? `CAP +${result.capped_rounds || 0}+${result.capped_reps || 0}`
                          : formatRxScore(result.score_primary, scoringMode, result.score_secondary)
                        }
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
