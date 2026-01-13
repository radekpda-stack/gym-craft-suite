import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  AlertCircle,
  Dumbbell,
  ShoppingBag,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useMonthlyIncomeHistory, MonthlyIncome } from "@/hooks/useMonthlyIncomeHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MonthlyIncomeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MonthlyIncomeDetailModal({
  open,
  onOpenChange,
}: MonthlyIncomeDetailModalProps) {
  const { data, isLoading } = useMonthlyIncomeHistory();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const selectedYearData = data?.years?.find((y) => y.year === selectedYear);
  const chartData = selectedYearData?.months.map((m) => ({
    name: m.monthLabel.substring(0, 3),
    fullName: m.monthLabel,
    tréninky: m.trainingIncome,
    produkty: m.productIncome,
    celkem: m.totalIncome,
  })) || [];

  const renderTrendBadge = (vsLastYear: number | null) => {
    if (vsLastYear === null) return null;
    
    const isPositive = vsLastYear >= 0;
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs gap-1",
          isPositive ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-red-600 border-red-200 bg-red-50"
        )}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? "+" : ""}{vsLastYear.toFixed(1)}%
      </Badge>
    );
  };

  const renderMonthCard = (month: MonthlyIncome) => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYr = new Date().getFullYear();
    const isFuture = selectedYear === currentYr && month.month > currentMonth;
    const isCurrent = selectedYear === currentYr && month.month === currentMonth;
    const isBest = selectedYearData?.bestMonth?.month === month.month && month.totalIncome > 0;
    const isWorst = selectedYearData?.worstMonth?.month === month.month && month.totalIncome > 0 && selectedYearData?.bestMonth?.month !== month.month;

    return (
      <Card
        key={month.month}
        className={cn(
          "transition-all",
          isFuture && "opacity-50",
          isCurrent && "ring-2 ring-primary/50",
          isBest && "ring-2 ring-emerald-500/50 bg-emerald-50/50",
          isWorst && "ring-2 ring-amber-500/50 bg-amber-50/50"
        )}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{month.monthLabel}</span>
              {isBest && <Trophy className="h-4 w-4 text-emerald-500" />}
              {isWorst && <AlertCircle className="h-4 w-4 text-amber-500" />}
              {isCurrent && <Badge variant="secondary" className="text-xs">Aktuální</Badge>}
            </div>
            {renderTrendBadge(month.vsLastYear)}
          </div>

          <div className="text-xl sm:text-2xl font-bold mb-3">
            {formatCurrency(month.totalIncome)}
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5" />
                Tréninky
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(month.trainingIncome)}
                <span className="text-muted-foreground ml-1">({month.trainingsCount}×)</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" />
                Produkty
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(month.productIncome)}
                <span className="text-muted-foreground ml-1">({month.productsCount}×)</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Měsíční přehled příjmů
            </DialogTitle>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data?.availableYears?.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {/* Year summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Celkem za rok</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(selectedYearData?.totalYearIncome || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Průměr/měsíc</div>
                    <div className="text-lg font-bold">
                      {formatCurrency(selectedYearData?.averageMonthly || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50/50 border-emerald-200">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Trophy className="h-3 w-3 text-emerald-500" />
                      Nejlepší měsíc
                    </div>
                    <div className="text-lg font-bold">
                      {selectedYearData?.bestMonth?.monthLabel || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedYearData?.bestMonth 
                        ? formatCurrency(selectedYearData.bestMonth.totalIncome)
                        : "-"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50/50 border-amber-200">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      Nejslabší měsíc
                    </div>
                    <div className="text-lg font-bold">
                      {selectedYearData?.worstMonth?.monthLabel || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedYearData?.worstMonth 
                        ? formatCurrency(selectedYearData.worstMonth.totalIncome)
                        : "-"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardContent className="p-4">
                  <div className="h-[200px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            formatCurrency(value), 
                            name === "tréninky" ? "Tréninky" : name === "produkty" ? "Produkty" : "Celkem"
                          ]}
                          labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend 
                          formatter={(value) => value === "tréninky" ? "Tréninky" : value === "produkty" ? "Produkty" : value}
                        />
                        <Bar 
                          dataKey="tréninky" 
                          stackId="a" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 0, 0, 0]}
                        />
                        <Bar 
                          dataKey="produkty" 
                          stackId="a" 
                          fill="hsl(var(--primary) / 0.5)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Monthly cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedYearData?.months.map(renderMonthCard)}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
