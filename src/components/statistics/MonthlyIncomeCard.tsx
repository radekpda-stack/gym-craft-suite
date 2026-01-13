import { CalendarDays, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { useMonthlyIncomeHistory } from "@/hooks/useMonthlyIncomeHistory";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface MonthlyIncomeCardProps {
  onClick?: () => void;
}

export function MonthlyIncomeCard({ onClick }: MonthlyIncomeCardProps) {
  const { data, isLoading } = useMonthlyIncomeHistory();

  if (isLoading) {
    return <Skeleton className="h-[120px] rounded-xl" />;
  }

  const currentYear = new Date().getFullYear();
  const currentYearData = data?.years?.find(y => y.year === currentYear);
  const lastYearData = data?.years?.find(y => y.year === currentYear - 1);

  const totalIncome = currentYearData?.totalYearIncome || 0;
  const lastYearIncome = lastYearData?.totalYearIncome || 0;

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

  return (
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
            </div>
            <div className="text-2xl sm:text-3xl font-bold">
              {formatCurrency(totalIncome)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Rok {currentYear}</span>
              {vsLastYear !== null && (
                <span className={cn("flex items-center gap-1", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  {vsLastYear >= 0 ? "+" : ""}{vsLastYear.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            Klikněte pro detail →
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
