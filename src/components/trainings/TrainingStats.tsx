/**
 * Training Statistics Component
 * 
 * Displays visual analytics and recommendations for client training patterns.
 * Features:
 * - Bar, pie, and radar chart visualizations
 * - Date range filtering
 * - AI-powered training recommendations
 * - Detection of neglected training areas
 * - Balance analysis between body parts
 */

import { useState, useMemo } from "react";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from "recharts";
import { 
  BarChart3, PieChart as PieChartIcon, Calendar, Lightbulb, 
  AlertTriangle, CheckCircle, TrendingUp, Target 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientTagStats, DateRange } from "@/hooks/useTrainingSessionTags";
import { useTags } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface TrainingStatsProps {
  /** Client ID to display statistics for */
  clientId: string;
}

type DateRangeOption = "1m" | "3m" | "6m" | "1y" | "all";
type ChartType = "bar" | "pie" | "radar";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface Recommendation {
  type: "warning" | "success" | "info";
  title: string;
  description: string;
  priority: number;
}

interface CoreCategory {
  name: string;
  keywords: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Date range options for filtering */
const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "1m", label: "Poslední měsíc" },
  { value: "3m", label: "Poslední 3 měsíce" },
  { value: "6m", label: "Poslední 6 měsíců" },
  { value: "1y", label: "Poslední rok" },
  { value: "all", label: "Vše" },
];

/** Core training categories that should be balanced for optimal results */
const CORE_CATEGORIES: CoreCategory[] = [
  { name: "Horní část", keywords: ["horní", "upper", "ramena", "paže", "hrudník", "záda"] },
  { name: "Dolní část", keywords: ["dolní", "lower", "nohy", "stehna", "lýtka", "hýždě"] },
  { name: "Střed těla", keywords: ["střed", "core", "břicho", "záda", "páteř"] },
  { name: "Mobilita", keywords: ["mobilita", "mobility", "protažení", "flex"] },
  { name: "Síla", keywords: ["síla", "strength", "silový"] },
  { name: "Kondice", keywords: ["kondice", "cardio", "kardio", "vytrvalost"] },
];

/** Tooltip style configuration for charts */
const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '8px',
  },
  labelStyle: { color: 'hsl(var(--foreground))' },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates date range based on the selected option
 */
const getDateRange = (option: DateRangeOption): DateRange | undefined => {
  if (option === "all") return undefined;
  
  const now = new Date();
  const end = endOfMonth(now);
  
  const monthsMap: Record<Exclude<DateRangeOption, "all">, number> = {
    "1m": 1,
    "3m": 3,
    "6m": 6,
    "1y": 12,
  };
  
  const start = startOfMonth(subMonths(now, monthsMap[option]));
  return { start, end };
};

/**
 * Generates training recommendations based on tag statistics
 */
