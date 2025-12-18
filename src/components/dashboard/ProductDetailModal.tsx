import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useProductDetailData } from '@/hooks/useProductDetailData';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface ProductDetailModalProps {
  productId: string | null;
  productName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({
  productId,
  productName,
  open,
  onOpenChange,
}: ProductDetailModalProps) {
  const { data, isLoading } = useProductDetailData(productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {data?.productName || productName || 'Detail produktu'}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* All-time stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-3 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Celkový příjem</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(data.totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.totalCount}× prodáno
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <p className="text-xs text-success">Celková marže</p>
                </div>
                <p className="text-lg font-bold text-success">
                  {formatCurrency(data.totalMargin)}
                </p>
                <p className="text-xs text-success/70 mt-0.5">
                  {formatPercent(data.marginPercent, 1)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Rok (12 měs.)</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(data.yearRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.yearCount}× prodáno
                </p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Prům. cena</p>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(data.avgSalePrice)}
                </p>
                {data.firstSaleDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    od {format(new Date(data.firstSaleDate), 'd.M.yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Period badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Marže za rok: {formatCurrency(data.yearMargin)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Náklady celkem: {formatCurrency(data.totalCost)}
              </Badge>
              {data.lastSaleDate && (
                <Badge variant="outline" className="text-xs">
                  Poslední prodej: {format(new Date(data.lastSaleDate), 'd.M.yyyy', { locale: cs })}
                </Badge>
              )}
            </div>

            {/* Charts */}
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="revenue" className="text-xs">Příjem</TabsTrigger>
                <TabsTrigger value="margin" className="text-xs">Marže</TabsTrigger>
                <TabsTrigger value="count" className="text-xs">Prodeje</TabsTrigger>
              </TabsList>
              
              <TabsContent value="revenue" className="mt-3">
                <div className="h-48">
                  {data.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'Příjem']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#revenueGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Žádná data k zobrazení
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="margin" className="mt-3">
                <div className="h-48">
                  {data.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === 'margin' ? 'Marže' : name === 'revenue' ? 'Příjem' : 'Náklady'
                          ]}
                        />
                        <Bar dataKey="margin" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Žádná data k zobrazení
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="count" className="mt-3">
                <div className="h-48">
                  {data.monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                          }}
                          formatter={(value: number) => [value, 'Prodejů']}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Žádná data k zobrazení
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Produkt nenalezen</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
