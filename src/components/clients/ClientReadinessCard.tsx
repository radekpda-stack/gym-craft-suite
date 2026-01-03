/**
 * ClientReadinessCard Component
 * 
 * Shows pre-training readiness check with:
 * - Overall readiness score
 * - Days since last training
 * - Training streak
 * - Warnings from feedback
 * - Intensity recommendation
 */
import { 
  Activity, 
  AlertTriangle, 
  Battery, 
  Calendar, 
  Flame, 
  TrendingDown, 
  TrendingUp,
  Zap,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useClientReadiness } from '@/hooks/useClientReadiness';

interface ClientReadinessCardProps {
  clientId: string;
}

export function ClientReadinessCard({ clientId }: ClientReadinessCardProps) {
  const { data, isLoading } = useClientReadiness(clientId);

  if (isLoading) {
    return <Skeleton className="h-32 rounded-2xl" />;
  }

  if (!data) {
    return null;
  }

  const getReadinessColor = () => {
    switch (data.readinessLevel) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getReadinessBg = () => {
    switch (data.readinessLevel) {
      case 'high': return 'bg-green-500/10 border-green-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-secondary/50 border-border';
    }
  };

  const getIntensityBadge = () => {
    switch (data.intensityRecommendation) {
      case 'increase':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30 gap-1"><TrendingUp className="w-3 h-3" />Zvýšit</Badge>;
      case 'reduce':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 gap-1"><TrendingDown className="w-3 h-3" />Snížit</Badge>;
      case 'deload':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30 gap-1"><Battery className="w-3 h-3" />Deload</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Activity className="w-3 h-3" />Normální</Badge>;
    }
  };

  return (
    <div className={cn('rounded-2xl p-4 border', getReadinessBg())}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className={cn('w-5 h-5', getReadinessColor())} />
          <span className="font-semibold text-foreground">Připravenost</span>
        </div>
        {getIntensityBadge()}
      </div>

      {/* Main score */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className={cn('text-3xl font-bold', getReadinessColor())}>
              {data.readinessScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress 
            value={data.readinessScore} 
            className="h-2"
          />
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Days since training */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className={cn(
                  'font-bold',
                  data.daysSinceLastTraining !== null && data.daysSinceLastTraining >= 7 
                    ? 'text-warning' 
                    : 'text-foreground'
                )}>
                  {data.daysSinceLastTraining ?? '—'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">dní od tr.</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Dní od posledního tréninku</p>
          </TooltipContent>
        </Tooltip>

        {/* Training streak */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50">
              <div className="flex items-center gap-1">
                <Flame className={cn(
                  'w-3 h-3',
                  data.trainingStreak >= 4 ? 'text-orange-500' : 'text-muted-foreground'
                )} />
                <span className="font-bold text-foreground">
                  {data.trainingStreak}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">týdnů</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Týdnů v řadě s tréninkem</p>
          </TooltipContent>
        </Tooltip>

        {/* Adherence */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className={cn(
                  'font-bold',
                  data.adherenceRate < 80 ? 'text-warning' : 'text-foreground'
                )}>
                  {data.adherenceRate}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">docházka</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Docházka vs. minulý měsíc</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="space-y-1">
          {data.warnings.map((warning, i) => (
            <div 
              key={i}
              className="flex items-center gap-2 text-xs text-warning bg-warning/10 px-2 py-1 rounded"
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
