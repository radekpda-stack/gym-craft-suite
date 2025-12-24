import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendAreaChart, DistributionDonutChart } from '@/components/analytics';
import { FinanceAnalyticsData } from '@/hooks/useFinanceAnalytics';
import { formatCurrency } from '@/lib/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface FinanceAnalyticsDetailViewProps {
  data: FinanceAnalyticsData;
}

export function FinanceAnalyticsDetailView({ data }: FinanceAnalyticsDetailViewProps) {
  const trendData = data.trend.map(item => ({
    label: item.label,
    value: item.value,
  }));

  const clientChartData = data.clientBreakdown.slice(0, 10).map(client => ({
    name: client.clientName.length > 12 
      ? client.clientName.substring(0, 12) + '...' 
      : client.clientName,
    fullName: client.clientName,
    value: client.totalIncome,
    training: client.trainingIncome,
    products: client.productIncome,
  }));

  // Calculate period comparison
  const incomeChange = data.previousPeriod 
    ? ((data.totalIncome - data.previousPeriod.totalIncome) / (data.previousPeriod.totalIncome || 1)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary with comparison */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Souhrn období</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold">{formatCurrency(data.totalIncome)}</div>
              <div className="text-xs text-muted-foreground">Celkový příjem</div>
              {data.previousPeriod && (
                <div className={`text-xs mt-1 ${incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}% vs minulé období
                </div>
              )}
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold">{formatCurrency(data.trainingIncome)}</div>
              <div className="text-xs text-muted-foreground">Z tréninků</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.totalIncome > 0 ? ((data.trainingIncome / data.totalIncome) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold">{formatCurrency(data.productIncome)}</div>
              <div className="text-xs text-muted-foreground">Z produktů</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.totalIncome > 0 ? ((data.productIncome / data.totalIncome) * 100).toFixed(0) : 0}%
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-background/50">
              <div className="text-2xl font-bold">{formatCurrency(data.averagePerClient)}</div>
              <div className="text-xs text-muted-foreground">Průměr na klienta</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.clientBreakdown.length} klientů
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Trend příjmů v čase</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendAreaChart 
            data={trendData} 
            height={250}
            gradient={{ id: "finance-detail-trend", color: "hsl(var(--primary))" }}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Rozložení příjmů</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionDonutChart 
              data={data.distribution.map(d => ({ 
                name: d.name, 
                value: d.value, 
                percentage: data.totalIncome > 0 ? Math.round((d.value / data.totalIncome) * 100) : 0 
              }))} 
              height={250}
            />
          </CardContent>
        </Card>

        {/* Client Breakdown */}
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Příjmy podle klientů</CardTitle>
          </CardHeader>
          <CardContent>
            {clientChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clientChartData} layout="vertical">
                  <XAxis 
                    type="number" 
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return (payload[0].payload as any).fullName;
                      }
                      return label;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {clientChartData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Žádná data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Client List */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Kompletní přehled klientů</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.clientBreakdown.map((client, index) => (
              <div 
                key={client.clientId}
                className="flex items-center justify-between p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                  <div>
                    <div className="font-medium">{client.clientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {client.transactionCount} transakcí
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(client.totalIncome)}</div>
                  <div className="text-xs text-muted-foreground">
                    T: {formatCurrency(client.trainingIncome)} · P: {formatCurrency(client.productIncome)}
                  </div>
                </div>
              </div>
            ))}
            {data.clientBreakdown.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Žádná data za vybrané období
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
