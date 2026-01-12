import { useState } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle, Info, ArrowRight, Gauge, Calendar, Percent, DollarSign, Users, XCircle, ChevronDown, HelpCircle, CreditCard, BarChart3, CheckCircle } from 'lucide-react';
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
import { useBusinessHealthTrends, TimeRange } from '@/hooks/useBusinessHealthTrends';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';

interface BusinessHealthDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG = {
  excellent: { label: 'Skvělé', color: 'text-success', bg: 'bg-success/20' },
  good: { label: 'Stabilní', color: 'text-primary', bg: 'bg-primary/20' },
  warning: { label: 'Vyžaduje pozornost', color: 'text-warning', bg: 'bg-warning/20' },
  critical: { label: 'Rizikové', color: 'text-destructive', bg: 'bg-destructive/20' },
};

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7', label: '7 dní' },
  { value: '30', label: '30 dní' },
  { value: '90', label: '90 dní' },
  { value: '180', label: '6 měsíců' },
];

// Detailed metric configuration with explanations
const METRIC_DETAILS = {
  retention: {
    name: 'Retence klientů',
    icon: Users,
    shortDesc: 'Aktivní klienti za posledních 60 dní',
    fullDesc: 'Měří, kolik procent vašich klientů bylo aktivních (měli alespoň jeden trénink) za posledních 60 dní. Vysoká retence znamená spokojené a loajální klienty.',
    calculation: 'Počet klientů s tréninkem (60 dní) ÷ Celkový počet aktivních klientů × 100',
    dataSource: 'Data z tabulky training_sessions a clients',
    weight: '30%',
    idealRange: '70-100%',
    warningThreshold: 'Pod 60% je nutná akce',
  },
  creditHealth: {
    name: 'Zdraví kreditů',
    icon: CreditCard,
    shortDesc: 'Klienti s kladným kreditem',
    fullDesc: 'Ukazuje finanční stabilitu vašeho podnikání. Měří procento klientů s kladným zůstatkem kreditu a penalizuje za klienty v dluhu.',
    calculation: '(Klienti s kreditem > 0 ÷ Celkem klientů × 100) - (Klienti v dluhu ÷ Celkem × 30)',
    dataSource: 'Data z pole credit_balance v tabulce clients',
    weight: '25%',
    idealRange: '80-100%',
    warningThreshold: 'Klienti v dluhu snižují skóre',
  },
  revenueTrend: {
    name: 'Trend příjmů',
    icon: BarChart3,
    shortDesc: 'Změna oproti baseline (28 dní)',
    fullDesc: 'Porovnává aktuální příjmy s vaším průměrem (baseline) za posledních 28 dní. Kladný trend znamená růst, záporný pokles.',
    calculation: '50 + ((Aktuální příjem - Baseline) ÷ Baseline × 50), omezeno na 0-100',
    dataSource: 'Data z final_price v training_sessions (completed)',
    weight: '25%',
    idealRange: '50+ (růst nebo stabilita)',
    warningThreshold: 'Pod 40% značí významný pokles',
  },
  payments: {
    name: 'Platební morálka',
    icon: CheckCircle,
    shortDesc: 'Zaplacené vs nezaplacené tréninky',
    fullDesc: 'Měří, kolik procent tréninků bylo zaplaceno. Vysoké číslo znamená dobrou platební morálku klientů a zdravý cash flow.',
    calculation: 'Zaplacené tréninky ÷ Celkové tréninky × 100',
    dataSource: 'Data z payment_status v training_sessions',
    weight: '20%',
    idealRange: '85-100%',
    warningThreshold: 'Pod 80% vyžaduje pozornost',
  },
};

