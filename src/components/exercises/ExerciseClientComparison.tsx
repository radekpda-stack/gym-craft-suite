import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Users, Loader2, TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
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

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export function ExerciseClientComparison({ exerciseId, exerciseType }: ExerciseClientComparisonProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-client-comparison', exerciseId],
    queryFn: async () => {
      // Fetch strength data
      const { data: strengthEntries } = await supabase
        .from('exercise_entries')
        .select(`
          weight_kg,
          reps,
          sets,
          date,
          is_pr,
          client_id,
          clients(id, name)
        `)
        .eq('exercise_id', exerciseId);

      // Fetch cardio data
      const { data: cardioEntries } = await supabase
        .from('cardio_entries')
        .select(`
          duration_seconds,
          distance_meters,
          avg_watts,
          avg_speed_kmh,
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

      (strengthEntries || []).forEach(entry => {
        const clientId = entry.client_id;
        const clientName = (entry.clients as any)?.name || 'Neznámý';
        const weight = entry.weight_kg || 0;
        const volume = weight * (entry.reps || 0) * (entry.sets || 1);

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

        // Track weights for trend calculation
        if (client.recentWeights.length < 5) {
          client.recentWeights.push(weight);
        } else if (client.olderWeights.length < 5) {
          client.olderWeights.push(weight);
        }
      });

      // Process clients for cardio
      const clientCardioMap = new Map<string, {
        clientId: string;
        clientName: string;
        bestPace: number | null;
        maxWatts: number | null;
        totalDistance: number;
        entryCount: number;
        prCount: number;
        lastDate: string;
      }>();

      (cardioEntries || []).forEach(entry => {
        const clientId = entry.client_id;
        const clientName = (entry.clients as any)?.name || 'Neznámý';
        const distance = entry.distance_meters ? entry.distance_meters / 1000 : 0;
        const duration = entry.duration_seconds ? entry.duration_seconds / 60 : 0;
        const pace = distance > 0 && duration > 0 ? duration / distance : null;

        if (!clientCardioMap.has(clientId)) {
          clientCardioMap.set(clientId, {
            clientId,
            clientName,
            bestPace: null,
            maxWatts: null,
            totalDistance: 0,
            entryCount: 0,
            prCount: 0,
            lastDate: entry.date,
          });
        }

        const client = clientCardioMap.get(clientId)!;
        if (pace && (client.bestPace === null || pace < client.bestPace)) {
          client.bestPace = pace;
        }
        if (entry.avg_watts && (client.maxWatts === null || entry.avg_watts > client.maxWatts)) {
          client.maxWatts = entry.avg_watts;
        }
        client.totalDistance += distance;
        client.entryCount++;
        if (entry.is_pr) client.prCount++;
        if (entry.date > client.lastDate) client.lastDate = entry.date;
      });

      // Calculate trends and format data
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

      const cardioClients = Array.from(clientCardioMap.values())
        .sort((a, b) => {
          // Sort by pace (lower is better) or watts (higher is better)
          if (a.bestPace && b.bestPace) return a.bestPace - b.bestPace;
          if (a.maxWatts && b.maxWatts) return b.maxWatts - a.maxWatts;
          return b.entryCount - a.entryCount;
        });

      return {
        strengthClients,
        cardioClients,
        hasStrength: strengthClients.length > 0,
        hasCardio: cardioClients.length > 0,
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

  const hasData = data?.hasStrength || data?.hasCardio;

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
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const showStrength = exerciseType === 'strength' || exerciseType === 'mixed';
  const showCardio = exerciseType === 'cardio' || exerciseType === 'mixed';

  // Prepare chart data
  const strengthChartData = data?.strengthClients.slice(0, 10).map((c, i) => ({
    name: c.clientName.length > 12 ? c.clientName.slice(0, 12) + '...' : c.clientName,
    fullName: c.clientName,
    value: c.maxWeight,
    clientId: c.clientId,
    rank: i,
  })) || [];

  return (
    <div className="space-y-4">
      {/* Strength comparison */}
      {showStrength && data?.hasStrength && (
        <Card>
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
                        fill={index < 3 ? PODIUM_COLORS[index] : COLORS[index % COLORS.length]}
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
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                          idx === 0 && "bg-yellow-500/20 text-yellow-600",
                          idx === 1 && "bg-gray-300/30 text-gray-600",
                          idx === 2 && "bg-orange-500/20 text-orange-600",
                          idx > 2 && "bg-muted text-muted-foreground"
                        )}>
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
                          <Badge variant="outline" className="text-yellow-600">
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

      {/* Cardio comparison */}
      {showCardio && data?.hasCardio && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-primary" />
                Porovnání klientů - Kardio
              </CardTitle>
              <StatInfoTooltip
                title="Porovnání kardio"
                description="Porovnání kardio výkonu mezi klienty."
                calculation="Řazeno podle nejlepšího tempa nebo maximálního výkonu."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Klient</th>
                    <th className="text-right py-2 px-2 font-medium">Nejlepší tempo</th>
                    <th className="text-right py-2 px-2 font-medium">Max výkon</th>
                    <th className="text-right py-2 px-2 font-medium">Celkem km</th>
                    <th className="text-right py-2 px-2 font-medium">Záznamy</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.cardioClients.slice(0, 10).map((client, idx) => (
                    <tr
                      key={client.clientId}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/clients/${client.clientId}`)}
                    >
                      <td className="py-3 px-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                          idx === 0 && "bg-yellow-500/20 text-yellow-600",
                          idx === 1 && "bg-gray-300/30 text-gray-600",
                          idx === 2 && "bg-orange-500/20 text-orange-600",
                          idx > 2 && "bg-muted text-muted-foreground"
                        )}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium">{client.clientName}</td>
                      <td className="py-3 px-2 text-right font-bold">
                        {client.bestPace ? `${client.bestPace.toFixed(2)} min/km` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {client.maxWatts ? `${client.maxWatts} W` : '-'}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {client.totalDistance.toFixed(1)} km
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
    </div>
  );
}
