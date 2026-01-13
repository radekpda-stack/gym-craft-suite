import { useState } from 'react';
import { 
  X, TrendingUp, TrendingDown, Minus, AlertTriangle, Info, ArrowRight, 
  Gauge, DollarSign, Users, Clock, Shield, ChevronDown, HelpCircle, 
  CheckCircle, XCircle, Lightbulb, BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBusinessYieldScore, YieldPillar, YieldDriver } from '@/hooks/useBusinessYieldScore';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface BusinessYieldDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG = {
  excellent: { label: 'Výborný', color: 'text-success', bg: 'bg-success/20' },
  good: { label: 'Dobrý', color: 'text-primary', bg: 'bg-primary/20' },
  warning: { label: 'Vyžaduje pozornost', color: 'text-warning', bg: 'bg-warning/20' },
  critical: { label: 'Kritický', color: 'text-destructive', bg: 'bg-destructive/20' },
};

const PILLAR_CONFIG = {
  revenue: {
    name: 'Efektivita příjmů',
    icon: DollarSign,
    color: 'hsl(var(--success))',
    shortDesc: 'Jak efektivně převádíš čas na peníze',
    fullDesc: 'Měří příjem za hodinu, průměrnou cenu tréninku a podíl produktových příjmů. Porovnává s tvým 6měsíčním průměrem.',
    metrics: {
      revenuePerHour: 'Příjem/hod',
      avgTrainingPrice: 'Ø cena tréninku',
      totalRevenue: 'Celkový příjem',
      productShare: 'Podíl produktů',
    },
  },
  utilization: {
    name: 'Využití času',
    icon: Clock,
    color: 'hsl(var(--primary))',
    shortDesc: 'Jak dobře využíváš svou kapacitu',
    fullDesc: 'Měří vytížení kapacity (max 6h/den), míru rušení a pozdní zrušení. Porovnává s tvým 3měsíčním průměrem.',
    metrics: {
      capacityUtilization: 'Vytížení',
      actualHours: 'Odpracováno (h)',
      cancelRate: 'Míra rušení',
      lateCancelRate: 'Pozdní zrušení',
    },
  },
  clientQuality: {
    name: 'Kvalita klientů',
    icon: Users,
    color: 'hsl(var(--warning))',
    shortDesc: 'Retence a diverzifikace klientů',
    fullDesc: 'Měří aktivní klienty (30d), váženou retenci (30/60/90d), příjem na klienta a riziko koncentrace (top 20% klientů).',
    metrics: {
      activeClients: 'Aktivní klienti',
      retention30: 'Retence 30d',
      revenuePerClient: 'Příjem/klient',
      concentrationRisk: 'Koncentrace top20%',
    },
  },
  stability: {
    name: 'Stabilita',
    icon: Shield,
    color: 'hsl(var(--accent))',
    shortDesc: 'Platební morálka a finanční stabilita',
    fullDesc: 'Měří platební disciplínu (60d), nezaplacené položky dle stáří, dluhy klientů a variabilitu příjmů.',
    metrics: {
      paidRate: 'Zaplaceno',
      unpaidCount: 'Nezaplacených',
      totalDebt: 'Celkový dluh',
      clientsInDebt: 'Klientů v dluhu',
    },
  },
};

function TrendIndicator({ trend, value }: { trend: 'up' | 'down' | 'stable'; value: number }) {
  if (trend === 'stable') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <Minus className="w-3 h-3" /> {value}%
      </span>
    );
  }
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-1 text-success text-xs">
        <TrendingUp className="w-3 h-3" /> +{value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-destructive text-xs">
      <TrendingDown className="w-3 h-3" /> {value}%
    </span>
  );
}

function DriverBadge({ driver }: { driver: YieldDriver }) {
  const isPositive = driver.impact === 'positive';
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg text-xs',
      isPositive ? 'bg-success/10' : 'bg-destructive/10'
    )}>
      <div className={cn(
        'w-2 h-2 rounded-full',
        isPositive ? 'bg-success' : 'bg-destructive'
      )} />
      <span className="flex-1">{driver.label}</span>
      <span className="font-medium">{driver.value}</span>
    </div>
  );
}

