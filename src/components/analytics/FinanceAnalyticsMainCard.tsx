import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendAreaChart, DistributionDonutChart } from '@/components/analytics';
import { FinanceAnalyticsData } from '@/hooks/useFinanceAnalytics';
import { formatCurrency } from '@/lib/formatters';
import { ChevronRight, DollarSign, Dumbbell, ShoppingBag } from 'lucide-react';

interface FinanceAnalyticsMainCardProps {
  data: FinanceAnalyticsData;
  onShowDetail: () => void;
}

export function FinanceAnalyticsMainCard({ data, onShowDetail }: FinanceAnalyticsMainCardProps) {
  const trendData = data.trend.map(item => ({
    label: item.label,
    value: item.value,
  }));

  return (
    <Card className="analytics-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Přehled financí</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onShowDetail}
          className="text-muted-foreground hover:text-foreground"
        >
          Zobrazit detail
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="analytics-metric">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="analytics-metric-value">{formatCurrency(data.totalIncome)}</div>
            <div className="analytics-metric-label">Celkový příjem</div>
          </div>
          <div className="analytics-metric">
            <Dumbbell className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="analytics-metric-value">{formatCurrency(data.trainingIncome)}</div>
            <div className="analytics-metric-label">Z tréninků</div>
          </div>
          <div className="analytics-metric">
            <ShoppingBag className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="analytics-metric-value">{formatCurrency(data.productIncome)}</div>
            <div className="analytics-metric-label">Z produktů</div>
          </div>
        </div>

        {/* Trend Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Trend příjmů</h4>
          <TrendAreaChart 
            data={trendData} 
            height={180}
            gradient={{ id: "finance-trend", color: "hsl(var(--primary))" }}
          />
        </div>

        {/* Distribution */}
        {data.distribution.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Rozložení příjmů</h4>
          <DistributionDonutChart 
            data={data.distribution.map(d => ({ 
              name: d.name, 
              value: d.value, 
              percentage: data.totalIncome > 0 ? Math.round((d.value / data.totalIncome) * 100) : 0 
            }))} 
            height={200}
          />
          </div>
        )}

        {/* Top Clients */}
        {data.clientBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Top klienti</h4>
            <div className="space-y-2">
              {data.clientBreakdown.slice(0, 5).map((client, index) => (
                <div 
                  key={client.clientId}
                  className="analytics-list-item"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
                    <span className="text-sm font-medium">{client.clientName}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(client.totalIncome)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