const generateRecommendations = (
  chartData: ChartDataItem[], 
  totalTrainings: number
): Recommendation[] => {
  if (chartData.length === 0) return [];

  const recommendations: Recommendation[] = [];
  const maxCount = Math.max(...chartData.map(d => d.value));
  const avgCount = totalTrainings / chartData.length;

  // Find underrepresented and overrepresented areas
  const underrepresented = chartData.filter(d => d.value < avgCount * 0.5);
  const overrepresented = chartData.filter(d => d.value > avgCount * 1.5);

  // Add warnings for neglected areas
  underrepresented.forEach(area => {
    const percentage = ((area.value / maxCount) * 100).toFixed(0);
    recommendations.push({
      type: "warning",
      title: `${area.name} potřebuje pozornost`,
      description: `Tato oblast má pouze ${percentage}% frekvence oproti nejčastěji trénované oblasti. Doporučujeme zařadit více tréninků zaměřených na "${area.name}".`,
      priority: 1,
    });
  });

  // Check upper/lower body balance
  const upperBody = chartData.find(d => 
    d.name.toLowerCase().includes("horní") || d.name.toLowerCase().includes("upper")
  );
  const lowerBody = chartData.find(d => 
    d.name.toLowerCase().includes("dolní") || d.name.toLowerCase().includes("lower")
  );

  if (upperBody && lowerBody) {
    const ratio = upperBody.value / lowerBody.value;
    if (ratio > 2) {
      recommendations.push({
        type: "warning",
        title: "Nerovnováha: Horní vs. dolní část těla",
        description: `Horní část těla je trénována ${ratio.toFixed(1)}× častěji než dolní. Pro vyváženější rozvoj doporučujeme přidat více tréninků dolní části těla.`,
        priority: 2,
      });
    } else if (ratio < 0.5) {
      recommendations.push({
        type: "warning",
        title: "Nerovnováha: Dolní vs. horní část těla",
        description: `Dolní část těla je trénována ${(1/ratio).toFixed(1)}× častěji než horní. Pro vyváženější rozvoj doporučujeme přidat více tréninků horní části těla.`,
        priority: 2,
      });
    } else {
      recommendations.push({
        type: "success",
        title: "Dobrá rovnováha tělesných partií",
        description: "Horní a dolní část těla jsou trénovány vyváženě. Pokračujte v tomto trendu!",
        priority: 5,
      });
    }
  }

  // Check for mobility training
  const mobility = chartData.find(d => 
    d.name.toLowerCase().includes("mobilita") || d.name.toLowerCase().includes("mobility")
  );
  
  if (!mobility && totalTrainings > 5) {
    recommendations.push({
      type: "info",
      title: "Zvažte přidání mobility",
      description: "V trénincích chybí zaměření na mobilitu. Pravidelné mobilizační cvičení může zlepšit výkon a snížit riziko zranění.",
      priority: 3,
    });
  } else if (mobility && mobility.value < totalTrainings * 0.1) {
    recommendations.push({
      type: "info",
      title: "Nízká frekvence mobility",
      description: `Mobilita tvoří pouze ${((mobility.value / totalTrainings) * 100).toFixed(0)}% tréninků. Doporučujeme zvýšit frekvenci na alespoň 15-20%.`,
      priority: 3,
    });
  }

  // Check for variety
  if (chartData.length < 3 && totalTrainings > 10) {
    recommendations.push({
      type: "info",
      title: "Nízká pestrost tréninků",
      description: "Tréninky jsou zaměřeny pouze na několik oblastí. Zvažte přidání dalších typů cvičení pro komplexnější rozvoj.",
      priority: 4,
    });
  } else if (chartData.length >= 5) {
    recommendations.push({
      type: "success",
      title: "Pestrý tréninkový program",
      description: `Tréninky pokrývají ${chartData.length} různých oblastí. Skvělá práce s diverzifikací!`,
      priority: 5,
    });
  }

  // Check for overtraining
  overrepresented.forEach(area => {
    if (area.value > totalTrainings * 0.5) {
      recommendations.push({
        type: "info",
        title: `Vysoká koncentrace na "${area.name}"`,
        description: `Více než polovina tréninků je zaměřena na tuto oblast. Zvažte, zda by nebylo vhodné rozložit zátěž rovnoměrněji.`,
        priority: 3,
      });
    }
  });

  // Sort by priority (lower = more important)
  return recommendations.sort((a, b) => a.priority - b.priority);
};

/**
 * Finds core categories that are not represented in training data
 */
const findMissingCategories = (chartData: ChartDataItem[]): CoreCategory[] => {
  const existingNames = chartData.map(d => d.name.toLowerCase());
  return CORE_CATEGORIES.filter(cat => 
    !cat.keywords.some(keyword => 
      existingNames.some(name => name.includes(keyword))
    )
  );
};

// ============================================================================
// Component
// ============================================================================

