import { useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Activity,
  Battery,
  Brain,
  Target,
  Moon,
  Zap,
  TrendingUp,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientFeedbackStats } from '@/hooks/useTrainingFeedback';
import { cn } from '@/lib/utils';

interface FeedbackStatisticsProps {
  clientId: string;
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  destructive: 'hsl(var(--destructive))',
  muted: 'hsl(var(--muted-foreground))',
};

const PIE_COLORS = ['#22c55e', '#eab308', '#ef4444'];

const MUSCLE_LABELS: Record<string, string> = {
  calves: 'Lýtka',
  quads: 'Přední stehna',
  hamstrings: 'Hamstringy',
  glutes: 'Hýždě',
  back: 'Záda',
  shoulders: 'Ramena',
  arms: 'Paže',
  abs: 'Břicho',
  chest: 'Hrudník',
};

const ENERGY_LABELS: Record<string, string> = {
  stable: 'Stabilní',
  better_end: 'Lepší ke konci',
  low_entire: 'Nízká celou dobu',
  good_start_only: 'Jen začátek dobrý',
};

const PAIN_AREA_LABELS: Record<string, string> = {
  neck: 'Krk',
  shoulder: 'Rameno',
  chest: 'Hrudník',
  hip: 'Kyčel',
  knee: 'Koleno',
  ankle: 'Kotník',
  wrist: 'Zápěstí',
  elbow: 'Loket',
  upper_back: 'Horní záda',
  lower_back: 'Dolní záda',
  glutes: 'Hýždě',
  hamstring: 'Zadní stehno',
  calf: 'Lýtko',
  other: 'Jiné',
};

