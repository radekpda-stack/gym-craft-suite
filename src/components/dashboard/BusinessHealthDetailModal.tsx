import { useState } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle, Info, ArrowRight, Gauge, Calendar, Percent, DollarSign, Users, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
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

function DetailContent({ range, onRangeChange }: { range: TimeRange; onRangeChange: (r: TimeRange) => void }) {
  const { data, isLoading } = useBusinessHealthTrends(range);
  const isMobile = useIsMobile();

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

            {/* Quick component overview */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(data.components).map(([key, comp]) => {
                const labels: Record<string, string> = {
                  retention: 'Retence',
                  creditHealth: 'Zdraví kreditů',
                  revenueTrend: 'Trend příjmů',
                  payments: 'Platby',
                };
                const icons: Record<string, typeof Users> = {
                  retention: Users,
                  creditHealth: DollarSign,
                  revenueTrend: TrendingUp,
                  payments: Percent,
                };
                const Icon = icons[key] || Gauge;
                
                return (
                  <Card key={key} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium">{labels[key]}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {Math.round(comp.weight * 100)}%
                      </span>
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
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* SECTION B - Trends */}
          <TabsContent value="trends" className="space-y-4">
            {/* Revenue Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Příjmy (kredit + produkty)
                </CardTitle>
              </CardHeader>
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
              </CardContent>
            </Card>

            {/* Sessions/Workload Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Vytíženost (počet účastníků)
                </CardTitle>
              </CardHeader>
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
              </CardContent>
            </Card>

            {/* Cancellation Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Míra rušení (%)
                </CardTitle>
              </CardHeader>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION C - Breakdown */}
          <TabsContent value="breakdown" className="space-y-4">
            {Object.entries(data.components).map(([key, comp]) => {
              const labels: Record<string, { name: string; desc: string }> = {
                retention: { name: 'Retence / Aktivita', desc: 'Aktivní klienti vs celkem' },
                creditHealth: { name: 'Zdraví kreditů', desc: 'Klienti s kladným kreditem' },
                revenueTrend: { name: 'Trend příjmů', desc: 'Aktuální vs baseline (28 dní)' },
                payments: { name: 'Platební morálka', desc: 'Zaplacené vs nezaplacené' },
              };
              const info = labels[key] || { name: key, desc: '' };
              
              return (
                <Card key={key}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs text-muted-foreground">{info.desc}</div>
                      </div>
                      <Badge variant="outline">{Math.round(comp.weight * 100)}% váha</Badge>
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
