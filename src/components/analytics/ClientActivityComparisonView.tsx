import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Minus, Calendar, User } from 'lucide-react';
import { TrendAreaChart } from '@/components/analytics';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import type { ClientActivityData } from '@/hooks/useClientAnalytics';

interface ClientActivityComparisonViewProps {
  data: ClientActivityData[];
  mode: 'clients' | 'average' | 'history';
  averageData?: {
    clientData: ClientActivityData;
    averageData: {
      avgSessions: number;
      avgVolume: number;
      avgSessionsPerMonth: number;
    };
    percentDiff: {
      sessions: number;
      volume: number;
      sessionsPerMonth: number;
    };
  };
  historyData?: {
    currentPeriod: ClientActivityData;
    previousPeriod: ClientActivityData;
    percentChange: {
      sessions: number;
      volume: number;
    };
  };
}

const CLIENT_COLORS = [
  'hsl(68 100% 50%)',
  'hsl(200 70% 50%)',
  'hsl(320 70% 55%)',
  'hsl(45 100% 55%)',
  'hsl(280 70% 60%)',
];

function formatVolume(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function DiffIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-sm font-medium text-primary">
        <TrendingUp className="w-4 h-4" />
        +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
        <TrendingDown className="w-4 h-4" />
        {value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
      <Minus className="w-4 h-4" />
      0%
    </span>
  );
}

export function ClientActivityComparisonView({ data, mode, averageData, historyData }: ClientActivityComparisonViewProps) {
  // Clients comparison mode
  if (mode === 'clients' && data.length > 1) {
    const barData = data.map(client => ({
      name: client.clientName,
      sessions: client.sessionCount,
      volume: client.totalVolume,
      avgPerMonth: client.avgSessionsPerMonth,
    }));

    const mergedTrend = data[0]?.activityTrend.map((point, i) => {
      const merged: any = { label: point.label };
      data.forEach((client, ci) => {
        merged[`client_${ci}`] = client.activityTrend[i]?.count || 0;
      });
      return merged;
    }) || [];

    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Porovnání klientů
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.map((client, i) => (
                <div 
                  key={client.clientId}
                  className="p-4 rounded-lg bg-muted/30 border-l-4"
                  style={{ borderLeftColor: CLIENT_COLORS[i % CLIENT_COLORS.length] }}
                >
                  <p className="font-medium truncate">{client.clientName}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-lg font-bold">{client.sessionCount}</p>
                    <p className="text-xs text-muted-foreground">tréninků</p>
                  </div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {client.avgSessionsPerMonth}/měsíc
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Srovnání počtu tréninků
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    horizontal={false}
                  />
                  <XAxis 
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Tréninků']}
                  />
                  <Bar 
                    dataKey="sessions" 
                    fill="hsl(68 100% 50%)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trend aktivity v čase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mergedTrend}>
                  <defs>
                    {data.map((_, i) => (
                      <linearGradient key={i} id={`clientGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CLIENT_COLORS[i % CLIENT_COLORS.length]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={CLIENT_COLORS[i % CLIENT_COLORS.length]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => {
                      const idx = parseInt(name.split('_')[1]);
                      return [value, data[idx]?.clientName || ''];
                    }}
                  />
                  <Legend formatter={(value) => {
                    const idx = parseInt(value.split('_')[1]);
                    return data[idx]?.clientName || '';
                  }} />
                  {data.map((_, i) => (
                    <Area
                      key={i}
                      type="monotone"
                      dataKey={`client_${i}`}
                      stroke={CLIENT_COLORS[i % CLIENT_COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#clientGrad-${i})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Average comparison mode
  if (mode === 'average' && averageData) {
    const { clientData, averageData: avg, percentDiff } = averageData;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Počet tréninků</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{clientData.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{Math.round(avg.avgSessions)}</p>
                  <p className="text-xs text-muted-foreground">Váš průměr</p>
                </div>
              </div>
              <DiffIndicator value={percentDiff.sessions} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Objem (kg)</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(clientData.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(avg.avgVolume)}</p>
                  <p className="text-xs text-muted-foreground">Váš průměr</p>
                </div>
              </div>
              <DiffIndicator value={percentDiff.volume} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Tréninků/měsíc</p>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <User className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{clientData.avgSessionsPerMonth}</p>
                  <p className="text-xs text-muted-foreground">{clientData.clientName}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{avg.avgSessionsPerMonth}</p>
                  <p className="text-xs text-muted-foreground">Váš průměr</p>
                </div>
              </div>
              <DiffIndicator value={percentDiff.sessionsPerMonth} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trend aktivity: {clientData.clientName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendAreaChart
              data={clientData.activityTrend.map(d => ({ label: d.label, value: d.count }))}
              height={200}
              showGrid
              gradient={{ id: 'avgTrend', color: 'hsl(68 100% 50%)' }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // History comparison mode
  if (mode === 'history' && historyData) {
    const { currentPeriod, previousPeriod, percentChange } = historyData;

    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Historie: {currentPeriod.clientName}
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Počet tréninků</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{currentPeriod.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">Aktuální</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{previousPeriod.sessionCount}</p>
                  <p className="text-xs text-muted-foreground">Předchozí</p>
                </div>
              </div>
              <DiffIndicator value={percentChange.sessions} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">Objem (kg)</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(currentPeriod.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">Aktuální</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <p className="text-lg font-bold">{formatVolume(previousPeriod.totalVolume)}</p>
                  <p className="text-xs text-muted-foreground">Předchozí</p>
                </div>
              </div>
              <DiffIndicator value={percentChange.volume} />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                Aktuální období
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendAreaChart
                data={currentPeriod.activityTrend.map(d => ({ label: d.label, value: d.count }))}
                height={150}
                gradient={{ id: 'histCurrent', color: 'hsl(68 100% 50%)' }}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                Předchozí období
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendAreaChart
                data={previousPeriod.activityTrend.map(d => ({ label: d.label, value: d.count }))}
                height={150}
                gradient={{ id: 'histPrevious', color: 'hsl(var(--muted-foreground))' }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
