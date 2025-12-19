import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useFeatureStats, ALL_FEATURES, CATEGORY_LABELS, StatsPeriod, useClearFeatureStats } from '@/hooks/useFeatureStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2,
  Download,
  Users,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 60%)',
  'hsl(280, 70%, 60%)',
  'hsl(320, 70%, 60%)',
];

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: '7d', label: '7 dní' },
  { value: '30d', label: '30 dní' },
  { value: '90d', label: '90 dní' },
  { value: 'all', label: 'Vše' },
];

export function FeatureUsageStats() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<StatsPeriod>('30d');
  const { 
    topFeatures, 
    categoryBreakdown, 
    trendData, 
    unusedFeatures, 
    totalUsage, 
    isLoading,
    sessionStats,
    dauData,
    successRate
  } = useFeatureStats(period);
  const clearStats = useClearFeatureStats();

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getFeatureLabel = (name: string) => {
    const feature = ALL_FEATURES.find(f => f.name === name);
    return feature?.label || name;
  };

  const handleExport = () => {
    const csvContent = [
      ['Funkce', 'Kategorie', 'Počet použití'],
      ...topFeatures.map(f => [
        getFeatureLabel(f.feature_name),
        CATEGORY_LABELS[f.feature_category] || f.feature_category,
        f.count.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feature-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Statistiky exportovány');
  };

  const handleClear = async () => {
    try {
      await clearStats();
      toast.success('Statistiky vymazány');
    } catch (error) {
      toast.error('Chyba při mazání statistik');
    }
  };

  const pieData = categoryBreakdown.map((c, i) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.count,
    fill: COLORS[i % COLORS.length]
  }));

  const barData = topFeatures.slice(0, 10).map(f => ({
    name: getFeatureLabel(f.feature_name),
    count: f.count,
    category: CATEGORY_LABELS[f.feature_category] || f.feature_category
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Statistiky využívání</h3>
          <p className="text-sm text-muted-foreground">
            Celkem {totalUsage} použití za zvolené období
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
              className="rounded-full"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Celkem akcí</span>
            </div>
            <div className="text-2xl font-bold">{totalUsage}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <div className="text-2xl font-bold">{sessionStats?.totalSessions || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Ø délka session</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(sessionStats?.avgDuration || 0)}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Úspěšnost</span>
            </div>
            <div className="text-2xl font-bold">{successRate?.toFixed(1) || 100}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{topFeatures.length}</div>
            <p className="text-sm text-muted-foreground">Aktivních funkcí</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-500">{unusedFeatures.length}</div>
            <p className="text-sm text-muted-foreground">Nepoužívaných</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{categoryBreakdown.length}</div>
            <p className="text-sm text-muted-foreground">Kategorií</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {topFeatures[0]?.count || 0}
            </div>
            <p className="text-sm text-muted-foreground">Top funkce</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="overview">Přehled</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="details">Detail</TabsTrigger>
          <TabsTrigger value="unused">Nepoužívané</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Trend Chart */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Trend využívání</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'd.M.', { locale: cs })}
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'd. MMMM yyyy', { locale: cs })}
                      formatter={(value: number) => [value, 'Použití']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1}
                      fill="url(#colorUsage)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Categories Pie + Top Features Bar */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kategorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, 'Použití']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {pieData.slice(0, 5).map((item, i) => (
                    <Badge 
                      key={i} 
                      variant="outline"
                      style={{ borderColor: item.fill, color: item.fill }}
                    >
                      {item.name}: {item.value}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 10 funkcí</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={100}
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          `${value} použití`,
                          props.payload.category
                        ]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          {/* DAU Chart */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5" />
                Denní aktivní uživatelé (DAU)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dauData || []}>
                    <defs>
                      <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'd.M.', { locale: cs })}
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                      allowDecimals={false}
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'd. MMMM yyyy', { locale: cs })}
                      formatter={(value: number) => [value, 'Uživatelů']}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--chart-2))" 
                      fillOpacity={1}
                      fill="url(#colorDau)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Device & Browser Breakdown */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Zařízení</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(sessionStats?.deviceBreakdown || []).map((item) => (
                    <div key={item.device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(item.device)}
                        <span className="capitalize">{item.device || 'Neznámé'}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {(!sessionStats?.deviceBreakdown?.length) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Zatím žádná data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Prohlížeč</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(sessionStats?.browserBreakdown || []).slice(0, 5).map((item, i) => (
                    <div key={item.browser} className="flex items-center justify-between">
                      <span className="truncate max-w-[120px]">{item.browser || 'Neznámý'}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {(!sessionStats?.browserBreakdown?.length) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Zatím žádná data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Operační systém</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(sessionStats?.osBreakdown || []).slice(0, 5).map((item, i) => (
                    <div key={item.os} className="flex items-center justify-between">
                      <span className="truncate max-w-[120px]">{item.os || 'Neznámý'}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {(!sessionStats?.osBreakdown?.length) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Zatím žádná data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Usage + Sessions Chart */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aktivita vs Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'd.M.', { locale: cs })}
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      yAxisId="left"
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'd. MMMM yyyy', { locale: cs })}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="count" 
                      name="Akce"
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      opacity={0.7}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="sessions" 
                      name="Sessions"
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Všechny funkce</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {topFeatures.map((feature, i) => (
                    <div 
                      key={feature.feature_name}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-muted-foreground w-8">
                          #{i + 1}
                        </span>
                        <div>
                          <p className="font-medium">{getFeatureLabel(feature.feature_name)}</p>
                          <p className="text-sm text-muted-foreground">
                            {CATEGORY_LABELS[feature.feature_category] || feature.feature_category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {feature.count}×
                        </Badge>
                        {i === 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                      </div>
                    </div>
                  ))}
                  {topFeatures.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Zatím žádná data
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unused">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Nepoužívané funkce ({unusedFeatures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tyto funkce nebyly ve zvoleném období použity. Zvažte jejich vylepšení nebo odstranění.
              </p>
              <ScrollArea className="h-[300px]">
                <div className="grid gap-2">
                  {unusedFeatures.map(feature => (
                    <div 
                      key={feature.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <div>
                        <p className="font-medium">{feature.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_LABELS[feature.category] || feature.category}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                        0 použití
                      </Badge>
                    </div>
                  ))}
                  {unusedFeatures.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <p>Všechny funkce jsou využívány!</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Vymazat statistiky
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vymazat statistiky?</AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce smaže všechny nasbírané statistiky využívání funkcí. Tuto akci nelze vrátit.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Vymazat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