const CHART_DETAILS = {
  revenue: {
    title: 'Příjmy (kredit + produkty)',
    desc: 'Zobrazuje příjmy z dobití kreditu a prodeje produktů v čase.',
    calculation: 'Součet credit_transactions (type: payment, manual, product) seskupený po dnech/týdnech',
    dataSource: 'Data z tabulky credit_transactions',
    tips: ['Zelená plocha = dobití kreditu', 'Fialová plocha = prodej produktů', 'Sledujte trendy, ne jednotlivé dny'],
  },
  sessions: {
    title: 'Vytíženost (počet účastníků)',
    desc: 'Ukazuje počet obsazených míst na trénincích v čase.',
    calculation: 'Součet participant_count pro completed tréninky seskupený po dnech/týdnech',
    dataSource: 'Data z training_sessions (status: completed)',
    tips: ['Vyšší sloupce = více práce', 'Sledujte sezónní trendy', 'Porovnejte s vašimi cíli'],
  },
  cancellations: {
    title: 'Míra rušení',
    desc: 'Procento zrušených tréninků z celkového počtu.',
    calculation: 'Zrušené tréninky ÷ (Zrušené + Dokončené) × 100',
    dataSource: 'Data z training_sessions (status: canceled vs completed)',
    tips: ['Ideálně pod 10%', 'Přerušovaná čára = benchmark 10%', 'Vysoká míra může značit problémy'],
  },
};

