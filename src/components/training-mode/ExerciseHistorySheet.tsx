/**
 * ExerciseHistorySheet - Exercise history with Graph, Analysis, and History tabs
 */
import { useMemo } from 'react';
import { format, parseISO, subDays, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Dumbbell, Timer, Repeat, Ruler, TrendingUp, TrendingDown, Calendar, BarChart3, Activity } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExerciseHistory, ExerciseHistoryEntry } from '@/hooks/useExerciseHistory';
import { ExercisePR } from '@/hooks/useClientExercisePRs';
import { ExerciseProgressGraph } from '@/components/clients/ExerciseProgressGraph';
import { ExerciseInsightPanel } from '@/components/performance/ExerciseInsightPanel';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, CartesianGrid,
} from 'recharts';

// Metric type icon helper
function MetricIcon({ type, className }: { type: ExerciseHistoryEntry['metricType']; className?: string }) {
  switch (type) {
    case 'weight': return <Dumbbell className={cn("w-4 h-4", className)} />;
    case 'time': return <Timer className={cn("w-4 h-4", className)} />;
    case 'reps': return <Repeat className={cn("w-4 h-4", className)} />;
    case 'distance': return <Ruler className={cn("w-4 h-4", className)} />;
    default: return <Dumbbell className={cn("w-4 h-4", className)} />;
  }
}

