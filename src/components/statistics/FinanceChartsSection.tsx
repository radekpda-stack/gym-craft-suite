import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  useFinanceAnalytics, 
  FinancePeriodType,
} from '@/hooks/useFinanceAnalytics';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

export function FinanceChartsSection() {
  const [periodType, setPeriodType] = useState<FinancePeriodType>('month');

  const { data, isLoading } = useFinanceAnalytics({
    periodType,
    selectedClientIds: [],
    comparisonMode: 'history',
  });

  // Prepare chart data
  const trendData = data?.trend.map(item => ({
    label: item.label,
    value: item.value,
  })) || [];

  const distributionData = [
    { name: 'Tréninky', value: data?.trainingIncome || 0 },
    { name: 'Produkty', value: data?.productIncome || 0 },
  ].filter(d => d.value > 0);

  // Calculate period comparison percentages
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const totalChange = data?.previousPeriod 
    ? getChangePercent(data.totalIncome, data.previousPeriod.totalIncome) 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[250px] rounded-xl" />
      </div>
    );
  }

  if (!data || trendData.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Period Toggle */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">Trend a rozložení</h3>
          <ToggleGroup
            type="single"
            value={periodType}
            onValueChange={(val) => val && setPeriodType(val as FinancePeriodType)}
            className="bg-muted/50 p-0.5 rounded-md"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                className="text-xs px-3 py-1 data-[state=on]:bg-background data-[state=on]:text-foreground"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">Trend příjmů</CardTitle>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">
                      Graf zobrazuje celkový příjem (tréninky + produkty) po jednotlivých dnech za vybrané období. 
                    </p>
                  </TooltipContent>
                </UITooltip>
              </div>
              {data.previousPeriod && (
                <div className={cn(
                  "flex items-center gap-1 text-sm",
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
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorIncomeTrend" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorIncomeTrend)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Donut */}
        {distributionData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Rozložení příjmů</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
    </TooltipProvider>
  );
}
