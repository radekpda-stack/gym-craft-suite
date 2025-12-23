import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Medal, ChevronRight, TrendingUp, Trophy, Users, Zap, Crown } from 'lucide-react';
import { usePRMetrics, PRPeriod, PRType } from '@/hooks/usePRMetrics';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { GenderIcon } from '@/components/clients/GenderIcon';

const PERIOD_OPTIONS: { value: PRPeriod; label: string }[] = [
  { value: '30days', label: '30 dní' },
  { value: '3months', label: '3 měs.' },
  { value: '6months', label: '6 měs.' },
  { value: '12months', label: '12 měs.' },
];

const PR_TYPE_OPTIONS: { value: PRType; label: string }[] = [
  { value: '1rm', label: '1RM (odhad)' },
  { value: 'maxWeight', label: 'Max váha' },
];

export function PRTimelineCard() {
  const [period, setPeriod] = useState<PRPeriod>('3months');
  const [exerciseFilter, setExerciseFilter] = useState<string | null>(null);
  const [prType, setPRType] = useState<PRType>('1rm');
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = usePRMetrics(period, exerciseFilter, prType);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const hasData = data && data.totalPRCount > 0;
  const hasEnoughDataForChart = data && data.prCountTimeline.some(p => p.prCount > 0);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-warning" />
          <h4 className="font-semibold text-foreground">PR Statistiky</h4>
        </div>
        
        <div className="flex gap-1 p-0.5 rounded-full bg-secondary/50">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'rounded-full text-[10px] px-2 h-6',
                period === opt.value && 'bg-primary text-primary-foreground'
              )}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Summary - 4 cards */}
      {data && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <div className="p-2 sm:p-2.5 rounded-xl bg-warning/10 border border-warning/20 overflow-hidden">
            <div className="flex items-center gap-1 mb-0.5">
              <Trophy className="w-3 h-3 text-warning shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Celkem PR</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{data.totalPRCount}</p>
          </div>
          
          <div className="p-2 sm:p-2.5 rounded-xl bg-success/10 border border-success/20 overflow-hidden">
            <div className="flex items-center gap-1 mb-0.5">
              <Zap className="w-3 h-3 text-success shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">PR/týden</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{data.prVelocity}</p>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 overflow-hidden">
            <div className="flex items-center gap-1 mb-0.5">
              <GenderIcon gender="male" className="w-3 h-3 shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Muži</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{data.genderStats.male.count}</p>
          </div>

          <div className="p-2 sm:p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 overflow-hidden">
            <div className="flex items-center gap-1 mb-0.5">
              <GenderIcon gender="female" className="w-3 h-3 shrink-0" />
              <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">Ženy</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground">{data.genderStats.female.count}</p>
          </div>
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-8 grid grid-cols-3 bg-secondary/30">
          <TabsTrigger value="overview" className="text-xs">Přehled</TabsTrigger>
          <TabsTrigger value="gender" className="text-xs">Pohlaví</TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs">Žebříček</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          {/* Filters */}
          <div className="flex gap-2">
            <Select 
              value={exerciseFilter || 'all'} 
              onValueChange={(v) => setExerciseFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Všechny cviky" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny cviky</SelectItem>
                {data?.exerciseOptions.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name} ({ex.prCount} PR)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={prType} onValueChange={(v) => setPRType(v as PRType)}>
              <SelectTrigger className="h-8 text-xs w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PR_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasEnoughDataForChart ? (
            <>
              {/* PR Count Bar Chart */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Počet PR v čase</p>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.prCountTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                        formatter={(value: number) => [`${value} PR`, 'Počet']}
                      />
                      <Bar
                        dataKey="prCount"
                        fill="hsl(var(--warning))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Best PR Line Chart (when exercise filtered) */}
              {exerciseFilter && data?.prBestTimeline && data.prBestTimeline.length > 1 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Vývoj {prType === '1rm' ? '1RM' : 'max váhy'} (kg)
                  </p>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.prBestTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                          formatter={(value: number) => [`${value} kg`, prType === '1rm' ? '1RM' : 'Max váha']}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--success))"
                          strokeWidth={2}
                          dot={{ r: 4, fill: 'hsl(var(--success))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top PRs List (when all exercises) */}
              {!exerciseFilter && data?.topPRsInPeriod && data.topPRsInPeriod.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Top PR v období</p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {data.topPRsInPeriod.slice(0, 4).map((pr, i) => (
                      <div key={pr.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                            i === 0 ? 'bg-warning/20 text-warning' : 'bg-secondary text-muted-foreground'
                          )}>
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{pr.exerciseName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {pr.clientName} • {format(new Date(pr.date), 'd. MMM', { locale: cs })}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-success flex-shrink-0">{pr.estimated1RM} kg</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState period={period} onExtend={() => setPeriod('6months')} />
          )}
        </TabsContent>

        {/* Gender Tab */}
        <TabsContent value="gender" className="mt-3 space-y-3">
          {hasEnoughDataForChart ? (
            <>
              {/* Gender comparison chart */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">PR podle pohlaví v čase</p>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.prCountTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '11px',
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '10px' }}
                        iconSize={8}
                      />
                      <Bar
                        dataKey="maleCount"
                        name="Muži"
                        fill="hsl(210 100% 60%)"
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                      <Bar
                        dataKey="femaleCount"
                        name="Ženy"
                        fill="hsl(330 80% 65%)"
                        radius={[4, 4, 0, 0]}
                        stackId="a"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gender stats cards */}
              {data && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <GenderIcon gender="male" className="w-4 h-4" />
                      <span className="text-sm font-semibold text-foreground">Muži</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Počet PR</span>
                        <span className="font-medium">{data.genderStats.male.count}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ø 1RM</span>
                        <span className="font-medium">{data.genderStats.male.avgValue} kg</span>
                      </div>
                      {data.genderStats.male.topPR && (
                        <div className="pt-1 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground">Nejlepší PR</p>
                          <p className="text-xs font-medium truncate">{data.genderStats.male.topPR.exerciseName}</p>
                          <p className="text-xs text-success font-bold">{data.genderStats.male.topPR.estimated1RM} kg</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <GenderIcon gender="female" className="w-4 h-4" />
                      <span className="text-sm font-semibold text-foreground">Ženy</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Počet PR</span>
                        <span className="font-medium">{data.genderStats.female.count}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ø 1RM</span>
                        <span className="font-medium">{data.genderStats.female.avgValue} kg</span>
                      </div>
                      {data.genderStats.female.topPR && (
                        <div className="pt-1 border-t border-border/50">
                          <p className="text-[10px] text-muted-foreground">Nejlepší PR</p>
                          <p className="text-xs font-medium truncate">{data.genderStats.female.topPR.exerciseName}</p>
                          <p className="text-xs text-success font-bold">{data.genderStats.female.topPR.estimated1RM} kg</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState period={period} onExtend={() => setPeriod('6months')} />
          )}
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-3">
          {data?.clientLeaderboard && data.clientLeaderboard.length > 0 ? (
            <div className="space-y-1.5">
              {data.clientLeaderboard.slice(0, 6).map((client, i) => (
                <div 
                  key={client.clientId} 
                  className={cn(
                    "flex items-center justify-between gap-2 p-2.5 rounded-lg",
                    i === 0 ? "bg-warning/10 border border-warning/20" : "bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      i === 0 ? 'bg-warning text-warning-foreground' : 
                      i === 1 ? 'bg-slate-400 text-slate-900' :
                      i === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-secondary text-muted-foreground'
                    )}>
                      {i < 3 ? <Crown className="w-3 h-3" /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{client.clientName}</p>
                        {(client.gender === 'male' || client.gender === 'female') && (
                          <GenderIcon gender={client.gender} className="w-3 h-3 flex-shrink-0" />
                        )}
                      </div>
                      {client.topPR && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          Top: {client.topPR.exerciseName} ({client.topPR.estimated1RM} kg)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-foreground">{client.prCount}</p>
                    <p className="text-[10px] text-muted-foreground">PR</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState period={period} onExtend={() => setPeriod('6months')} />
          )}
        </TabsContent>
      </Tabs>

      {/* Footer link */}
      <Link
        to="/pr-history"
        className="flex items-center justify-center gap-1 pt-3 border-t border-border/50 text-xs text-primary hover:text-primary/80"
      >
        Zobrazit vše <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function EmptyState({ period, onExtend }: { period: PRPeriod; onExtend: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Medal className="w-8 h-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm font-medium text-foreground mb-1">Zatím málo dat</p>
      <p className="text-xs text-muted-foreground mb-3">
        Pro zobrazení grafu je potřeba více PR záznamů
      </p>
      {period !== '12months' && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onExtend}
        >
          Zobrazit delší období
        </Button>
      )}
    </div>
  );
}
