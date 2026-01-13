import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scale, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useAsymmetryAnalysis, 
  getAsymmetrySeverityColor, 
  type AsymmetryResult 
} from '@/hooks/useAsymmetryAnalysis';
import { Skeleton } from '@/components/ui/skeleton';

interface AsymmetryCardProps {
  clientId: string;
  maxItems?: number;
  className?: string;
}

function AsymmetryBar({ result }: { result: AsymmetryResult }) {
  const severity = getAsymmetrySeverityColor(result.asymmetryPercent);
  const isTimeBased = result.metricType === 'time';
  
  // Calculate bar widths (max is always 100%)
  const leftVal = result.leftBest || 0;
  const rightVal = result.rightBest || 0;
  const maxVal = Math.max(leftVal, rightVal);
  
  const leftWidth = maxVal > 0 ? (leftVal / maxVal) * 100 : 50;
  const rightWidth = maxVal > 0 ? (rightVal / maxVal) * 100 : 50;

  const formatValue = (val: number | null) => {
    if (val === null) return '-';
    if (result.metricType === 'time') {
      const mins = Math.floor(val / 60);
      const secs = val % 60;
      return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    }
    return `${val}${result.unit}`;
  };

  return (
    <div className="space-y-2 py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate flex-1">
          {result.exerciseName}
        </span>
        <Badge className={cn("text-xs shrink-0", severity)}>
          {result.asymmetryPercent}%
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Left side */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-4">L</span>
          <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-sm transition-all",
                  result.dominantSide === 'left' 
                    ? (isTimeBased ? 'bg-success' : 'bg-primary') 
                    : 'bg-muted-foreground/40'
                )}
                style={{ width: `${leftWidth}%` }}
              />
          </div>
          <span className="text-xs font-medium w-14 text-right">
            {formatValue(result.leftBest)}
          </span>
        </div>
        
        {/* Separator */}
        <div className="text-muted-foreground/30">|</div>
        
        {/* Right side */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-medium w-14">
            {formatValue(result.rightBest)}
          </span>
          <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-sm transition-all float-right",
                  result.dominantSide === 'right' 
                    ? (isTimeBased ? 'bg-success' : 'bg-primary') 
                    : 'bg-muted-foreground/40'
                )}
                style={{ width: `${rightWidth}%` }}
              />
          </div>
          <span className="text-xs font-medium text-muted-foreground w-4 text-right">R</span>
        </div>
      </div>
      
      {/* Dominant side indicator */}
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {result.dominantSide === 'left' && (
          <>
            <ChevronLeft className="w-3 h-3" />
            <span>Levá strana {isTimeBased ? 'rychlejší' : 'silnější'}</span>
          </>
        )}
        {result.dominantSide === 'right' && (
          <>
            <span>Pravá strana {isTimeBased ? 'rychlejší' : 'silnější'}</span>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        {result.dominantSide === 'equal' && (
          <span>Symetrický výkon</span>
        )}
      </div>
    </div>
  );
}

export function AsymmetryCard({ clientId, maxItems = 5, className }: AsymmetryCardProps) {
  const { data: asymmetries = [], isLoading } = useAsymmetryAnalysis(clientId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-primary" />
            Asymetrie L vs R
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (asymmetries.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-primary" />
            Asymetrie L vs R
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím nejsou žádné záznamy s rozlišením L/R strany.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayedItems = asymmetries.slice(0, maxItems);
  const hasHighAsymmetry = asymmetries.some(a => a.asymmetryPercent >= 20);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-primary" />
            Asymetrie L vs R
          </CardTitle>
          {hasHighAsymmetry && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="w-3 h-3" />
              Pozor
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          {displayedItems.map((result) => (
            <AsymmetryBar key={`${result.exerciseName}-${result.metricType}`} result={result} />
          ))}
        </div>
        
        {asymmetries.length > maxItems && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{asymmetries.length - maxItems} dalších cviků
          </p>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-success/20" />
            <span>&lt;10%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-warning/20" />
            <span>10-20%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-destructive/20" />
            <span>&gt;20%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
