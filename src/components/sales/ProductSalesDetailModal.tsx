import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Package, TrendingUp, TrendingDown, Banknote, Users, CalendarDays, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
} from 'recharts';
import { useProductSalesDetail } from '@/hooks/useProductSalesDetail';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductSalesDetailModalProps {
  productId: string | null;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductSalesDetailModal({
  productId,
  productName,
  open,
  onOpenChange,
}: ProductSalesDetailModalProps) {
  const { data, isLoading } = useProductSalesDetail(productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {productName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs">Tržby</span>
                </div>
                <p className="text-lg font-bold text-primary">{formatCurrency(data.totalRevenue)}</p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span className="text-xs">Náklady</span>
                </div>
                <p className="text-lg font-bold">{formatCurrency(data.totalCost)}</p>
              </div>

              <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                <div className="flex items-center gap-1.5 text-success mb-1">
                  <Banknote className="w-3.5 h-3.5" />
                  <span className="text-xs">Zisk</span>
                </div>
                <p className={cn(
                  "text-lg font-bold",
                  data.totalProfit >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(data.totalProfit)}
                </p>
                <span className="text-xs text-muted-foreground">
                  marže {data.profitMargin.toFixed(1)}%
                </span>
              </div>

              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                  <Package className="w-3.5 h-3.5" />
                  <span className="text-xs">Prodáno</span>
                </div>
                <p className="text-lg font-bold">{data.totalQuantity}×</p>
                <span className="text-xs text-muted-foreground">
                  Ø {formatCurrency(data.avgPrice)}
                </span>
              </div>
            </div>

            {/* Last sale info */}
            {data.lastSaleDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-4 h-4" />
                <span>
                  Poslední prodej: {format(new Date(data.lastSaleDate), 'd. MMMM yyyy', { locale: cs })}
                </span>
              </div>
            )}

            {/* Charts */}
            {data.salesByMonth.length > 0 && (
              <Tabs defaultValue="revenue" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="revenue" className="flex-1">Tržby</TabsTrigger>
                  <TabsTrigger value="margin" className="flex-1">Marže</TabsTrigger>
                  <TabsTrigger value="quantity" className="flex-1">Počet</TabsTrigger>
                </TabsList>

                <TabsContent value="revenue" className="mt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data.salesByMonth}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                        tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : v}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                <p className="font-medium">{formatCurrency(d.revenue)}</p>
                                <p className="text-xs text-muted-foreground">{d.quantity}× prodáno</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorRev)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="margin" className="mt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={data.salesByMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="label" 
                        className="text-xs fill-muted-foreground"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        yAxisId="left"
                        className="text-xs fill-muted-foreground"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : v}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        className="text-xs fill-muted-foreground"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                <p className="font-medium">Tržby: {formatCurrency(d.revenue)}</p>
                                <p className="text-xs">Náklady: {formatCurrency(d.cost)}</p>
                                <p className="text-xs text-success">Marže: {d.margin.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        yAxisId="left"
                        dataKey="revenue" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                        opacity={0.7}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="margin"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="quantity" className="mt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.salesByMonth}>
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
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                                <p className="font-medium">{d.quantity}× prodáno</p>
                                <p className="text-xs text-muted-foreground">{formatCurrency(d.revenue)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="quantity" 
                        fill="hsl(var(--chart-3))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            )}

            {/* Top Buyers */}
            {data.topBuyers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">Top kupující</h3>
                </div>
                <div className="space-y-2">
                  {data.topBuyers.map((buyer, index) => (
                    <div 
                      key={buyer.clientId}
                      className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 ? "bg-warning text-warning-foreground" :
                          index === 1 ? "bg-muted-foreground text-background" :
                          index === 2 ? "bg-warning/70 text-warning-foreground" :
                          "bg-secondary text-muted-foreground"
                        )}>
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm">{buyer.clientName}</span>
                      </div>
                      <div className="text-right text-sm">
                        <span className="font-bold">{buyer.purchaseCount}×</span>
                        <span className="text-muted-foreground ml-2">({formatCurrency(buyer.totalSpent)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {data.salesByMonth.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Žádné prodeje tohoto produktu</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Produkt nenalezen</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
