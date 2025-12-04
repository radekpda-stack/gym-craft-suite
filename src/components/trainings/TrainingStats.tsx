import { useState, useMemo } from "react";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { BarChart3, PieChart as PieChartIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientTagStats } from "@/hooks/useTrainingSessionTags";
import { cn } from "@/lib/utils";

interface TrainingStatsProps {
  clientId: string;
}

type DateRangeOption = "1m" | "3m" | "6m" | "1y" | "all";
type ChartType = "bar" | "pie";

export function TrainingStats({ clientId }: TrainingStatsProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>("3m");
  const [chartType, setChartType] = useState<ChartType>("bar");

  const dateRangeValues = useMemo(() => {
    if (dateRange === "all") return undefined;
    
    const now = new Date();
    const end = endOfMonth(now);
    let start: Date;
    
    switch (dateRange) {
      case "1m":
        start = startOfMonth(subMonths(now, 1));
        break;
      case "3m":
        start = startOfMonth(subMonths(now, 3));
        break;
      case "6m":
        start = startOfMonth(subMonths(now, 6));
        break;
      case "1y":
        start = startOfMonth(subMonths(now, 12));
        break;
      default:
        start = new Date(0);
    }
    
    return { start, end };
  }, [dateRange]);

  const { data: tagStats = [], isLoading } = useClientTagStats(clientId, dateRangeValues);

  const chartData = useMemo(() => {
    return tagStats.map(stat => ({
      name: stat.tag.name,
      value: stat.count,
      color: stat.tag.color,
    }));
  }, [tagStats]);

  const totalTrainings = chartData.reduce((sum, item) => sum + item.value, 0);

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground mt-4">Načítám statistiky...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-4">
        {/* Date range */}
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
          <SelectTrigger className="w-44 bg-secondary">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Poslední měsíc</SelectItem>
            <SelectItem value="3m">Poslední 3 měsíce</SelectItem>
            <SelectItem value="6m">Poslední 6 měsíců</SelectItem>
            <SelectItem value="1y">Poslední rok</SelectItem>
            <SelectItem value="all">Vše</SelectItem>
          </SelectContent>
        </Select>

        {/* Chart type toggle */}
        <div className="flex gap-1 p-1 bg-secondary rounded-lg">
          <Button
            variant={chartType === "bar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartType("bar")}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Sloupcový
          </Button>
          <Button
            variant={chartType === "pie" ? "default" : "ghost"}
            size="sm"
            onClick={() => setChartType("pie")}
            className="gap-2"
          >
            <PieChartIcon className="w-4 h-4" />
            Koláčový
          </Button>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Četnost štítků v trénincích
          </h3>
          
          <div className="h-80">
            {chartType === "bar" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value}x`, 'Použito']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}x (${((value / totalTrainings) * 100).toFixed(1)}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend / Summary */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {chartData.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-foreground truncate">{item.name}</span>
                <span className="text-sm font-medium text-muted-foreground ml-auto">
                  {item.value}×
                </span>
              </div>
            ))}
          </div>

          {/* Insights */}
          {chartData.length > 1 && (
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-medium text-foreground mb-2">Analýza</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong className="text-foreground">{chartData[0].name}</strong> je 
                  nejčastěji trénovaná oblast ({chartData[0].value}× za zvolené období).
                </p>
                {chartData.length > 2 && chartData[chartData.length - 1].value < chartData[0].value * 0.3 && (
                  <p className="text-warning">
                    ⚠️ <strong className="text-warning">{chartData[chartData.length - 1].name}</strong> je 
                    výrazně méně trénovaná oblast. Zvažte zařazení více tréninků tohoto typu.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Žádná data pro statistiky
          </h3>
          <p className="text-muted-foreground mt-1">
            Přidejte štítky k dokončeným tréninkům pro zobrazení statistik
          </p>
        </div>
      )}
    </div>
  );
}