export function TrainingStats({ clientId }: TrainingStatsProps) {
  // Local state
  const [dateRange, setDateRange] = useState<DateRangeOption>("3m");
  const [chartType, setChartType] = useState<ChartType>("bar");

  // Computed date range
  const dateRangeValues = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Data fetching
  const { data: tagStats = [], isLoading } = useClientTagStats(clientId, dateRangeValues);
  const { data: allTags = [] } = useTags();

  // ========================================
  // Memoized Values
  // ========================================

  /** Chart data transformed from tag statistics */
  const chartData = useMemo((): ChartDataItem[] => {
    return tagStats.map(stat => ({
      name: stat.tag.name,
      value: stat.count,
      color: stat.tag.color,
    }));
  }, [tagStats]);

  /** Total number of trainings in the data set */
  const totalTrainings = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData]
  );

  /** AI-generated recommendations based on training patterns */
  const recommendations = useMemo(
    () => generateRecommendations(chartData, totalTrainings),
    [chartData, totalTrainings]
  );

  /** Radar chart data (normalized to percentages) */
  const radarData = useMemo(() => {
    if (chartData.length < 3) return [];
    const maxValue = Math.max(...chartData.map(d => d.value));
    return chartData.slice(0, 6).map(d => ({
      subject: d.name,
      value: (d.value / maxValue) * 100,
      fullMark: 100,
    }));
  }, [chartData]);

  /** Core categories not represented in training data */
  const missingCategories = useMemo(
    () => findMissingCategories(chartData),
    [chartData]
  );

  // ========================================
  // Render: Loading State
  // ========================================

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground mt-4">Načítám statistiky...</p>
      </div>
    );
  }

  // ========================================
  // Render: Main Component
  // ========================================

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-4">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
          <SelectTrigger className="w-44 bg-secondary">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ChartTypeSelector 
          chartType={chartType} 
          onChange={setChartType}
          showRadar={radarData.length >= 3}
        />
      </div>

      {/* Recommendations */}
      {(recommendations.length > 0 || missingCategories.length > 0) && (
        <RecommendationsSection 
          recommendations={recommendations}
          missingCategories={missingCategories}
          totalTrainings={totalTrainings}
        />
      )}

      {/* Chart */}
      {chartData.length > 0 ? (
        <ChartSection
          chartType={chartType}
          chartData={chartData}
          radarData={radarData}
          totalTrainings={totalTrainings}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ChartTypeSelectorProps {
  chartType: ChartType;
  onChange: (type: ChartType) => void;
  showRadar: boolean;
}

function ChartTypeSelector({ chartType, onChange, showRadar }: ChartTypeSelectorProps) {
  return (
    <div className="flex gap-1 p-1 bg-secondary rounded-lg">
      <Button
        variant={chartType === "bar" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("bar")}
        className="gap-2"
      >
        <BarChart3 className="w-4 h-4" />
        Sloupcový
      </Button>
      <Button
        variant={chartType === "pie" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("pie")}
        className="gap-2"
      >
        <PieChartIcon className="w-4 h-4" />
        Koláčový
      </Button>
      {showRadar && (
        <Button
          variant={chartType === "radar" ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange("radar")}
          className="gap-2"
        >
          <Target className="w-4 h-4" />
          Radar
        </Button>
      )}
    </div>
  );
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  missingCategories: CoreCategory[];
  totalTrainings: number;
}

function RecommendationsSection({ 
  recommendations, 
  missingCategories, 
  totalTrainings 
}: RecommendationsSectionProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-primary" />
        Doporučení pro trénink
      </h3>
      
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <RecommendationCard key={index} recommendation={rec} />
        ))}

        {missingCategories.length > 0 && totalTrainings > 5 && (
          <div className="p-4 rounded-xl border bg-muted/30 border-muted">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Chybějící oblasti tréninku
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Zvažte přidání tréninků zaměřených na:{" "}
              <span className="text-foreground font-medium">
                {missingCategories.map(c => c.name).join(", ")}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { type, title, description } = recommendation;
  
  const iconMap = {
    warning: AlertTriangle,
    success: CheckCircle,
    info: TrendingUp,
  };
  const Icon = iconMap[type];
  
  const colorMap = {
    warning: "bg-warning/5 border-warning/20 text-warning",
    success: "bg-success/5 border-success/20 text-success",
    info: "bg-primary/5 border-primary/20 text-primary",
  };

  return (
    <div className={cn("p-4 rounded-xl border flex gap-3", colorMap[type])}>
      <div className="shrink-0 mt-0.5">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

interface ChartSectionProps {
  chartType: ChartType;
  chartData: ChartDataItem[];
  radarData: Array<{ subject: string; value: number; fullMark: number }>;
  totalTrainings: number;
}

function ChartSection({ chartType, chartData, radarData, totalTrainings }: ChartSectionProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">
        Četnost štítků v trénincích
      </h3>
      
      <div className="h-80">
        {chartType === "bar" && <BarChartView data={chartData} />}
        {chartType === "pie" && <PieChartView data={chartData} total={totalTrainings} />}
        {chartType === "radar" && radarData.length >= 3 && <RadarChartView data={radarData} />}
      </div>

      {/* Legend */}
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

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <SummaryCard value={totalTrainings} label="Celkem tréninků" />
        <SummaryCard value={chartData.length} label="Různých oblastí" />
        <SummaryCard 
          value={totalTrainings > 0 ? (totalTrainings / chartData.length).toFixed(1) : "0"} 
          label="Průměr na oblast" 
        />
      </div>
    </div>
  );
}

function SummaryCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/50 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function BarChartView({ data }: { data: ChartDataItem[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={100}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value: number) => [`${value}×`, 'Použito']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ data, total }: { data: ChartDataItem[]; total: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [
            `${value}× (${((value / total) * 100).toFixed(1)}%)`,
            name
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function RadarChartView({ data }: { data: Array<{ subject: string; value: number; fullMark: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Radar
          name="Frekvence"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value: number) => [`${value.toFixed(0)}%`, 'Relativní frekvence']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium text-foreground">
        Žádná data pro statistiky
      </h3>
      <p className="text-muted-foreground mt-1">
        Přidejte štítky k dokončeným tréninkům pro zobrazení statistik a doporučení
      </p>
    </div>
  );
}