function DetailContent() {
  const { data, isLoading } = useBusinessYieldScore();
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nepodařilo se načíst data.
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[data.status];
  const positiveDrivers = data.drivers.filter(d => d.impact === 'positive').slice(0, 3);
  const negativeDrivers = data.drivers.filter(d => d.impact === 'negative').slice(0, 3);

  return (
    <ScrollArea className="h-[calc(100vh-120px)] md:h-[70vh]">
      <div className="space-y-6 p-4">
        {/* Header with score and status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold',
              statusConfig.bg, statusConfig.color
            )}>
              {data.score}
            </div>
            <div>
              <Badge className={cn('mb-1', statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>Spolehlivost: {data.confidence}%</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Spolehlivost roste s množstvím dat (tréninků).</p>
                      <p className="text-muted-foreground mt-1">Datových bodů: {data.dataPointsCount}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {data.weekChange !== 0 && (
                <div className="text-xs mt-1 flex items-center gap-1">
                  {data.weekChange > 0 ? (
                    <span className="text-success flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +{data.weekChange} za týden
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> {data.weekChange} za týden
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Aktualizováno: {format(new Date(data.lastComputed), 'd. MMMM HH:mm', { locale: cs })}
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="overview">Přehled</TabsTrigger>
            <TabsTrigger value="timeline">Historie</TabsTrigger>
            <TabsTrigger value="pillars">Pilíře</TabsTrigger>
            <TabsTrigger value="drivers">Faktory</TabsTrigger>
          </TabsList>

          {/* SECTION A - Overview */}
          <TabsContent value="overview" className="space-y-4">
            {/* Insights */}
            <div className="grid gap-3 md:grid-cols-3">
              <Card className="bg-success/5 border-success/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" />
                    Co funguje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {data.insights.whatWorks.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-success">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-warning/5 border-warning/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    Co brzdí
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {data.insights.whatSlows.length > 0 ? (
                      data.insights.whatSlows.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-warning">•</span>
                          <span>{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">Nic kritického</li>
                    )}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Lightbulb className="w-4 h-4" />
                    Doporučení
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {data.insights.recommendations.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Quick pillar overview */}
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(data.pillars) as [keyof typeof PILLAR_CONFIG, YieldPillar][]).map(([key, pillar]) => {
                const config = PILLAR_CONFIG[key];
                const Icon = config.icon;
                
                return (
                  <Card key={key}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium truncate">{config.name}</span>
                        <div className="ml-auto">
                          <TrendIndicator trend={pillar.trend} value={pillar.trendValue} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xl font-bold',
                          pillar.score >= 70 ? 'text-success' : 
                          pillar.score >= 40 ? 'text-warning' : 'text-destructive'
                        )}>
                          {pillar.score}
                        </span>
                        <Progress value={pillar.score} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(pillar.weight * 100)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Unpaid aging buckets */}
            {data.unpaidAging.some(b => b.count > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Nezaplacené položky dle stáří
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {data.unpaidAging.map((bucket) => (
                      <div 
                        key={bucket.range} 
                        className={cn(
                          'p-2 rounded-lg',
                          bucket.range === '31+' && bucket.count > 0 ? 'bg-destructive/10' :
                          bucket.count > 0 ? 'bg-warning/10' : 'bg-muted/30'
                        )}
                      >
                        <div className="text-xs text-muted-foreground">{bucket.range} dní</div>
                        <div className="text-lg font-bold">{bucket.count}×</div>
                        <div className="text-xs">{Math.round(bucket.amount).toLocaleString()} Kč</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SECTION B - Timeline */}
          <TabsContent value="timeline" className="space-y-4">
            {/* Score timeline */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Vývoj skóre (12 týdnů)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.timeline}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="weekLabel" 
                        className="text-xs"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        className="text-xs" 
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                      />
                      <RechartsTooltip 
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = {
                            totalScore: 'Celkové skóre',
                            revenue: 'Příjmy',
                            utilization: 'Využití',
                            clientQuality: 'Kvalita klientů',
                            stability: 'Stabilita',
                          };
                          return [value, labels[name] || name];
                        }}
                      />
                      <Legend 
                        formatter={(value) => {
                          const labels: Record<string, string> = {
                            totalScore: 'Celkové',
                            revenue: 'Příjmy',
                            utilization: 'Využití',
                            clientQuality: 'Klienti',
                            stability: 'Stabilita',
                          };
                          return labels[value] || value;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalScore" 
                        stroke="hsl(var(--foreground))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={PILLAR_CONFIG.revenue.color}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="utilization" 
                        stroke={PILLAR_CONFIG.utilization.color}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clientQuality" 
                        stroke={PILLAR_CONFIG.clientQuality.color}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="stability" 
                        stroke={PILLAR_CONFIG.stability.color}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Week over week summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Změna za poslední týden</span>
                  <div className={cn(
                    'text-lg font-bold',
                    data.weekChange > 0 ? 'text-success' : 
                    data.weekChange < 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}>
                    {data.weekChange > 0 ? '+' : ''}{data.weekChange} bodů
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION C - Pillars detail */}
          <TabsContent value="pillars" className="space-y-4">
            {(Object.entries(data.pillars) as [keyof typeof PILLAR_CONFIG, YieldPillar][]).map(([key, pillar]) => {
              const config = PILLAR_CONFIG[key];
              const Icon = config.icon;
              const isExpanded = expandedPillar === key;
              
              return (
                <Collapsible 
                  key={key} 
                  open={isExpanded}
                  onOpenChange={() => setExpandedPillar(isExpanded ? null : key)}
                >
                  <Card className={cn(
                    'transition-all duration-200',
                    isExpanded && 'ring-2 ring-primary/50'
                  )}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5" style={{ color: config.color }} />
                            <div>
                              <div className="font-medium">{config.name}</div>
                              <div className="text-xs text-muted-foreground">{config.shortDesc}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{Math.round(pillar.weight * 100)}% váha</Badge>
                            <ChevronDown className={cn(
                              'w-4 h-4 text-muted-foreground transition-transform',
                              isExpanded && 'rotate-180'
                            )} />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            'text-2xl font-bold',
                            pillar.score >= 70 ? 'text-success' : 
                            pillar.score >= 40 ? 'text-warning' : 'text-destructive'
                          )}>
                            {pillar.score}
                          </span>
                          <Progress value={pillar.score} className="h-2 flex-1" />
                          <TrendIndicator trend={pillar.trend} value={pillar.trendValue} />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3"
                      >
                        <p className="text-sm text-muted-foreground">
                          {config.fullDesc}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(config.metrics).map(([metricKey, label]) => {
                            const value = pillar.metrics[metricKey];
                            let displayValue = value;
                            
                            // Format based on metric type
                            if (typeof value === 'number') {
                              if (metricKey.includes('Rate') || metricKey.includes('retention') || metricKey.includes('Utilization') || metricKey.includes('Share') || metricKey.includes('Risk')) {
                                displayValue = `${value}%`;
                              } else if (metricKey.includes('Revenue') || metricKey.includes('Price') || metricKey.includes('Debt') || metricKey.includes('PerClient') || metricKey.includes('PerHour')) {
                                displayValue = `${value.toLocaleString()} Kč`;
                              } else if (metricKey.includes('Hours')) {
                                displayValue = `${value}h`;
                              }
                            }
                            
                            return (
                              <div key={metricKey} className="p-2 bg-muted/30 rounded">
                                <div className="text-xs text-muted-foreground">{label}</div>
                                <div className="font-medium">{displayValue}</div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {!pillar.hasData && (
                          <div className="text-xs text-warning flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Nedostatek dat pro tento pilíř
                          </div>
                        )}
                      </motion.div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </TabsContent>

          {/* SECTION D - Drivers */}
          <TabsContent value="drivers" className="space-y-4">
            {positiveDrivers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-success">
                    <TrendingUp className="w-4 h-4" />
                    Pozitivní faktory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {positiveDrivers.map((driver) => (
                    <DriverBadge key={driver.id} driver={driver} />
                  ))}
                </CardContent>
              </Card>
            )}

            {negativeDrivers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <TrendingDown className="w-4 h-4" />
                    Negativní faktory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {negativeDrivers.map((driver) => (
                    <DriverBadge key={driver.id} driver={driver} />
                  ))}
                </CardContent>
              </Card>
            )}

            {data.drivers.length === 0 && (
              <Card className="p-6 text-center">
                <div className="text-muted-foreground text-4xl mb-2">📊</div>
                <div className="font-medium">Zatím nemáme dost dat</div>
                <div className="text-sm text-muted-foreground">
                  S více tréninky se ukáží faktory ovlivňující skóre.
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Rolling window:</span>
                <span>30 dní (porovnání s předchozími 30d)</span>
              </div>
              <div className="flex justify-between">
                <span>Baseline:</span>
                <span>6 měsíců (příjmy) / 3 měsíce (využití)</span>
              </div>
              <div className="flex justify-between">
                <span>Spolehlivost dat:</span>
                <span>{data.confidence}% ({data.dataPointsCount} datových bodů)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export function BusinessYieldDetailModal({ open, onOpenChange }: BusinessYieldDetailModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Business Yield Score — Detail
            </DrawerTitle>
          </DrawerHeader>
          <DetailContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Business Yield Score — Detail
          </DialogTitle>
        </DialogHeader>
        <DetailContent />
      </DialogContent>
    </Dialog>
  );
}
