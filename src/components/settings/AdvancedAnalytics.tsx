/**
 * AdvancedAnalytics - Extended analytics dashboard
 * 
 * Displays:
 * - Click analytics & heatmap
 * - Rage click detection
 * - Scroll depth analysis
 * - Feature time tracking
 * - User journey funnels
 * - Performance metrics
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
} from 'recharts';
import {
  MousePointer2,
  AlertTriangle,
  ArrowDownToLine,
  Clock,
  Route,
  Gauge,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  XCircle,
  CheckCircle2,
  Smartphone,
  Monitor,
  Tablet,
  Trash2,
} from 'lucide-react';
import {
  useClickAnalytics,
  useRageClickAnalytics,
  useScrollAnalytics,
  useFeatureTimeAnalytics,
  useJourneyAnalytics,
  usePerformanceAnalytics,
  useClearAdvancedAnalytics,
  type AdvancedStatsPeriod,
} from '@/hooks/useAdvancedAnalytics';
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
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const PERIOD_OPTIONS: { value: AdvancedStatsPeriod; label: string }[] = [
  { value: '7d', label: '7 dní' },
  { value: '30d', label: '30 dní' },
  { value: '90d', label: '90 dní' },
  { value: 'all', label: 'Vše' },
];

export function AdvancedAnalytics() {
  const [period, setPeriod] = useState<AdvancedStatsPeriod>('30d');
  const queryClient = useQueryClient();
  
  const { data: clickData, isLoading: clickLoading } = useClickAnalytics(period);
  const { data: rageData, isLoading: rageLoading } = useRageClickAnalytics(period);
  const { data: scrollData, isLoading: scrollLoading } = useScrollAnalytics(period);
  const { data: featureTimeData, isLoading: featureTimeLoading } = useFeatureTimeAnalytics(period);
  const { data: journeyData, isLoading: journeyLoading } = useJourneyAnalytics(period);
  const { data: perfData, isLoading: perfLoading } = usePerformanceAnalytics(period);
  const clearAdvanced = useClearAdvancedAnalytics();

  const handleClear = async () => {
    try {
      await clearAdvanced();
      await queryClient.invalidateQueries({ queryKey: ['click-analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['rage-click-analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['scroll-analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['feature-time-analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['journey-analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['performance-analytics'] });
      toast.success('Rozšířené statistiky vymazány');
    } catch (error) {
      toast.error('Chyba při mazání statistik');
    }
  };

  const formatRoute = (route: string) => {
    return route.length > 30 ? route.slice(0, 30) + '...' : route;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getPerformanceColor = (ms: number | null) => {
    if (!ms) return 'text-muted-foreground';
    if (ms < 1000) return 'text-green-500';
    if (ms < 2500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const isLoading = clickLoading || rageLoading || scrollLoading || featureTimeLoading || journeyLoading || perfLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Rozšířená analytika</h3>
          <p className="text-sm text-muted-foreground">
            Detailní přehled interakcí, výkonu a uživatelského chování
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <MousePointer2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Kliknutí</span>
            </div>
            <div className="text-2xl font-bold">{clickData?.totalClicks || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Rage clicks</span>
            </div>
            <div className="text-2xl font-bold text-destructive">{rageData?.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownToLine className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Ø Scroll</span>
            </div>
            <div className="text-2xl font-bold">{scrollData?.avgOverallDepth || 0}%</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Čas v funkcích</span>
            </div>
            <div className="text-2xl font-bold">{featureTimeData?.totalTimeMinutes || 0}m</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Route className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Journeys</span>
            </div>
            <div className="text-2xl font-bold">{journeyData?.totalStarted || 0}</div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Ø Load</span>
            </div>
            <div className={`text-2xl font-bold ${getPerformanceColor(perfData?.avgMetrics?.pageLoad || null)}`}>
              {perfData?.avgMetrics?.pageLoad ? `${(perfData.avgMetrics.pageLoad / 1000).toFixed(1)}s` : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clicks" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-4">
          <TabsTrigger value="clicks">Kliknutí</TabsTrigger>
          <TabsTrigger value="rage">Rage clicks</TabsTrigger>
          <TabsTrigger value="scroll">Scroll</TabsTrigger>
          <TabsTrigger value="time">Čas</TabsTrigger>
          <TabsTrigger value="journeys">Journeys</TabsTrigger>
          <TabsTrigger value="performance">Výkon</TabsTrigger>
        </TabsList>

        {/* Click Analytics */}
        <TabsContent value="clicks" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Nejčastější kliknutí</CardTitle>
                <CardDescription>Top 10 nejkliknutějších prvků</CardDescription>
              </CardHeader>
              <CardContent>
                {clickLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {(clickData?.topClicks || []).slice(0, 10).map((click, i) => (
                        <div key={click.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{click.element_text || click.element_type}</p>
                              <p className="text-xs text-muted-foreground truncate">{click.route}</p>
                            </div>
                          </div>
                          <Badge>{click.count}×</Badge>
                        </div>
                      ))}
                      {(!clickData?.topClicks || clickData.topClicks.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          Žádná data
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Kliknutí podle stránek</CardTitle>
                <CardDescription>Které stránky mají nejvíce interakcí</CardDescription>
              </CardHeader>
              <CardContent>
                {clickLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(clickData?.topRoutes || []).slice(0, 8).map(r => ({
                          route: formatRoute(r.route),
                          count: r.count,
                        }))}
                        layout="vertical"
                        margin={{ left: 0, right: 20 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="route" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rage Clicks */}
        <TabsContent value="rage" className="space-y-4">
          {rageData?.total === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Žádné rage clicks!</h3>
                <p className="text-muted-foreground">Uživatelé neprojevují frustraci z opakovaného klikání.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card className="glass border-destructive/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Problematické stránky
                  </CardTitle>
                  <CardDescription>Stránky s nejvíce rage clicks</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {(rageData?.problemRoutes || []).map((route, i) => (
                        <div key={route.route} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium truncate">{route.route}</span>
                            <Badge variant="destructive">{route.count}×</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {route.elements.map((el, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {el}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Nedávné rage clicks</CardTitle>
                  <CardDescription>Posledních 10 frustrujících momentů</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {(rageData?.recentRageClicks || []).map((rc: any, i: number) => (
                        <div key={rc.id} className="p-2 rounded-lg bg-muted/50 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{rc.element_text || rc.element_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {rc.click_count} kliků / {rc.time_span_ms}ms
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{rc.route}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Scroll Analytics */}
        <TabsContent value="scroll" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Hloubka scrollování podle stránek</CardTitle>
              </CardHeader>
              <CardContent>
                {scrollLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {(scrollData?.routeStats || []).map((route) => (
                        <div key={route.route} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{formatRoute(route.route)}</span>
                            <span className="font-medium ml-2">{route.avgDepth}%</span>
                          </div>
                          <Progress value={route.avgDepth} className="h-2" />
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{route.visits} návštěv</span>
                            <span>•</span>
                            <span>{route.avgScrolls} scrollů</span>
                            <span>•</span>
                            <span>{route.scrollBackRate}% zpět</span>
                          </div>
                        </div>
                      ))}
                      {(!scrollData?.routeStats || scrollData.routeStats.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">Žádná data</div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  Stránky s nízkým scrollem
                </CardTitle>
                <CardDescription>Stránky kde uživatelé nečtou celý obsah (&lt;25%)</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {(scrollData?.lowScrollPages || []).length > 0 ? (
                    <div className="space-y-2">
                      {scrollData?.lowScrollPages.map((page) => (
                        <div key={page.route} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="font-medium truncate">{page.route}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={page.avgDepth} className="h-1 flex-1" />
                            <span className="text-sm text-amber-500">{page.avgDepth}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <p>Všechny stránky mají dobrý scroll engagement!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Time */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Čas strávený v funkcích</CardTitle>
                <CardDescription>Kde uživatelé tráví nejvíce času</CardDescription>
              </CardHeader>
              <CardContent>
                {featureTimeLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {(featureTimeData?.features || []).slice(0, 10).map((feature, i) => (
                        <div key={feature.name} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{feature.name}</p>
                              <p className="text-xs text-muted-foreground">{feature.category}</p>
                            </div>
                            <Badge>{feature.totalTimeMinutes}m</Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Ø čas</p>
                              <p className="font-medium">{feature.avgTimeMinutes}m</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ø aktivní</p>
                              <p className="font-medium">{feature.avgActiveTimeMinutes}m</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Ø kliknutí</p>
                              <p className="font-medium">{feature.avgClicks}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sessions</p>
                              <p className="font-medium">{feature.sessions}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!featureTimeData?.features || featureTimeData.features.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">Žádná data</div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Čas podle kategorií</CardTitle>
              </CardHeader>
              <CardContent>
                {featureTimeLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(featureTimeData?.categoryTime || []).slice(0, 6).map((c, i) => ({
                            name: c.category,
                            value: c.minutes,
                            fill: COLORS[i % COLORS.length],
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}m`}
                        >
                          {(featureTimeData?.categoryTime || []).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value} minut`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Journeys */}
        <TabsContent value="journeys" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Card className="glass">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{journeyData?.totalStarted || 0}</div>
                <p className="text-sm text-muted-foreground">Zahájeno</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-500">{journeyData?.totalCompleted || 0}</div>
                <p className="text-sm text-muted-foreground">Dokončeno</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{journeyData?.overallCompletionRate || 0}%</div>
                <p className="text-sm text-muted-foreground">Úspěšnost</p>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{journeyData?.journeys?.length || 0}</div>
                <p className="text-sm text-muted-foreground">Typů cest</p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Uživatelské cesty</CardTitle>
              <CardDescription>Sledování dokončení klíčových procesů</CardDescription>
            </CardHeader>
            <CardContent>
              {journeyLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Načítání...</div>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {(journeyData?.journeys || []).map((journey) => (
                      <div key={journey.type} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">{journey.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {journey.started} zahájeno • {journey.avgStepsCompleted} Ø kroků
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={journey.completionRate >= 70 ? 'default' : 'secondary'}>
                              {journey.completionRate}% úspěch
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{journey.completed} dokončeno</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span>{journey.abandoned} opuštěno</span>
                          </div>
                        </div>
                        <Progress value={journey.completionRate} className="h-2 mt-2" />
                      </div>
                    ))}
                    {(!journeyData?.journeys || journeyData.journeys.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Zatím žádné sledované cesty</p>
                        <p className="text-xs mt-1">Journeys se automaticky zaznamenávají při používání aplikace</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">LCP</span>
                </div>
                <div className={`text-2xl font-bold ${getPerformanceColor(perfData?.avgMetrics?.lcp || null)}`}>
                  {perfData?.avgMetrics?.lcp ? `${(perfData.avgMetrics.lcp / 1000).toFixed(2)}s` : '-'}
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">FCP</span>
                </div>
                <div className={`text-2xl font-bold ${getPerformanceColor(perfData?.avgMetrics?.fcp || null)}`}>
                  {perfData?.avgMetrics?.fcp ? `${(perfData.avgMetrics.fcp / 1000).toFixed(2)}s` : '-'}
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">TTFB</span>
                </div>
                <div className={`text-2xl font-bold ${getPerformanceColor(perfData?.avgMetrics?.ttfb || null)}`}>
                  {perfData?.avgMetrics?.ttfb ? `${perfData.avgMetrics.ttfb}ms` : '-'}
                </div>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Vzorků</span>
                </div>
                <div className="text-2xl font-bold">{perfData?.totalSamples || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  Pomalé stránky
                </CardTitle>
                <CardDescription>Stránky s dobou načtení &gt;1s</CardDescription>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    {(perfData?.slowPages || []).length > 0 ? (
                      <div className="space-y-2">
                        {perfData?.slowPages.map((page) => (
                          <div key={page.route} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10">
                            <span className="truncate flex-1">{formatRoute(page.route)}</span>
                            <Badge variant="outline" className="text-amber-500">
                              {(page.avgLoadMs / 1000).toFixed(2)}s
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                        <p>Všechny stránky se načítají rychle!</p>
                      </div>
                    )}
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Zařízení</CardTitle>
              </CardHeader>
              <CardContent>
                {perfLoading ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Načítání...</div>
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(perfData?.deviceBreakdown || []).map((d, i) => ({
                            name: d.device,
                            value: d.count,
                            fill: COLORS[i % COLORS.length],
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {(perfData?.deviceBreakdown || []).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Clear Button */}
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Vymazat rozšířené statistiky
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vymazat rozšířené statistiky?</AlertDialogTitle>
              <AlertDialogDescription>
                Tato akce smaže všechna data o kliknutích, rage clicks, scrollování, času v funkcích, journeys a výkonu. Tuto akci nelze vrátit.
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
