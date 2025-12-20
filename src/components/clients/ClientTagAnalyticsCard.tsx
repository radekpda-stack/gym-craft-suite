/**
 * Client Tag Analytics Card Component
 * 
 * Displays training tag statistics for a client including:
 * - Distribution by focus, body part, and intensity
 * - Balance warnings
 * - Period filtering
 */
import { useState } from "react";
import { BarChart3, AlertTriangle, TrendingUp, Activity, Target, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientTagAnalytics, DateRangeOption, TagDistribution } from "@/hooks/useClientTagAnalytics";
import { cn } from "@/lib/utils";

interface ClientTagAnalyticsCardProps {
  clientId: string;
  className?: string;
}

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: 7, label: "7 dní" },
  { value: 30, label: "30 dní" },
  { value: 90, label: "3 měsíce" },
  { value: 180, label: "6 měsíců" },
  { value: 365, label: "1 rok" },
];

export function ClientTagAnalyticsCard({ clientId, className }: ClientTagAnalyticsCardProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>(30);
  
  const analytics = useClientTagAnalytics(clientId, dateRange);

  if (analytics.isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = analytics.consecutiveHeavyWarning || 
                      analytics.missingMobilityWarning || 
                      analytics.unbalancedBodyPartWarning;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Analýza tréninků
          </CardTitle>
          <Select 
            value={String(dateRange)} 
            onValueChange={(v) => setDateRange(Number(v) as DateRangeOption)}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total trainings */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Celkem tréninků</span>
          <Badge variant="secondary" className="font-mono">
            {analytics.totalTrainings}
          </Badge>
        </div>

        {analytics.totalTrainings === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Žádné tréninky v tomto období
          </p>
        ) : (
          <>
            {/* Warnings */}
            {hasWarnings && (
              <div className="space-y-2">
                {analytics.consecutiveHeavyWarning && (
                  <Alert className="py-2 border-warning/30 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-xs text-warning-foreground">
                      2× těžký trénink za sebou - zvažte regeneraci
                    </AlertDescription>
                  </Alert>
                )}
                {analytics.missingMobilityWarning && (
                  <Alert className="py-2 border-warning/30 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-xs text-warning-foreground">
                      Dlouhodobě chybí mobilita - doporučujeme zařadit
                    </AlertDescription>
                  </Alert>
                )}
                {analytics.unbalancedBodyPartWarning && (
                  <Alert className="py-2 border-warning/30 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-xs text-warning-foreground">
                      {analytics.unbalancedBodyPartWarning}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Focus distribution */}
            {analytics.focusDistribution.length > 0 && (
              <DistributionSection
                title="Zaměření"
                icon={<Target className="h-4 w-4" />}
                distribution={analytics.focusDistribution}
              />
            )}

            {/* Body part distribution */}
            {analytics.bodyPartDistribution.length > 0 && (
              <DistributionSection
                title="Partie těla"
                icon={<Activity className="h-4 w-4" />}
                distribution={analytics.bodyPartDistribution}
              />
            )}

            {/* Intensity distribution */}
            {analytics.intensityDistribution.length > 0 && (
              <DistributionSection
                title="Intenzita"
                icon={<Zap className="h-4 w-4" />}
                distribution={analytics.intensityDistribution}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DistributionSectionProps {
  title: string;
  icon: React.ReactNode;
  distribution: TagDistribution[];
}

function DistributionSection({ title, icon, distribution }: DistributionSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-1.5">
        {distribution.slice(0, 5).map((item) => (
          <div key={item.tagId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.tagColor }}
                />
                <span className="text-foreground">{item.tagName}</span>
              </div>
              <span className="text-muted-foreground">
                {item.count}× ({item.percentage}%)
              </span>
            </div>
            <Progress 
              value={item.percentage} 
              className="h-1.5"
              style={{ 
                // @ts-ignore - custom CSS variable
                '--progress-color': item.tagColor 
              } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