function DetailContent({ range, onRangeChange }: { range: TimeRange; onRangeChange: (r: TimeRange) => void }) {
  const { data, isLoading } = useBusinessHealthTrends(range);
  const isMobile = useIsMobile();
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

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
              {data.currentScore}
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
                      <p>Skóre měří odchylku od TVÉHO baseline, ne od fixní kapacity.</p>
                      <p className="text-muted-foreground mt-1">Baseline: posledních {data.baselineWindow} týdnů</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Aktualizováno: {format(new Date(data.lastComputed), 'd. MMMM HH:mm', { locale: cs })}
              </div>
            </div>
          </div>
          
          {/* Range selector */}
          <div className="flex gap-1 flex-wrap">
            {RANGE_OPTIONS.map(opt => (
              <Button
                key={opt.value}
                variant={range === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onRangeChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="summary">Shrnutí</TabsTrigger>
            <TabsTrigger value="trends">Trendy</TabsTrigger>
            <TabsTrigger value="breakdown">Rozpad</TabsTrigger>
            <TabsTrigger value="actions">Akce</TabsTrigger>
          </TabsList>

          {/* SECTION A - Summary */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Co se děje
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.explanations.map((exp, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{exp}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Quick component overview with expandable details */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data.components).map(([key, comp]) => {
                const metricDetail = METRIC_DETAILS[key as keyof typeof METRIC_DETAILS];
                if (!metricDetail) return null;
                
                const Icon = metricDetail.icon;
                const isExpanded = expandedMetric === key;
                
                return (
                  <Collapsible 
                    key={key} 
                    open={isExpanded}
                    onOpenChange={() => setExpandedMetric(isExpanded ? null : key)}
                  >
                    <Card className={cn(
                      'transition-all duration-200',
                      isExpanded && 'ring-2 ring-primary/50'
                    )}>
                      <CollapsibleTrigger asChild>
                        <div className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-medium">{metricDetail.name}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-xs">{metricDetail.shortDesc}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <div className="ml-auto flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {Math.round(comp.weight * 100)}%
                              </span>
                              <ChevronDown className={cn(
                                'w-3 h-3 text-muted-foreground transition-transform',
                                isExpanded && 'rotate-180'
                              )} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'text-xl font-bold',
                              comp.score >= 70 ? 'text-success' : 
                              comp.score >= 40 ? 'text-warning' : 'text-destructive'
                            )}>
                              {comp.score}
                            </span>
                            <Progress value={comp.score} className="h-1.5 flex-1" />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3"
                        >
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {metricDetail.fullDesc}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-muted/30 rounded">
                              <div className="text-muted-foreground/60 mb-0.5">Aktuální</div>
                              <div className="font-medium">
                                {key === 'revenueTrend' 
                                  ? `${comp.current.toLocaleString()} Kč`
                                  : `${comp.current}%`
                                }
                              </div>
                            </div>
                            <div className="p-2 bg-muted/30 rounded">
                              <div className="text-muted-foreground/60 mb-0.5">Baseline</div>
                              <div className="font-medium">
                                {key === 'revenueTrend' 
                                  ? `${comp.baseline.toLocaleString()} Kč`
                                  : `${comp.baseline}%`
                                }
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-[10px] text-muted-foreground/70">
                            <div className="flex items-start gap-1.5">
                              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium">Výpočet:</span> {metricDetail.calculation}
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="font-medium">📊 Zdroj:</span>
                              <span>{metricDetail.dataSource}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="font-medium">🎯 Ideální:</span>
                              <span>{metricDetail.idealRange}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="font-medium">⚠️ Varování:</span>
                              <span>{metricDetail.warningThreshold}</span>
                            </div>
                          </div>
                        </motion.div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </TabsContent>

          {/* SECTION B - Trends */}
          <TabsContent value="trends" className="space-y-4">
            {/* Revenue Trend */}
            <Collapsible 
              open={expandedChart === 'revenue'}
              onOpenChange={() => setExpandedChart(expandedChart === 'revenue' ? null : 'revenue')}
            >
              <Card className={cn(
                'transition-all duration-200',
                expandedChart === 'revenue' && 'ring-2 ring-primary/50'
              )}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {CHART_DETAILS.revenue.title}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{CHART_DETAILS.revenue.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-muted-foreground ml-auto transition-transform',
                        expandedChart === 'revenue' && 'rotate-180'
                      )} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(d) => format(new Date(d), 'd.M')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <RechartsTooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} Kč`]}
                          labelFormatter={(d) => format(new Date(d), 'd. MMMM', { locale: cs })}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="creditTopUp" 
                          stackId="1"
                          name="Kredit" 
                          fill="hsl(var(--primary))" 
                          stroke="hsl(var(--primary))"
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="productSales" 
                          stackId="1"
                          name="Produkty" 
                          fill="hsl(var(--accent))" 
                          stroke="hsl(var(--accent))"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 pt-4 border-t border-border/50 space-y-3"
                    >
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-start gap-1.5">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Výpočet:</span> {CHART_DETAILS.revenue.calculation}
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="font-medium">📊 Zdroj:</span>
                          <span>{CHART_DETAILS.revenue.dataSource}</span>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-muted-foreground">💡 Tipy:</div>
                        <ul className="list-disc list-inside text-muted-foreground/70 space-y-0.5">
                          {CHART_DETAILS.revenue.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>

            {/* Sessions/Workload Trend */}
            <Collapsible 
              open={expandedChart === 'sessions'}
              onOpenChange={() => setExpandedChart(expandedChart === 'sessions' ? null : 'sessions')}
            >
              <Card className={cn(
                'transition-all duration-200',
                expandedChart === 'sessions' && 'ring-2 ring-primary/50'
              )}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {CHART_DETAILS.sessions.title}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{CHART_DETAILS.sessions.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-muted-foreground ml-auto transition-transform',
                        expandedChart === 'sessions' && 'rotate-180'
                      )} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.sessionsTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(d) => format(new Date(d), 'd.M')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <RechartsTooltip 
                          formatter={(value: number) => [`${value} míst`]}
                          labelFormatter={(d) => format(new Date(d), 'd. MMMM', { locale: cs })}
                        />
                        <Bar 
                          dataKey="value" 
                          name="Místa" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 pt-4 border-t border-border/50 space-y-3"
                    >
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-start gap-1.5">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Výpočet:</span> {CHART_DETAILS.sessions.calculation}
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="font-medium">📊 Zdroj:</span>
                          <span>{CHART_DETAILS.sessions.dataSource}</span>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-muted-foreground">💡 Tipy:</div>
                        <ul className="list-disc list-inside text-muted-foreground/70 space-y-0.5">
                          {CHART_DETAILS.sessions.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>

            {/* Cancellation Trend */}
            <Collapsible 
              open={expandedChart === 'cancellations'}
              onOpenChange={() => setExpandedChart(expandedChart === 'cancellations' ? null : 'cancellations')}
            >
              <Card className={cn(
                'transition-all duration-200',
                expandedChart === 'cancellations' && 'ring-2 ring-primary/50'
              )}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      {CHART_DETAILS.cancellations.title}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{CHART_DETAILS.cancellations.desc}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <ChevronDown className={cn(
                        'w-4 h-4 text-muted-foreground ml-auto transition-transform',
                        expandedChart === 'cancellations' && 'rotate-180'
                      )} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CardContent>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.cancellationsTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(d) => format(new Date(d), 'd.M')}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" domain={[0, 100]} />
                        <RechartsTooltip 
                          formatter={(value: number) => [`${value}%`]}
                          labelFormatter={(d) => format(new Date(d), 'd. MMMM', { locale: cs })}
                        />
                        <ReferenceLine y={10} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          name="Míra rušení" 
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--destructive))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 pt-4 border-t border-border/50 space-y-3"
                    >
                      <div className="text-xs text-muted-foreground space-y-2">
                        <div className="flex items-start gap-1.5">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium">Výpočet:</span> {CHART_DETAILS.cancellations.calculation}
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="font-medium">📊 Zdroj:</span>
                          <span>{CHART_DETAILS.cancellations.dataSource}</span>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium text-muted-foreground">💡 Tipy:</div>
                        <ul className="list-disc list-inside text-muted-foreground/70 space-y-0.5">
                          {CHART_DETAILS.cancellations.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          </TabsContent>

          {/* SECTION C - Breakdown */}
          <TabsContent value="breakdown" className="space-y-4">
            {Object.entries(data.components).map(([key, comp]) => {
              const metricDetail = METRIC_DETAILS[key as keyof typeof METRIC_DETAILS];
              if (!metricDetail) return null;
              
              const Icon = metricDetail.icon;
              
              return (
                <Card key={key}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{metricDetail.name}</div>
                          <div className="text-xs text-muted-foreground">{metricDetail.shortDesc}</div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="space-y-2 text-xs">
                                <p>{metricDetail.fullDesc}</p>
                                <p className="text-muted-foreground"><strong>Výpočet:</strong> {metricDetail.calculation}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Badge variant="outline">{metricDetail.weight} váha</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{comp.score}</div>
                      <Progress value={comp.score} className="h-2 flex-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-muted-foreground text-xs">Aktuální</div>
                        <div className="font-medium">
                          {key === 'revenueTrend' 
                            ? `${comp.current.toLocaleString()} Kč`
                            : `${comp.current}%`
                          }
                        </div>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <div className="text-muted-foreground text-xs">Baseline</div>
                        <div className="font-medium">
                          {key === 'revenueTrend' 
                            ? `${comp.baseline.toLocaleString()} Kč`
                            : `${comp.baseline}%`
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* Extra info */}
                    <div className="mt-3 pt-3 border-t border-border/30 text-[10px] text-muted-foreground/60 space-y-1">
                      <div><strong>📊 Zdroj dat:</strong> {metricDetail.dataSource}</div>
                      <div><strong>🎯 Ideální rozmezí:</strong> {metricDetail.idealRange}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* SECTION D - Actions */}
          <TabsContent value="actions" className="space-y-3">
            {data.recommendedActions.length === 0 ? (
              <Card className="p-6 text-center">
                <div className="text-success text-4xl mb-2">✓</div>
                <div className="font-medium">Žádné urgentní akce</div>
                <div className="text-sm text-muted-foreground">
                  Váš byznys běží hladce!
                </div>
              </Card>
            ) : (
              data.recommendedActions.map((action, i) => {
                const icons = {
                  overdue: AlertTriangle,
                  low_credit: DollarSign,
                  inactive: Users,
                  cancellations: XCircle,
                };
                const Icon = icons[action.type] || AlertTriangle;
                
                return (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          action.type === 'overdue' ? 'bg-destructive/20 text-destructive' :
                          action.type === 'low_credit' ? 'bg-warning/20 text-warning' :
                          'bg-muted text-muted-foreground'
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{action.label}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {action.description}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={action.link}>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Data & Settings footer */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Baseline okno:</span>
                <span>{data.baselineWindow} týdnů</span>
              </div>
              <div className="flex justify-between">
                <span>Stav učení:</span>
                <span>{data.confidence >= 80 ? 'Stabilní' : 'Učí se'}</span>
              </div>
              <div className="flex justify-between">
                <span>Spolehlivost dat:</span>
                <span>{data.confidence}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

export function BusinessHealthDetailModal({ open, onOpenChange }: BusinessHealthDetailModalProps) {
  const isMobile = useIsMobile();
  const [range, setRange] = useState<TimeRange>('30');

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Business Health Score — Detail
            </DrawerTitle>
          </DrawerHeader>
          <DetailContent range={range} onRangeChange={setRange} />
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
            Business Health Score — Detail
          </DialogTitle>
        </DialogHeader>
        <DetailContent range={range} onRangeChange={setRange} />
      </DialogContent>
    </Dialog>
  );
}
