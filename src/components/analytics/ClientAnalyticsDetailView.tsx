import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Users, Activity, TrendingUp } from 'lucide-react';
import { TrendAreaChart, DistributionDonutChart } from '@/components/analytics';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';
import type { ClientAnalyticsData } from '@/hooks/useClientAnalytics';

interface ClientAnalyticsDetailViewProps {
  data: ClientAnalyticsData;
  onClose: () => void;
}

export function ClientAnalyticsDetailView({ data, onClose }: ClientAnalyticsDetailViewProps) {
  const trendData = data.clientActivityTrend.map(d => ({ 
    label: d.label, 
    value: d.sessions,
    clients: d.activeClients 
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Detail analytiky klientů</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Full Activity Trend */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Aktivita klientů v čase
          </h3>
          <TrendAreaChart
            data={trendData}
            height={250}
            showGrid
            gradient={{ id: 'detailTrend', color: 'hsl(68 100% 50%)' }}
          />
        </div>

        {/* Activity Distribution Detail */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Rozložení aktivity podle počtu tréninků
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.activityDistribution} layout="vertical" margin={{ left: 80 }}>
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
                  dataKey="bucket"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  width={75}
                  tickFormatter={(v) => `${v} tréninků`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} klientů (${props.payload.percentage}%)`, 
                    ''
                  ]}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(68 100% 50%)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LTV Detail */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Lifetime Value (LTV) - rozložení
          </h3>
          <div className="space-y-3">
            {data.ltvDistribution.map(bucket => (
              <div key={bucket.bucket} className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
                <div className="flex-1">
                  <p className="font-medium">{bucket.bucket}</p>
                  <p className="text-xs text-muted-foreground">
                    Průměr: {bucket.avgLtv} tréninků
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{bucket.count}</p>
                  <p className="text-xs text-muted-foreground">klientů</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/10">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{data.activeClientsCount}</p>
            <p className="text-sm text-muted-foreground">aktivních</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{data.totalClientsCount - data.activeClientsCount}</p>
            <p className="text-sm text-muted-foreground">neaktivních</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{data.activePercentage}%</p>
            <p className="text-sm text-muted-foreground">aktivita</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