// Get color classes for metric type
function getMetricColorClasses(type: ExerciseHistoryEntry['metricType']) {
  switch (type) {
    case 'weight': return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' };
    case 'time': return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' };
    case 'reps': return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' };
    case 'distance': return { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' };
    default: return { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' };
  }
}

// Single history entry row
function HistoryRow({ entry, previousEntry, isFirst }: { entry: ExerciseHistoryEntry; previousEntry?: ExerciseHistoryEntry; isFirst: boolean }) {
  const colors = getMetricColorClasses(entry.metricType);
  let trend: 'up' | 'down' | null = null;
  if (previousEntry) {
    const currentValue = entry.weight_kg || entry.time_seconds || entry.distance_meters || entry.reps || 0;
    const previousValue = previousEntry.weight_kg || previousEntry.time_seconds || previousEntry.distance_meters || previousEntry.reps || 0;
    if (currentValue > previousValue) trend = entry.metricType === 'time' ? 'down' : 'up';
    else if (currentValue < previousValue) trend = entry.metricType === 'time' ? 'up' : 'down';
  }
  return (
    <div className={cn("flex items-center gap-3 py-3 px-3 rounded-xl transition-colors", isFirst ? "bg-primary/5 border border-primary/20" : "bg-secondary/50")}>
      <div className="flex flex-col items-center justify-center min-w-[60px]">
        <span className="text-xs text-muted-foreground uppercase">{format(parseISO(entry.date), 'MMM', { locale: cs })}</span>
        <span className="text-lg font-bold">{format(parseISO(entry.date), 'd')}</span>
        <span className="text-xs text-muted-foreground">{format(parseISO(entry.date), 'yyyy')}</span>
      </div>
      <div className={cn("p-2 rounded-lg", colors.bg)}>
        <MetricIcon type={entry.metricType} className={colors.text} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-lg font-bold", isFirst && "text-primary")}>{entry.displayValue}</span>
          {isFirst && <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">PR</Badge>}
        </div>
        {entry.rpe && <span className="text-xs text-muted-foreground">RPE {entry.rpe}</span>}
        {entry.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.notes}</p>}
      </div>
      {trend && (
        <div className={cn("p-1.5 rounded-full", trend === 'up' ? "bg-green-500/10" : "bg-red-500/10")}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
        </div>
      )}
    </div>
  );
}

// Analysis tab content
function AnalysisTab({ history, metricType }: { history: ExerciseHistoryEntry[]; metricType: ExerciseHistoryEntry['metricType'] }) {
  const getValue = (e: ExerciseHistoryEntry) => {
    switch (metricType) {
      case 'weight': return e.weight_kg || 0;
      case 'time': return e.time_seconds || 0;
      case 'reps': return e.reps || 0;
      case 'distance': return e.distance_meters || e.height_cm || 0;
    }
  };

  // Period comparison: last 30d vs previous 30d
  const periodComparison = useMemo(() => {
    const now = new Date();
    const d30 = subDays(now, 30);
    const d60 = subDays(now, 60);
    const recent = history.filter(e => parseISO(e.date) >= d30);
    const older = history.filter(e => { const d = parseISO(e.date); return d >= d60 && d < d30; });
    const avgRecent = recent.length > 0 ? recent.reduce((s, e) => s + getValue(e), 0) / recent.length : 0;
    const avgOlder = older.length > 0 ? older.reduce((s, e) => s + getValue(e), 0) / older.length : 0;
    const change = avgOlder > 0 ? Math.round(((avgRecent - avgOlder) / avgOlder) * 100) : 0;
    return { avgRecent: Math.round(avgRecent * 10) / 10, avgOlder: Math.round(avgOlder * 10) / 10, change, recentCount: recent.length, olderCount: older.length };
  }, [history, metricType]);

  // Consistency: sessions per month
  const consistency = useMemo(() => {
    if (history.length < 2) return 0;
    const dates = history.map(e => parseISO(e.date));
    const span = differenceInDays(dates[0], dates[dates.length - 1]);
    const months = Math.max(span / 30, 1);
    return Math.round((history.length / months) * 10) / 10;
  }, [history]);

  // RPE vs performance scatter data
  const rpeScatter = useMemo(() => {
    return history
      .filter(e => e.rpe && getValue(e) > 0)
      .map(e => ({ rpe: e.rpe!, performance: getValue(e), date: format(parseISO(e.date), 'd.M', { locale: cs }) }));
  }, [history, metricType]);

  // Weekly volume bars
  const weeklyVolume = useMemo(() => {
    const reversed = [...history].reverse();
    const weeks = new Map<string, number>();
    reversed.forEach(e => {
      const d = parseISO(e.date);
      const weekKey = format(d, 'w/yyyy');
      const vol = (e.sets || 1) * (e.reps || 1) * (e.weight_kg || 0);
      weeks.set(weekKey, (weeks.get(weekKey) || 0) + vol);
    });
    return Array.from(weeks.entries()).slice(-8).map(([week, volume]) => ({
      week: `T${week.split('/')[0]}`,
      volume: Math.round(volume),
    }));
  }, [history]);

  const getUnit = () => {
    switch (metricType) { case 'weight': return 'kg'; case 'time': return 's'; case 'reps': return 'reps'; case 'distance': return 'm'; }
  };

  return (
    <ScrollArea className="h-[calc(85vh-200px)]">
      <div className="space-y-5 pb-8 px-1">
        {/* Period comparison */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Srovnání období (30 dní)
          </h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Posl. 30d</p>
              <p className="text-lg font-bold">{periodComparison.avgRecent} {getUnit()}</p>
              <p className="text-[10px] text-muted-foreground">{periodComparison.recentCount} zázn.</p>
            </div>
            <div className="flex items-center justify-center">
              <Badge
                variant="secondary"
                className={cn(
                  "text-sm font-bold",
                  periodComparison.change > 0 ? "bg-success/10 text-success" :
                  periodComparison.change < 0 ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {periodComparison.change > 0 ? '+' : ''}{periodComparison.change}%
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Předch. 30d</p>
              <p className="text-lg font-bold">{periodComparison.avgOlder} {getUnit()}</p>
              <p className="text-[10px] text-muted-foreground">{periodComparison.olderCount} zázn.</p>
            </div>
          </div>
        </div>

        {/* Consistency */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
          <h4 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Konzistence
          </h4>
          <p className="text-2xl font-bold">{consistency}× <span className="text-sm font-normal text-muted-foreground">/ měsíc</span></p>
        </div>

        {/* RPE vs Performance scatter */}
        {rpeScatter.length >= 3 && (
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
            <h4 className="text-sm font-semibold mb-3">RPE vs Výkon</h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="rpe" name="RPE" type="number" domain={[5, 10]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="performance" name="Výkon" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v: number, name: string) => [name === 'RPE' ? v : `${v} ${getUnit()}`, name === 'rpe' ? 'RPE' : 'Výkon']}
                  />
                  <Scatter data={rpeScatter} fill="hsl(var(--primary))">
                    {rpeScatter.map((entry, i) => (
                      <Cell key={i} fill={entry.rpe >= 9 ? 'hsl(var(--destructive))' : entry.rpe >= 7 ? 'hsl(var(--warning))' : 'hsl(var(--success))'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Weekly volume */}
        {weeklyVolume.length >= 2 && weeklyVolume.some(w => w.volume > 0) && (
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
            <h4 className="text-sm font-semibold mb-3">Týdenní objem</h4>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyVolume} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v: number) => [`${v} kg·reps`, 'Objem']}
                  />
                  <Bar dataKey="volume" fill="hsl(var(--primary))" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Insight Panel */}
        <ExerciseInsightPanel history={history} metricType={metricType} />
      </div>
    </ScrollArea>
  );
}

interface ExerciseHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pr: ExercisePR | null;
  clientId: string;
  clientName?: string;
}

export function ExerciseHistorySheet({ open, onOpenChange, pr, clientId, clientName }: ExerciseHistorySheetProps) {
  const cleanExerciseName = pr?.exerciseName?.replace(/ \([LR]\)$/, '') || null;
  const { data: history = [], isLoading } = useExerciseHistory(
    open ? clientId : null, cleanExerciseName, pr?.exerciseId, pr?.side
  );

  const bestEntryId = history.length > 0
    ? history.reduce((best, entry) => {
        const currentValue = entry.weight_kg || entry.time_seconds || entry.distance_meters || entry.reps || 0;
        const bestValue = best.weight_kg || best.time_seconds || best.distance_meters || best.reps || 0;
        if (entry.metricType === 'time') return currentValue < bestValue ? entry : best;
        return currentValue > bestValue ? entry : best;
      }, history[0]).id
    : null;

  // Trend % (30d)
  const trend30d = useMemo(() => {
    if (history.length < 2) return null;
    const now = new Date();
    const d30 = subDays(now, 30);
    const d60 = subDays(now, 60);
    const getValue = (e: ExerciseHistoryEntry) => e.weight_kg || e.time_seconds || e.distance_meters || e.reps || 0;
    const recent = history.filter(e => parseISO(e.date) >= d30);
    const older = history.filter(e => { const d = parseISO(e.date); return d >= d60 && d < d30; });
    if (recent.length === 0 || older.length === 0) return null;
    const avgR = recent.reduce((s, e) => s + getValue(e), 0) / recent.length;
    const avgO = older.reduce((s, e) => s + getValue(e), 0) / older.length;
    if (avgO === 0) return null;
    return Math.round(((avgR - avgO) / avgO) * 100);
  }, [history]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            {pr && (
              <div className={cn("p-2.5 rounded-xl", getMetricColorClasses(pr.metricType).bg)}>
                <MetricIcon type={pr.metricType} className={getMetricColorClasses(pr.metricType).text} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-left truncate">{pr?.exerciseName || 'Historie cviku'}</SheetTitle>
              {clientName && <p className="text-sm text-muted-foreground mt-0.5">{clientName}</p>}
            </div>
            {pr && <Badge variant="secondary" className="font-mono font-bold text-base shrink-0">{pr.bestDisplay}</Badge>}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Calendar className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Žádné záznamy pro tento cvik</p>
          </div>
        ) : (
          <Tabs defaultValue="chart" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 w-full max-w-sm mx-auto mb-4">
              <TabsTrigger value="chart" className="gap-1.5 text-xs">
                <BarChart3 className="w-3.5 h-3.5" />
                Graf
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" />
                Analýza
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                Historie
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="flex-1 mt-0">
              <div className="px-2">
                <ExerciseProgressGraph history={history} metricType={pr?.metricType || 'weight'} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-6 px-2">
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{history.length}</p>
                  <p className="text-[10px] text-muted-foreground">záznamů</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{pr?.bestDisplay || '–'}</p>
                  <p className="text-[10px] text-muted-foreground">PR</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">
                    {history.length > 0 ? format(parseISO(history[0].date), 'd.M', { locale: cs }) : '–'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">poslední</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3 text-center">
                  {trend30d !== null ? (
                    <>
                      <p className={cn("text-xl font-bold", trend30d > 0 ? "text-success" : trend30d < 0 ? "text-destructive" : "")}>
                        {trend30d > 0 ? '+' : ''}{trend30d}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">30d trend</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl font-bold text-muted-foreground">–</p>
                      <p className="text-[10px] text-muted-foreground">trend</p>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 mt-0">
              <AnalysisTab history={history} metricType={pr?.metricType || 'weight'} />
            </TabsContent>

            <TabsContent value="list" className="flex-1 mt-0">
              <ScrollArea className="h-[calc(85vh-200px)]">
                <div className="space-y-2 pb-8">
                  {history.map((entry, index) => (
                    <HistoryRow key={entry.id} entry={entry} previousEntry={history[index + 1]} isFirst={entry.id === bestEntryId} />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {history.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>{history.length} záznamů</span>
              <span>•</span>
              <span>
                {format(parseISO(history[history.length - 1].date), 'd. M. yyyy', { locale: cs })} – {format(parseISO(history[0].date), 'd. M. yyyy', { locale: cs })}
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
