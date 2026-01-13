import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinanceAnalyticsData, FinanceComparisonMode } from '@/hooks/useFinanceAnalytics';
import { formatCurrency } from '@/lib/formatters';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface FinanceComparisonViewProps {
  data: FinanceAnalyticsData;
  comparisonData?: FinanceAnalyticsData;
  mode: FinanceComparisonMode;
  selectedClientNames?: string[];
}

export function FinanceComparisonView({ 
  data, 
  comparisonData, 
  mode,
  selectedClientNames 
}: FinanceComparisonViewProps) {
  if (mode === 'clients' && data.clientBreakdown.length > 1) {
    return <ClientsComparison clients={data.clientBreakdown} />;
  }

  if (mode === 'average') {
    return <AverageComparison data={data} />;
  }

  if (mode === 'history' && data.previousPeriod) {
    return <HistoryComparison data={data} />;
  }

  return (
    <div className="text-center text-muted-foreground py-12">
      Vyberte alespoň 2 klienty pro porovnání nebo změňte režim porovnání.
    </div>
  );
}

function ClientsComparison({ clients }: { clients: FinanceAnalyticsData['clientBreakdown'] }) {
  const chartData = clients.slice(0, 10).map(client => ({
    name: client.clientName.length > 10 
      ? client.clientName.substring(0, 10) + '...' 
      : client.clientName,
    fullName: client.clientName,
    total: client.totalIncome,
    training: client.trainingIncome,
    products: client.productIncome,
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Porovnání klientů – celkový příjem</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
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
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Struktura příjmů podle klientů</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
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
              />
              <Legend />
              <Bar dataKey="training" name="Tréninky" fill="hsl(var(--chart-1))" stackId="stack" />
              <Bar dataKey="products" name="Produkty" fill="hsl(var(--chart-2))" stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Detailní srovnání</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2">Klient</th>
                  <th className="text-right py-3 px-2">Celkem</th>
                  <th className="text-right py-3 px-2">Tréninky</th>
                  <th className="text-right py-3 px-2">Produkty</th>
                  <th className="text-right py-3 px-2">Transakcí</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, index) => (
                  <tr key={client.clientId} className="border-b border-border/50">
                    <td className="py-3 px-2 font-medium">{client.clientName}</td>
                    <td className="text-right py-3 px-2 font-bold">{formatCurrency(client.totalIncome)}</td>
                    <td className="text-right py-3 px-2">{formatCurrency(client.trainingIncome)}</td>
                    <td className="text-right py-3 px-2">{formatCurrency(client.productIncome)}</td>
                    <td className="text-right py-3 px-2 text-muted-foreground">{client.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AverageComparison({ data }: { data: FinanceAnalyticsData }) {
  const average = data.averagePerClient;
  
  const comparisonData = data.clientBreakdown.map(client => ({
    name: client.clientName.length > 12 
      ? client.clientName.substring(0, 12) + '...' 
      : client.clientName,
    fullName: client.clientName,
    client: client.totalIncome,
    average: average,
    diff: client.totalIncome - average,
    diffPercent: average > 0 ? ((client.totalIncome - average) / average) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Klienti vs. průměr ({formatCurrency(average)})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData.slice(0, 10)}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
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
              />
              <Legend />
              <Bar dataKey="client" name="Klient" fill="hsl(var(--primary))" />
              <Bar dataKey="average" name="Průměr" fill="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Odchylka od průměru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparisonData.map((item) => (
              <div 
                key={item.fullName}
                className="flex items-center justify-between p-3 rounded-lg bg-background/30"
              >
                <span className="font-medium">{item.fullName}</span>
                <div className="text-right">
                  <span className={`font-bold ${item.diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {item.diff >= 0 ? '+' : ''}{formatCurrency(item.diff)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({item.diffPercent >= 0 ? '+' : ''}{item.diffPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryComparison({ data }: { data: FinanceAnalyticsData }) {
  const prev = data.previousPeriod!;
  
  const comparisons = [
    { 
      label: 'Celkový příjem', 
      current: data.totalIncome, 
      previous: prev.totalIncome,
      diff: data.totalIncome - prev.totalIncome,
      diffPercent: prev.totalIncome > 0 ? ((data.totalIncome - prev.totalIncome) / prev.totalIncome) * 100 : 0,
    },
    { 
      label: 'Z tréninků', 
      current: data.trainingIncome, 
      previous: prev.trainingIncome,
      diff: data.trainingIncome - prev.trainingIncome,
      diffPercent: prev.trainingIncome > 0 ? ((data.trainingIncome - prev.trainingIncome) / prev.trainingIncome) * 100 : 0,
    },
    { 
      label: 'Z produktů', 
      current: data.productIncome, 
      previous: prev.productIncome,
      diff: data.productIncome - prev.productIncome,
      diffPercent: prev.productIncome > 0 ? ((data.productIncome - prev.productIncome) / prev.productIncome) * 100 : 0,
    },
  ];

  const chartData = comparisons.map(c => ({
    name: c.label,
    'Aktuální období': c.current,
    'Předchozí období': c.previous,
  }));

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Porovnání s předchozím obdobím</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
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
              />
              <Legend />
              <Bar dataKey="Aktuální období" fill="hsl(var(--primary))" />
              <Bar dataKey="Předchozí období" fill="hsl(var(--muted-foreground))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {comparisons.map((item) => (
          <Card key={item.label} className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-2">{item.label}</div>
              <div className="text-2xl font-bold mb-1">{formatCurrency(item.current)}</div>
              <div className="text-sm text-muted-foreground mb-2">
                Předchozí: {formatCurrency(item.previous)}
              </div>
              <div className={`text-sm font-medium ${item.diff >= 0 ? 'text-success' : 'text-destructive'}`}>
                {item.diff >= 0 ? '+' : ''}{formatCurrency(item.diff)} 
                <span className="ml-1">({item.diffPercent >= 0 ? '+' : ''}{item.diffPercent.toFixed(1)}%)</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
