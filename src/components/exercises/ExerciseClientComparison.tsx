import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Users, Loader2, TrendingUp, TrendingDown, Minus, Trophy, Timer, ChevronDown, ChevronRight, ExternalLink, Calendar, Pencil, Ruler } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { EditExerciseEntryDialog } from '@/components/exercises/EditExerciseEntryDialog';
import { formatTimeMs, getTimeMs } from '@/lib/timeUtils';

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

interface TimeEntry {
  id: string;
  date: string;
  timeMs: number; // Store in milliseconds for precision
  isPR: boolean;
}

interface StrengthEntry {
  id: string;
  date: string;
  weight: number;
  reps: number;
  sets: number;
  volume: number;
  isPR: boolean;
}
interface DistanceEntry {
  id: string;
  date: string;
  distanceMeters: number;
  distanceCm: number;
  isPR: boolean;
}

export function ExerciseClientComparison({ exerciseId, exerciseType }: ExerciseClientComparisonProps) {
  const navigate = useNavigate();
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['exercise-client-comparison', exerciseId],
    queryFn: async () => {
      // First, get exercise info to determine if it's time-based or jump
      const { data: exercise } = await supabase
        .from('exercises')
        .select('is_time_based, category, name, name_cs')
        .eq('id', exerciseId)
        .single();

      const isTimeBased = exercise?.is_time_based || 
        exercise?.category === 'cardio' || 
        exercise?.category === 'conditioning';
      
      const exerciseName = exercise?.name_cs || exercise?.name || '';
      const exerciseCategory = exercise?.category || '';
      const isJumpExercise = exerciseName.toLowerCase().includes('skok') || 
        exerciseName.toLowerCase().includes('jump') ||
        (exerciseCategory.toLowerCase().includes('plyometrics') && exerciseName.toLowerCase().includes('jump'));

      // Fetch all data from exercise_entries (includes both strength and time-based)
      const { data: entries } = await supabase
        .from('exercise_entries')
        .select(`
          id,
          weight_kg,
          reps,
          sets,
          time_seconds,
          time_ms,
          distance_meters,
          date,
          is_pr,
          client_id,
          clients(id, name)
        `)
        .eq('exercise_id', exerciseId)
        .order('date', { ascending: false });

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
        entries: StrengthEntry[];
      }>();

      // Process clients for time-based (using milliseconds for precision)
      const clientTimeMap = new Map<string, {
        clientId: string;
        clientName: string;
        bestTimeMs: number | null;
        averageTimeMs: number | null;
        entryCount: number;
        prCount: number;
        lastDate: string;
        timesMs: number[];
        entries: TimeEntry[];
      }>();

      // Process clients for distance-based (jumps)
      const clientDistanceMap = new Map<string, {
        clientId: string;
        clientName: string;
        bestDistanceM: number | null;
        bestDistanceCm: number | null;
        averageDistanceCm: number | null;
        entryCount: number;
        prCount: number;
        lastDate: string;
        distances: number[];
        entries: DistanceEntry[];
      }>();

      (entries || []).forEach(entry => {
        const clientId = entry.client_id;
        const clientName = (entry.clients as any)?.name || 'Neznámý';
        const weight = entry.weight_kg || 0;
        const timeSeconds = entry.time_seconds;
        const timeMs = entry.time_ms;
        const distanceMeters = (entry as any).distance_meters || 0;
        const reps = entry.reps || 0;
        const sets = entry.sets || 1;
        const volume = weight * reps * sets;

        // Get time in milliseconds (prefer time_ms, fallback to time_seconds * 1000)
        const effectiveTimeMs = getTimeMs({ time_ms: timeMs, time_seconds: timeSeconds });

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
              entries: [],
            });
          }

          const client = clientStrengthMap.get(clientId)!;
          client.maxWeight = Math.max(client.maxWeight, weight);
          client.totalVolume += volume;
          client.entryCount++;
          if (entry.is_pr) client.prCount++;
          if (entry.date > client.lastDate) client.lastDate = entry.date;

          // Store individual entry
          client.entries.push({
            id: entry.id,
            date: entry.date,
            weight,
            reps,
            sets,
            volume,
            isPR: entry.is_pr || false,
          });

          if (client.recentWeights.length < 5) {
            client.recentWeights.push(weight);
          } else if (client.olderWeights.length < 5) {
            client.olderWeights.push(weight);
          }
        }

        // Process time data (using milliseconds for precision)
        if (effectiveTimeMs && effectiveTimeMs > 0) {
          if (!clientTimeMap.has(clientId)) {
            clientTimeMap.set(clientId, {
              clientId,
              clientName,
              bestTimeMs: null,
              averageTimeMs: null,
              entryCount: 0,
              prCount: 0,
              lastDate: entry.date,
              timesMs: [],
              entries: [],
            });
          }

          const client = clientTimeMap.get(clientId)!;
          client.timesMs.push(effectiveTimeMs);
          if (client.bestTimeMs === null || effectiveTimeMs < client.bestTimeMs) {
            client.bestTimeMs = effectiveTimeMs;
          }
          client.entryCount++;
          if (entry.is_pr) client.prCount++;
          if (entry.date > client.lastDate) client.lastDate = entry.date;

          // Store individual entry with ms precision
          client.entries.push({
            id: entry.id,
            date: entry.date,
            timeMs: effectiveTimeMs,
            isPR: entry.is_pr || false,
          });
        }

        // Process distance data (for jumps - higher is better)
        if (distanceMeters > 0) {
          if (!clientDistanceMap.has(clientId)) {
            clientDistanceMap.set(clientId, {
              clientId,
              clientName,
              bestDistanceM: null,
              bestDistanceCm: null,
              averageDistanceCm: null,
              entryCount: 0,
              prCount: 0,
              lastDate: entry.date,
              distances: [],
              entries: [],
            });
          }

          const client = clientDistanceMap.get(clientId)!;
          client.distances.push(distanceMeters);
          if (client.bestDistanceM === null || distanceMeters > client.bestDistanceM) {
            client.bestDistanceM = distanceMeters;
            client.bestDistanceCm = Math.round(distanceMeters * 100);
          }
          client.entryCount++;
          if (entry.is_pr) client.prCount++;
          if (entry.date > client.lastDate) client.lastDate = entry.date;

          // Store individual entry
          client.entries.push({
            id: entry.id,
            date: entry.date,
            distanceMeters,
            distanceCm: Math.round(distanceMeters * 100),
            isPR: entry.is_pr || false,
          });
        }
      });

      // Calculate averages for time-based (in milliseconds)
      clientTimeMap.forEach((client) => {
        if (client.timesMs.length > 0) {
          client.averageTimeMs = Math.round(
            client.timesMs.reduce((a, b) => a + b, 0) / client.timesMs.length
          );
        }
      });

      // Calculate averages for distance-based
      clientDistanceMap.forEach((client) => {
        if (client.distances.length > 0) {
          client.averageDistanceCm = Math.round(
            (client.distances.reduce((a, b) => a + b, 0) / client.distances.length) * 100
          );
        }
      });

      // Recompute true PRs for distance (each client's best is their PR)
      clientDistanceMap.forEach((client) => {
        if (client.entries.length > 0) {
          const bestEntry = client.entries.reduce((a, b) => a.distanceMeters > b.distanceMeters ? a : b);
          client.entries = client.entries.map(e => ({
            ...e,
            isPR: e.id === bestEntry.id
          }));
          client.prCount = 1;
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
          if (client.timesMs.length >= 2) {
            const recentTimes = client.timesMs.slice(0, 3);
            const olderTimes = client.timesMs.slice(3, 6);
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
          // Sort by best time (lower is better, using ms for precision)
          if (a.bestTimeMs === null) return 1;
          if (b.bestTimeMs === null) return -1;
          return a.bestTimeMs - b.bestTimeMs;
        });

      // Calculate trends for distance-based (higher distance = improvement)
      const distanceClients = Array.from(clientDistanceMap.values())
        .map(client => {
          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (client.distances.length >= 2) {
            const recentDist = client.distances.slice(0, 3);
            const olderDist = client.distances.slice(3, 6);
            if (recentDist.length > 0 && olderDist.length > 0) {
              const recentAvg = recentDist.reduce((a, b) => a + b, 0) / recentDist.length;
              const olderAvg = olderDist.reduce((a, b) => a + b, 0) / olderDist.length;
              if (recentAvg > olderAvg * 1.05) trend = 'up'; // Higher = improvement
              else if (recentAvg < olderAvg * 0.95) trend = 'down'; // Lower = worse
            }
          }
          return { ...client, trend };
        })
        .sort((a, b) => {
          // Sort by best distance (higher is better)
          if (a.bestDistanceCm === null) return 1;
          if (b.bestDistanceCm === null) return -1;
          return b.bestDistanceCm - a.bestDistanceCm;
        });

      return {
        strengthClients,
        timeClients,
        distanceClients,
        hasStrength: strengthClients.length > 0,
        hasTime: timeClients.length > 0,
        hasDistance: distanceClients.length > 0,
        isTimeBased,
        isJumpExercise,
      };
    },
    enabled: !!exerciseId,
  });

  const toggleExpand = (clientId: string) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data?.hasStrength || data?.hasTime || data?.hasDistance;

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
  const showStrength = !data.isTimeBased && !data.isJumpExercise && data.hasStrength;
  const showTime = data.isTimeBased && !data.isJumpExercise && data.hasTime;
  const showDistance = data.isJumpExercise && data.hasDistance;

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
    value: c.bestTimeMs ? c.bestTimeMs / 1000 : null,
    valueMs: c.bestTimeMs,
    clientId: c.clientId,
    rank: i,
  })) || [];

  const distanceChartData = data?.distanceClients?.slice(0, 10).map((c, i) => ({
    name: c.clientName.length > 12 ? c.clientName.slice(0, 12) + '...' : c.clientName,
    fullName: c.clientName,
    value: c.bestDistanceCm,
    clientId: c.clientId,
    rank: i,
  })) || [];

  return (
    <>
    <div className="space-y-4">
      {/* Distance-based comparison (for jump exercises) */}
      {showDistance && (
        <Card className="analytics-chart">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-5 w-5 text-primary" />
                Porovnání klientů - Nejlepší skok
              </CardTitle>
              <StatInfoTooltip
                title="Porovnání vzdálenosti"
                description="Porovnání nejlepších skoků mezi všemi klienty."
                calculation="Zobrazuje nejvyšší zaznamenanou vzdálenost/výšku pro každého klienta."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distanceChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <defs>
                    {distanceChartData.map((_, index) => (
                      <linearGradient key={`gradient-dist-${index}`} id={`gradientDist${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v} cm`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number, _, props) => [`${value} cm`, props.payload.fullName]} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {distanceChartData.map((entry, index) => (
                      <Cell key={entry.clientId} fill={`url(#gradientDist${index})`} className="cursor-pointer transition-opacity hover:opacity-80" onClick={() => toggleExpand(entry.clientId)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Klient</th>
                    <th className="text-right py-2 px-2 font-medium">Nejlepší</th>
                    <th className="text-right py-2 px-2 font-medium">Průměr</th>
                    <th className="text-center py-2 px-2 font-medium">Trend</th>
                    <th className="text-right py-2 px-2 font-medium">Pokusy</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.distanceClients?.slice(0, 10).map((client, idx) => (
                    <tr key={client.clientId} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium", idx === 0 ? "bg-amber-500/20 text-amber-500" : idx === 1 ? "bg-slate-400/20 text-slate-400" : idx === 2 ? "bg-orange-600/20 text-orange-600" : "bg-muted text-muted-foreground")}>{idx + 1}</span>
                      </td>
                      <td className="py-3 px-2 font-medium">{client.clientName}</td>
                      <td className="py-3 px-2 text-right font-bold text-primary">{client.bestDistanceCm} cm</td>
                      <td className="py-3 px-2 text-right text-muted-foreground">{client.averageDistanceCm} cm</td>
                      <td className="py-3 px-2 text-center"><TrendIcon trend={client.trend} /></td>
                      <td className="py-3 px-2 text-right"><Badge variant="secondary" className="font-mono">{client.entryCount}×</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                description="Porovnání nejlepšího času mezi všemi klienty. Kliknutím na klienta zobrazíte všechny jeho pokusy."
                calculation="Zobrazuje nejkratší zaznamenaný čas pro každého klienta."
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <defs>
                    {timeChartData.map((_, index) => (
                      <linearGradient key={`gradient-time-${index}`} id={`gradientTime${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    tickFormatter={(v) => formatTimeMs(v * 1000)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} 
                    width={90}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    formatter={(_, __, props) => [formatTimeMs(props.payload.valueMs), props.payload.fullName]}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {timeChartData.map((entry, index) => (
                      <Cell 
                        key={entry.clientId} 
                        fill={`url(#gradientTime${index})`}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => toggleExpand(entry.clientId)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed table for time with expandable rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium w-8"></th>
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Klient</th>
                    <th className="text-right py-2 px-2 font-medium">Nejlepší čas</th>
                    <th className="text-right py-2 px-2 font-medium">Průměr</th>
                    <th className="text-right py-2 px-2 font-medium">PRs</th>
                    <th className="text-center py-2 px-2 font-medium">Trend</th>
                    <th className="text-right py-2 px-2 font-medium">Pokusy</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.timeClients.slice(0, 10).map((client, idx) => (
                    <React.Fragment key={client.clientId}>
                      <tr
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                          expandedClientId === client.clientId && "bg-muted/30"
                        )}
                        onClick={() => toggleExpand(client.clientId)}
                      >
                        <td className="py-3 px-2">
                          {client.entryCount > 1 ? (
                            expandedClientId === client.clientId ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )
                          ) : null}
                        </td>
                        <td className="py-3 px-2">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                            idx === 0 ? "bg-amber-500/20 text-amber-500" :
                            idx === 1 ? "bg-slate-400/20 text-slate-400" :
                            idx === 2 ? "bg-orange-600/20 text-orange-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{client.clientName}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${client.clientId}`);
                              }}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-primary">
                          {client.bestTimeMs ? formatTimeMs(client.bestTimeMs) : '-'}
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {client.averageTimeMs ? formatTimeMs(client.averageTimeMs) : '-'}
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
                        <td className="py-3 px-2 text-right">
                          <Badge variant="secondary" className="font-mono">
                            {client.entryCount}×
                          </Badge>
                        </td>
                      </tr>
                      
                      {/* Expanded entries */}
                      <AnimatePresence>
                        {expandedClientId === client.clientId && client.entries.length > 0 && (
                          <motion.tr
                            key={`${client.clientId}-entries`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={8} className="p-0">
                              <div className="bg-muted/20 border-l-2 border-primary/50 ml-4 p-3">
                                <p className="text-xs text-muted-foreground mb-2 font-medium">
                                  Všechny pokusy ({client.entries.length})
                                </p>
                                <div className="grid gap-2">
                                  {client.entries.map((entry, entryIdx) => (
                                    <div 
                                      key={entry.id}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg cursor-pointer group hover:bg-muted/50 transition-colors",
                                        entry.isPR ? "bg-primary/10 border border-primary/30" : "bg-card"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditEntryId(entry.id);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {format(new Date(entry.date), 'd. MMMM yyyy', { locale: cs })}
                                        </span>
                                        {entry.isPR && (
                                          <Badge className="bg-primary/20 text-primary text-xs">
                                            <Trophy className="w-3 h-3 mr-1" />
                                            PR
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "font-mono font-bold",
                                          entry.isPR ? "text-primary" : "text-foreground"
                                        )}>
                                          {formatTimeMs(entry.timeMs)}
                                        </span>
                                        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/clients/${client.clientId}`);
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Zobrazit kartu klienta
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
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
                description="Porovnání maximální váhy mezi všemi klienty. Kliknutím na klienta zobrazíte všechny jeho záznamy."
                calculation="Zobrazuje nejvyšší váhu, kterou každý klient u tohoto cviku použil."
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Bar chart */}
            <div className="h-52 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strengthChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <defs>
                    {strengthChartData.map((_, index) => (
                      <linearGradient key={`gradient-strength-${index}`} id={`gradientStrength${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                    tickFormatter={(v) => `${v} kg`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} 
                    width={90}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                    formatter={(value: number, _, props) => [`${value} kg`, props.payload.fullName]}
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {strengthChartData.map((entry, index) => (
                      <Cell 
                        key={entry.clientId} 
                        fill={`url(#gradientStrength${index})`}
                        className="cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() => toggleExpand(entry.clientId)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed table for strength with expandable rows */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium w-8"></th>
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Klient</th>
                    <th className="text-right py-2 px-2 font-medium">Max váha</th>
                    <th className="text-right py-2 px-2 font-medium">Celk. objem</th>
                    <th className="text-right py-2 px-2 font-medium">PRs</th>
                    <th className="text-center py-2 px-2 font-medium">Trend</th>
                    <th className="text-right py-2 px-2 font-medium">Záznamy</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.strengthClients.slice(0, 10).map((client, idx) => (
                    <React.Fragment key={client.clientId}>
                      <tr
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                          expandedClientId === client.clientId && "bg-muted/30"
                        )}
                        onClick={() => toggleExpand(client.clientId)}
                      >
                        <td className="py-3 px-2">
                          {client.entryCount > 1 ? (
                            expandedClientId === client.clientId ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )
                          ) : null}
                        </td>
                        <td className="py-3 px-2">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                            idx === 0 ? "bg-amber-500/20 text-amber-500" :
                            idx === 1 ? "bg-slate-400/20 text-slate-400" :
                            idx === 2 ? "bg-orange-600/20 text-orange-600" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{client.clientName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-primary">
                          {client.maxWeight} kg
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {client.totalVolume.toLocaleString()} kg
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
                        <td className="py-3 px-2 text-right">
                          <Badge variant="secondary" className="font-mono">
                            {client.entryCount}×
                          </Badge>
                        </td>
                      </tr>
                      
                      {/* Expanded entries */}
                      <AnimatePresence>
                        {expandedClientId === client.clientId && client.entries.length > 0 && (
                          <motion.tr
                            key={`${client.clientId}-entries`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <td colSpan={8} className="p-0">
                              <div className="bg-muted/20 border-l-2 border-primary/50 ml-4 p-3">
                                <p className="text-xs text-muted-foreground mb-2 font-medium">
                                  Všechny záznamy ({client.entries.length})
                                </p>
                                <div className="grid gap-2">
                                  {client.entries.slice(0, 10).map((entry) => (
                                    <div 
                                      key={entry.id}
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-lg cursor-pointer group hover:bg-muted/50 transition-colors",
                                        entry.isPR ? "bg-primary/10 border border-primary/30" : "bg-card"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditEntryId(entry.id);
                                      }}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm">
                                          {format(new Date(entry.date), 'd. MMMM yyyy', { locale: cs })}
                                        </span>
                                        {entry.isPR && (
                                          <Badge className="bg-primary/20 text-primary text-xs">
                                            <Trophy className="w-3 h-3 mr-1" />
                                            PR
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="text-muted-foreground text-sm">
                                          {entry.sets}×{entry.reps}
                                        </span>
                                        <span className={cn(
                                          "font-mono font-bold",
                                          entry.isPR ? "text-primary" : "text-foreground"
                                        )}>
                                          {entry.weight} kg
                                        </span>
                                        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                    </div>
                                  ))}
                                  {client.entries.length > 10 && (
                                    <p className="text-xs text-muted-foreground text-center py-1">
                                      ... a dalších {client.entries.length - 10} záznamů
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/clients/${client.clientId}`);
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Zobrazit kartu klienta
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
      
      {/* Edit Entry Dialog */}
      <EditExerciseEntryDialog
        entryId={editEntryId}
        metricCategory={data?.isTimeBased ? 'cardio' : 'strength'}
        open={!!editEntryId}
        onOpenChange={(open) => {
          if (!open) setEditEntryId(null);
        }}
      />
    </>
  );
}
