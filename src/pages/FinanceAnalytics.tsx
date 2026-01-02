import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  ShoppingBag,
  DollarSign,
  HelpCircle
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  useFinanceAnalytics, 
  FinancePeriodType,
} from '@/hooks/useFinanceAnalytics';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const PERIOD_OPTIONS: { value: FinancePeriodType; label: string }[] = [
  { value: 'month', label: 'Měsíc' },
  { value: '90days', label: '3 měsíce' },
  { value: 'year', label: 'Rok' },
];

const CHART_COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--chart-2))', 
];

export default function FinanceAnalytics() {
  usePageTracking('finance_analytics');
  const navigate = useNavigate();
  const [periodType, setPeriodType] = useState<FinancePeriodType>('month');

  const { data, isLoading, error } = useFinanceAnalytics({
    periodType,
    selectedClientIds: [],
    comparisonMode: 'history',
  });

  // Calculate period comparison percentages
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalChange = data?.previousPeriod 
    ? getChangePercent(data.totalIncome, data.previousPeriod.totalIncome) 
    : 0;
  const trainingChange = data?.previousPeriod 
    ? getChangePercent(data.trainingIncome, data.previousPeriod.trainingIncome) 
    : 0;
  const productChange = data?.previousPeriod 
    ? getChangePercent(data.productIncome, data.previousPeriod.productIncome) 
    : 0;

  // Prepare chart data
  const trendData = data?.trend.map(item => ({
    label: item.label,
    value: item.value,
  })) || [];

  const distributionData = [
    { name: 'Tréninky', value: data?.trainingIncome || 0 },
    { name: 'Produkty', value: data?.productIncome || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Analytika financí</h1>
          </div>
        </div>

        {/* Period Toggle */}
        <div className="flex gap-2 mb-6">
          {PERIOD_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={periodType === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[300px] rounded-xl" />
            <Skeleton className="h-[250px] rounded-xl" />
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="pt-6 text-center text-destructive">
              Chyba při načítání dat
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI Cards with comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Income */}
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Celkový příjem</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(data.totalIncome)}
                </p>
                {data.previousPeriod && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm mt-1",
                    totalChange >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {totalChange >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{totalChange >= 0 ? '+' : ''}{totalChange.toFixed(0)}%</span>
                    <span className="text-muted-foreground text-xs">vs předchozí</span>
                  </div>
                )}
              </Card>

              {/* Training Income */}
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Dumbbell className="w-4 h-4" />
                  <span className="text-xs">Z tréninků</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.trainingIncome)}
                </p>
                {data.previousPeriod && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm mt-1",
                    trainingChange >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {trainingChange >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{trainingChange >= 0 ? '+' : ''}{trainingChange.toFixed(0)}%</span>
                    <span className="text-muted-foreground text-xs">vs předchozí</span>
                  </div>
                )}
              </Card>

              {/* Product Income */}
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="text-xs">Z produktů</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.productIncome)}
                </p>
                {data.previousPeriod && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm mt-1",
                    productChange >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {productChange >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{productChange >= 0 ? '+' : ''}{productChange.toFixed(0)}%</span>
                    <span className="text-muted-foreground text-xs">vs předchozí</span>
                  </div>
                )}
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-medium">Trend příjmů</CardTitle>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">
                          Graf zobrazuje celkový příjem (tréninky + produkty) po jednotlivých dnech za vybrané období. 
                          Hodnoty jsou součtem stržených kreditů od klientů.
                        </p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        className="text-xs fill-muted-foreground" 
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${Math.round(value/1000)}k` : value}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                <p className="text-sm font-medium">{formatCurrency(payload[0].value as number)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Žádná data za vybrané období
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribution Donut */}
            {distributionData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Rozložení příjmů</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {distributionData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              const percentage = data.totalIncome > 0 
                                ? ((d.value / data.totalIncome) * 100).toFixed(0) 
                                : 0;
                              return (
                                <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                  <p className="text-sm font-medium">{d.name}</p>
                                  <p className="text-xs">{formatCurrency(d.value)}</p>
                                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-3 min-w-[140px]">
                      {distributionData.map((item, index) => {
                        const percentage = data.totalIncome > 0 
                          ? ((item.value / data.totalIncome) * 100).toFixed(0) 
                          : 0;
                        return (
                          <div key={item.name} className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.value)} ({percentage}%)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
