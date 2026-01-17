import { CalendarDays, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { useMonthlyIncomeHistory } from "@/hooks/useMonthlyIncomeHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MonthlyIncomeCardProps {
  onClick?: () => void;
}

export function MonthlyIncomeCard({ onClick }: MonthlyIncomeCardProps) {
  const { data, isLoading } = useMonthlyIncomeHistory();

  if (isLoading) {
    return <Skeleton className="h-[120px] rounded-xl" />;
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYearData = data?.years?.find(y => y.year === currentYear);
  const lastYearData = data?.years?.find(y => y.year === currentYear - 1);

  const totalIncome = currentYearData?.totalYearIncome || 0;
  const lastYearIncome = lastYearData?.totalYearIncome || 0;

  // Current month vs previous month comparison
  const currentMonthData = currentYearData?.months?.find(m => m.month === currentMonth);
  const previousMonthData = currentMonth > 1 
    ? currentYearData?.months?.find(m => m.month === currentMonth - 1)
    : lastYearData?.months?.find(m => m.month === 12);

  const currentMonthIncome = currentMonthData?.totalIncome || 0;
  const previousMonthIncome = previousMonthData?.totalIncome || 0;

  const vsLastMonth = previousMonthIncome > 0 
    ? ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100 
    : null;

  const vsLastYear = lastYearIncome > 0 
    ? ((totalIncome - lastYearIncome) / lastYearIncome) * 100 
    : null;

  const TrendIcon = vsLastYear === null 
    ? Minus 
    : vsLastYear >= 0 
      ? TrendingUp 
      : TrendingDown;

  const trendColor = vsLastYear === null 
    ? "text-muted-foreground" 
    : vsLastYear >= 0 
      ? "text-emerald-500" 
      : "text-red-500";

  const monthTrendColor = vsLastMonth === null 
    ? "text-muted-foreground" 
    : vsLastMonth >= 0 
      ? "text-emerald-500" 
      : "text-red-500";

  return (
    <TooltipProvider delayDuration={300}>
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow group"
        onClick={onClick}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="text-sm font-medium">Měsíční přehled</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      <strong>Výpočet:</strong> Součet příjmů z tréninků + produktů 
                      (skutečně stržené částky z klientského kreditu).
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-2xl sm:text-3xl font-bold">
                {formatCurrency(totalIncome)}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Rok {currentYear}</span>
                {vsLastYear !== null && (
                  <span className={cn("flex items-center gap-1", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {vsLastYear >= 0 ? "+" : ""}{vsLastYear.toFixed(1)}% vs loni
                  </span>
                )}
              </div>
              {/* Monthly comparison */}
              {currentMonthIncome > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Tento měsíc: {formatCurrency(currentMonthIncome)}</span>
                  {vsLastMonth !== null && (
                    <span className={cn("flex items-center gap-1", monthTrendColor)}>
                      ({vsLastMonth >= 0 ? "+" : ""}{vsLastMonth.toFixed(0)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              Klikněte pro detail →
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