export function FeedbackStatistics({ clientId }: FeedbackStatisticsProps) {
  const { stats, feedback } = useClientFeedbackStats(clientId);

  const muscleChartData = useMemo(() => {
    return Object.entries(stats.muscleFrequency)
      .map(([muscle, count]) => ({
        name: MUSCLE_LABELS[muscle] || muscle,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats.muscleFrequency]);

  const goalRelevanceData = useMemo(() => [
    { name: 'Ano', value: stats.goalRelevance.yes, color: PIE_COLORS[0] },
    { name: 'Částečně', value: stats.goalRelevance.partially, color: PIE_COLORS[1] },
    { name: 'Ne', value: stats.goalRelevance.no, color: PIE_COLORS[2] },
  ].filter(d => d.value > 0), [stats.goalRelevance]);

  const energyData = useMemo(() => {
    return Object.entries(stats.energyLevels)
      .map(([key, count]) => ({
        name: ENERGY_LABELS[key] || key,
        count,
      }))
      .filter(d => d.count > 0);
  }, [stats.energyLevels]);

  if (feedback.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Zatím žádná zpětná vazba</h3>
        <p className="text-sm text-muted-foreground">
          Po dokončení tréninku vyplňte zpětnou vazbu pro zobrazení statistik.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={Activity}
          label="Průměr RPE"
          value={stats.avgRpe.toFixed(1)}
          suffix="/10"
        />
        <SummaryCard
          icon={Battery}
          label="Průměr únava"
          value={stats.avgFatigue.toFixed(1)}
          suffix="/5"
        />
        <SummaryCard
          icon={Brain}
          label="Průměr nálada"
          value={stats.avgMood.toFixed(1)}
          suffix="/5"
        />
        <SummaryCard
          icon={Target}
          label="Průměr technika"
          value={stats.avgTechnique.toFixed(1)}
          suffix="/5"
        />
      </div>

      {/* Sleep Stats */}
      {stats.avgSleepHours > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <SummaryCard
            icon={Moon}
            label="Průměr spánek"
            value={stats.avgSleepHours.toFixed(1)}
            suffix=" hodin"
          />
          <SummaryCard
            icon={Zap}
            label="Kvalita spánku"
            value={stats.avgSleepQuality.toFixed(1)}
            suffix="/5"
          />
        </div>
      )}

      {/* RPE Over Time Chart */}
      <Card className="glass border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            RPE v čase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.rpeOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), 'd.M.', { locale: cs })}
                  className="text-xs"
                />
                <YAxis domain={[1, 10]} className="text-xs" />
                <Tooltip
                  labelFormatter={(v) => format(new Date(v), 'd.M.yyyy', { locale: cs })}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 4 }}
                  name="RPE"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Fatigue & Mood Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Battery className="w-4 h-4 text-orange-500" />
              Únava v čase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.fatigueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(new Date(v), 'd.M.', { locale: cs })}
                    className="text-xs"
                  />
                  <YAxis domain={[1, 5]} className="text-xs" />
                  <Tooltip
                    labelFormatter={(v) => format(new Date(v), 'd.M.yyyy', { locale: cs })}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 3 }}
                    name="Únava"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-green-500" />
              Nálada v čase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.moodOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(new Date(v), 'd.M.', { locale: cs })}
                    className="text-xs"
                  />
                  <YAxis domain={[1, 5]} className="text-xs" />
                  <Tooltip
                    labelFormatter={(v) => format(new Date(v), 'd.M.yyyy', { locale: cs })}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 3 }}
                    name="Nálada"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sleep vs RPE Scatter */}
      {stats.sleepVsRpe.length > 0 && (
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              Spánek vs. náročnost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    dataKey="sleepHours"
                    name="Spánek (hod)"
                    domain={[0, 12]}
                    className="text-xs"
                    label={{ value: 'Spánek (hod)', position: 'bottom', offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="rpe"
                    name="RPE"
                    domain={[1, 10]}
                    className="text-xs"
                    label={{ value: 'RPE', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => [value, name === 'sleepHours' ? 'Spánek' : 'RPE']}
                  />
                  <Scatter
                    data={stats.sleepVsRpe}
                    fill={CHART_COLORS.primary}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Muscle Soreness Frequency */}
      {muscleChartData.length > 0 && (
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Frekvence svalové bolesti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscleChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} name="Počet" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pain Area Intensity Statistics */}
      {stats.painAreaStats.byArea.length > 0 && (
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Intenzita bolesti podle oblastí
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Průměrná bolest</p>
                <p className="text-lg font-bold">
                  {stats.painAreaStats.avgOverallPain.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">/10</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Hlášení bolesti</p>
                <p className="text-lg font-bold">
                  {stats.painAreaStats.totalPainReports}
                  <span className="text-sm font-normal text-muted-foreground">x</span>
                </p>
              </div>
            </div>

            {/* Pain by area chart */}
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stats.painAreaStats.byArea.map(item => ({
                    name: PAIN_AREA_LABELS[item.area] || item.area,
                    avgIntensity: Number(item.avgIntensity.toFixed(1)),
                    maxIntensity: item.maxIntensity,
                    occurrences: item.occurrences,
                  }))} 
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 10]} className="text-xs" />
                  <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'avgIntensity') return [value, 'Ø intenzita'];
                      if (name === 'maxIntensity') return [value, 'Max intenzita'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="avgIntensity" fill="#f97316" radius={[0, 4, 4, 0]} name="avgIntensity" />
                  <Bar dataKey="maxIntensity" fill="#ef4444" radius={[0, 4, 4, 0]} name="maxIntensity" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-500" />
                Průměrná intenzita
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500" />
                Maximální intenzita
              </span>
            </div>

            {/* Detail list */}
            <div className="space-y-2 mt-4">
              {stats.painAreaStats.byArea.slice(0, 5).map((item) => (
                <div key={item.area} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-sm font-medium">
                    {PAIN_AREA_LABELS[item.area] || item.area}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {item.occurrences}× hlášeno
                    </span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full font-medium",
                      item.avgIntensity >= 7 ? "bg-red-500/20 text-red-500" :
                      item.avgIntensity >= 4 ? "bg-orange-500/20 text-orange-500" :
                      "bg-yellow-500/20 text-yellow-500"
                    )}>
                      Ø {item.avgIntensity.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Relevance & Energy Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Relevance vůči cíli
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalRelevanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {goalRelevanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Energie během tréninku
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {energyData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{item.count}×</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(item.count / feedback.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback count */}
      <p className="text-sm text-muted-foreground text-center">
        Celkem {feedback.length} zpětných vazeb
      </p>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  suffix?: string;
}

function SummaryCard({ icon: Icon, label, value, suffix }: SummaryCardProps) {
  return (
    <Card className="glass border-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">
              {value}
              <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
