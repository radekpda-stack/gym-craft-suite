import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MonthlyTrainingData } from "@/hooks/useTrainingTrend";

interface TrainingTrendChartProps {
  data: MonthlyTrainingData[];
  isLoading?: boolean;
}

export function TrainingTrendChart({ data, isLoading }: TrainingTrendChartProps) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 md:p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const totalTrainings = data.reduce((sum, d) => sum + d.count, 0);
  const averagePerMonth = data.length > 0 ? totalTrainings / data.length : 0;

  // Compare first half vs second half
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint).reduce((sum, d) => sum + d.count, 0);
  const secondHalf = data.slice(midPoint).reduce((sum, d) => sum + d.count, 0);
  const trendChange = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-foreground">
            Trend tréninků (12 měsíců)
          </h3>
        </div>
        {trendChange !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trendChange > 0 ? "text-success" : "text-destructive"
            )}
          >
            {trendChange > 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {Math.abs(trendChange).toFixed(0)}%
          </div>
        )}
      </div>

      <div className="h-[200px] md:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="trainingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickMargin={8}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "count") return [value, "Tréninků"];
                return [value, name];
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullMonth;
                }
                return label;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#trainingGradient)"
              name="count"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 md:gap-6 mt-4 text-sm text-muted-foreground">
        <span>
          Celkem: <strong className="text-foreground">{totalTrainings}</strong>
        </span>
        <span>
          Ø <strong className="text-foreground">{averagePerMonth.toFixed(1)}</strong>/měsíc
        </span>
      </div>
    </div>
  );
}
