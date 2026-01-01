import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Users, Loader2, TrendingUp, TrendingDown, Minus, Trophy, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { cn } from '@/lib/utils';

interface ExerciseClientComparisonProps {
  exerciseId: string;
  exerciseType: 'strength' | 'cardio' | 'mixed';
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExerciseClientComparison({ exerciseId, exerciseType }: ExerciseClientComparisonProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-client-comparison', exerciseId],
    queryFn: async () => {
      // First, get exercise info to determine if it's time-based
      const { data: exercise } = await supabase
        .from('exercises')
        .select('is_time_based, category')
        .eq('id', exerciseId)
        .single();

      const isTimeBased = exercise?.is_time_based || 
        exercise?.category === 'cardio' || 
        exercise?.category === 'conditioning';

      // Fetch all data from exercise_entries (includes both strength and time-based)
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select(`
          weight_kg,
          reps,
          sets,
          time_seconds,
          date,
          is_pr,
          client_id,
          clients(id, name)
        `)
        .eq('exercise_id', exerciseId);

      // Process clients for strength
      const clientStrengthMap = new Map<string, {
        clientId: string;
        clientName: string;
        maxWeight: number;
        totalVolume: number;
        entryCount: number;
        prCount: number;
        lastDate: string;
        recentWeights: number[];
        olderWeights: number[];
      }>();

      // Process clients for time-based
      const clientTimeMap = new Map<string, {
        clientId: string;
        clientName: string;
        bestTime: number | null;
        averageTime: number | null;
        entryCount: number;
        prCount: number;
        lastDate: string;
        times: number[];
      }>();

      (entries || []).forEach(entry => {
        const clientId = entry.client_id;
        const clientName = (entry.clients as any)?.name || 'Neznámý';
        const weight = entry.weight_kg || 0;
        const timeSeconds = entry.time_seconds;
        const volume = weight * (entry.reps || 0) * (entry.sets || 1);

        // Process strength data
        if (weight > 0) {
          if (!clientStrengthMap.has(clientId)) {
            clientStrengthMap.set(clientId, {
              clientId,
              clientName,
              maxWeight: 0,
              totalVolume: 0,
              entryCount: 0,
              prCount: 0,
              lastDate: entry.date,
              recentWeights: [],
              olderWeights: [],
            });
          }

          const client = clientStrengthMap.get(clientId)!;
          client.maxWeight = Math.max(client.maxWeight, weight);
          client.totalVolume += volume;
          client.entryCount++;
          if (entry.is_pr) client.prCount++;
          if (entry.date > client.lastDate) client.lastDate = entry.date;

          if (client.recentWeights.length < 5) {
            client.recentWeights.push(weight);
          } else if (client.olderWeights.length < 5) {
            client.olderWeights.push(weight);
          }
        }

        // Process time data
        if (timeSeconds && timeSeconds > 0) {
          if (!clientTimeMap.has(clientId)) {
            clientTimeMap.set(clientId, {
              clientId,
              clientName,
              bestTime: null,
              averageTime: null,
              entryCount: 0,
              prCount: 0,
              lastDate: entry.date,
              times: [],
            });
          }

          const client = clientTimeMap.get(clientId)!;
          client.times.push(timeSeconds);
          if (client.bestTime === null || timeSeconds < client.bestTime) {
            client.bestTime = timeSeconds;
          }
          client.entryCount++;
          if (entry.is_pr) client.prCount++;
          if (entry.date > client.lastDate) client.lastDate = entry.date;
        }
      });

      // Calculate averages and trends for time-based
      clientTimeMap.forEach((client) => {
        if (client.times.length > 0) {
          client.averageTime = Math.round(
            client.times.reduce((a, b) => a + b, 0) / client.times.length
          );
        }
      });

      // Calculate trends for strength
      const strengthClients = Array.from(clientStrengthMap.values())
        .map(client => {
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (client.recentWeights.length > 0 && client.olderWeights.length > 0) {
            const recentAvg = client.recentWeights.reduce((a, b) => a + b, 0) / client.recentWeights.length;
            const olderAvg = client.olderWeights.reduce((a, b) => a + b, 0) / client.olderWeights.length;
            if (recentAvg > olderAvg * 1.05) trend = 'up';
            else if (recentAvg < olderAvg * 0.95) trend = 'down';
          }
          return { ...client, trend };
        })
        .sort((a, b) => b.maxWeight - a.maxWeight);

      // Calculate trends for time-based (lower time = improvement)
      const timeClients = Array.from(clientTimeMap.values())
        .map(client => {
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (client.times.length >= 2) {
            const recentTimes = client.times.slice(0, 3);
            const olderTimes = client.times.slice(3, 6);
            if (recentTimes.length > 0 && olderTimes.length > 0) {
              const recentAvg = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
              const olderAvg = olderTimes.reduce((a, b) => a + b, 0) / olderTimes.length;
              if (recentAvg < olderAvg * 0.95) trend = 'up'; // Faster = improvement
              else if (recentAvg > olderAvg * 1.05) trend = 'down'; // Slower = worse
            }
          }
          return { ...client, trend };
        })
        .sort((a, b) => {
          // Sort by best time (lower is better)
          if (a.bestTime === null) return 1;
          if (b.bestTime === null) return -1;
          return a.bestTime - b.bestTime;
        });

      return {
        strengthClients,
        timeClients,
        hasStrength: strengthClients.length > 0,
        hasTime: timeClients.length > 0,
        isTimeBased,
      };
    },
    enabled: !!exerciseId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data?.hasStrength || data?.hasTime;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Porovnání klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Zatím nejsou žádná data k porovnání.
          </p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-muted-foreground" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-muted-foreground" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // Determine what to show
  const showStrength = !data.isTimeBased && data.hasStrength;
  const showTime = data.isTimeBased && data.hasTime;

  // Prepare chart data
  const strengthChartData = data?.strengthClients.slice(0, 10).map((c, i) => ({
    name: c.clientName.length > 12 ? c.clientName.slice(0, 12) + '...' : c.clientName,
    fullName: c.clientName,
    value: c.maxWeight,
    clientId: c.clientId,
    rank: i,
  })) || [];

  const timeChartData = data?.timeClients.slice(0, 10).map((c, i) => ({
    name: c.clientName.length > 12 ? c.clientName.slice(0, 12) + '...' : c.clientName,
    fullName: c.clientName,
    value: c.bestTime,
    clientId: c.clientId,
    rank: i,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Time-based comparison (for cardio/conditioning exercises) */}
      {showTime && (
        <Card className="analytics-chart">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Timer className="h-5 w-5 text-primary" />
                Porovnání klientů - Nejlepší čas
              </CardTitle>
              <StatInfoTooltip
                title="Porovnání času"
                description="Porovnání nejlepšího času mezi všemi klienty."
                calculation="Zobrazuje nejkratší zaznamenaný čas pro každého klienta."
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Bar chart for time */}
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData} layout="vertical">
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11 }} 
                    tickFormatter={(v) => formatTimeDisplay(v)}
                  />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, _, props) => [formatTimeDisplay(value), props.payload.fullName]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {timeChartData.map((entry, index) => (
                      <Cell 
                        key={entry.clientId} 
                        fill={COLORS[index % COLORS.length]}
                        className="cursor-pointer"
                        onClick={() => navigate(`/clients/${entry.clientId}`)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed table for time */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Klient</th>
                    <th className="text-right py-2 px-2 font-medium">Nejlepší čas</th>
                    <th className="text-right py-2 px-2 font-medium">Průměr</th>
                    <th className="text-right py-2 px-2 font-medium">PRs</th>
                    <th className="text-center py-2 px-2 font-medium">Trend</th>
                    <th className="text-right py-2 px-2 font-medium">Záznamy</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.timeClients.slice(0, 10).map((client, idx) => (
                    <tr
                      key={client.clientId}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/clients/${client.clientId}`)}
                    >
                      <td className="py-3 px-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium">{client.clientName}</td>
                      <td className="py-3 px-2 text-right font-bold">
                        {client.bestTime ? formatTimeDisplay(client.bestTime) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {client.averageTime ? formatTimeDisplay(client.averageTime) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {client.prCount > 0 && (
                          <Badge variant="outline" className="text-primary">
                            <Trophy className="w-3 h-3 mr-1" />
                            {client.prCount}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <TrendIcon trend={client.trend} />
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {client.entryCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strength comparison */}
      {showStrength && (
        <Card className="analytics-chart">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                Porovnání klientů - Max váha
              </CardTitle>
              <StatInfoTooltip
                title="Porovnání max váhy"
                description="Porovnání maximální váhy mezi všemi klienty."
                calculation="Zobrazuje nejvyšší váhu, kterou každý klient u tohoto cviku použil."
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Bar chart */}
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strengthChartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} kg`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, _, props) => [`${value} kg`, props.payload.fullName]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {strengthChartData.map((entry, index) => (
                      <Cell 
                        key={entry.clientId} 
                        fill={COLORS[index % COLORS.length]}
                        className="cursor-pointer"
                        onClick={() => navigate(`/clients/${entry.clientId}`)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Klient</th>
                    <th className="text-right py-2 px-2 font-medium">Max váha</th>
                    <th className="text-right py-2 px-2 font-medium">Objem</th>
                    <th className="text-right py-2 px-2 font-medium">PRs</th>
                    <th className="text-center py-2 px-2 font-medium">Trend</th>
                    <th className="text-right py-2 px-2 font-medium">Poslední</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.strengthClients.slice(0, 10).map((client, idx) => (
                    <tr
                      key={client.clientId}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/clients/${client.clientId}`)}
                    >
                      <td className="py-3 px-2">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-muted text-muted-foreground">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium">{client.clientName}</td>
                      <td className="py-3 px-2 text-right font-bold">
                        {client.maxWeight} kg
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {client.totalVolume > 0 ? `${Math.round(client.totalVolume / 1000)}t` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {client.prCount > 0 && (
                          <Badge variant="outline" className="text-primary">
                            <Trophy className="w-3 h-3 mr-1" />
                            {client.prCount}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <TrendIcon trend={client.trend} />
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground text-xs">
                        {format(new Date(client.lastDate), 'd.M.yyyy', { locale: cs })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
