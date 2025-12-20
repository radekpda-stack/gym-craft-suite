import { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Wallet, 
  BarChart3,
  ChevronDown,
  ChevronUp,
  Target,
  Clock,
  Percent,
} from 'lucide-react';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function BusinessAnalyticsCard() {
  const { data, isLoading } = useBusinessAnalytics();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 sm:p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', { 
      style: 'currency', 
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const TrendBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => (
    <div className={cn(
      'flex items-center gap-0.5 text-[10px] font-medium',
      value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground'
    )}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : value < 0 ? <TrendingDown className="w-3 h-3" /> : null}
      {value > 0 ? '+' : ''}{value}{suffix}
    </div>
  );

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Business Analytics</h4>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? 'Méně' : 'Více'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Active clients */}
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-1 mb-0.5">
            <Users className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">Aktivní klienti</span>
          </div>
          <p className="text-lg font-bold text-foreground">{data.activeClientsCount}</p>
          <TrendBadge value={data.vsLastMonth.clients} />
        </div>

        {/* Monthly revenue */}
        <div className="p-2.5 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-1 mb-0.5">
            <Wallet className="w-3 h-3 text-success" />
            <span className="text-[10px] text-muted-foreground">Měsíční příjem</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {Math.round(data.totalRevenue / 1000)}k
          </p>
          <TrendBadge value={data.vsLastMonth.revenue} />
        </div>

        {/* Retention */}
        <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center gap-1 mb-0.5">
            <Percent className="w-3 h-3 text-warning" />
            <span className="text-[10px] text-muted-foreground">Retence</span>
          </div>
          <p className="text-lg font-bold text-foreground">{data.retentionRate}%</p>
          <p className="text-[10px] text-muted-foreground">churn {data.churnRate}%</p>
        </div>
      </div>

      {/* Income prediction chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Příjmy + predikce ({formatCurrency(data.predictedMonthlyIncome)} příští měsíc)
        </p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.incomeTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'actual' ? 'Skutečnost' : 'Predikce',
                ]}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#incomeGradient)"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#predictedGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Secondary metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ø životnost klienta</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {data.averageClientLifetimeMonths} 
                <span className="text-sm font-normal text-muted-foreground ml-1">měsíců</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/30">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Revenue/klient</span>
              </div>
              <p className="text-xl font-bold text-foreground">
                {formatCurrency(data.revenuePerClient)}
              </p>
            </div>
          </div>

          {/* Capacity & trainings */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-secondary/20">
              <p className="text-lg font-bold text-foreground">{data.monthlyTrainings}</p>
              <p className="text-[10px] text-muted-foreground">tréninků/měsíc</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/20">
              <p className="text-lg font-bold text-foreground">{data.avgTrainingsPerClient}</p>
              <p className="text-[10px] text-muted-foreground">Ø trén./klient</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/20">
              <p className={cn(
                'text-lg font-bold',
                data.capacityUtilization >= 80 ? 'text-success' :
                data.capacityUtilization >= 50 ? 'text-warning' : 'text-foreground'
              )}>
                {data.capacityUtilization}%
              </p>
              <p className="text-[10px] text-muted-foreground">kapacita</p>
            </div>
          </div>

          {/* Retention trend */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Trend retence klientů</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.retentionTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Retence']}
                  />
                  <Line
                    type="monotone"
                    dataKey="retentionRate"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: 'hsl(var(--warning))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
