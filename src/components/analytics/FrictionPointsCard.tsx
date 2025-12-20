import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FrictionPoint {
  pattern: string;
  type: 'rapid_leave' | 'repeated_edits' | 'zero_actions' | 'frequent_cancel' | 'unused_feature';
  count: number;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

interface FrictionPointsCardProps {
  data: FrictionPoint[];
}

function getSeverityIcon(severity: FrictionPoint['severity']) {
  switch (severity) {
    case 'high':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'medium':
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'low':
      return <Info className="w-4 h-4 text-blue-500" />;
  }
}

function getSeverityStyles(severity: FrictionPoint['severity']) {
  switch (severity) {
    case 'high':
      return 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20';
    case 'medium':
      return 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20';
    case 'low':
      return 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20';
  }
}

export function FrictionPointsCard({ data }: FrictionPointsCardProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Třecí místa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-muted-foreground">
                Žádná významná třecí místa nebyla identifikována
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Aplikace je používána plynule
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by severity (high first)
  const sortedData = [...data].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Třecí místa
          <span className="text-xs font-normal text-muted-foreground">
            ({data.length} nalezeno)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedData.map((point, index) => (
          <div
            key={index}
            className={cn(
              'rounded-lg border p-3 space-y-2',
              getSeverityStyles(point.severity)
            )}
          >
            <div className="flex items-start gap-2">
              {getSeverityIcon(point.severity)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {point.pattern}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {point.count} výskytů
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 pl-6">
              <Lightbulb className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {point.suggestion}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
