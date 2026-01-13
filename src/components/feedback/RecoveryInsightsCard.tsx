/**
 * Recovery Insights Card
 * Displays recovery score, sleep impact, and readiness for next training
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Moon, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  Battery,
  BedDouble,
  Activity
} from 'lucide-react';
import { useRecoveryAnalytics, RecoveryScore, SleepImpact } from '@/hooks/useRecoveryAnalytics';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RecoveryInsightsCardProps {
  clientId: string;
  className?: string;
}

const statusColors: Record<RecoveryScore['status'], string> = {
  ready: 'bg-green-500/10 text-green-600 border-green-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  fatigued: 'bg-red-500/10 text-red-600 border-red-500/20',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const trendIcons = {
  improving: <TrendingUp className="h-4 w-4 text-green-500" />,
  stable: <Minus className="h-4 w-4 text-muted-foreground" />,
  declining: <TrendingDown className="h-4 w-4 text-red-500" />,
  unknown: null,
};

function ScoreBar({ 
  label, 
  value, 
  icon: Icon,
  inverted = false 
}: { 
  label: string; 
  value: number | null; 
  icon: React.ElementType;
  inverted?: boolean;
}) {
  if (value == null) return null;
  
  const displayValue = inverted ? 10 - value : value;
  const percentage = (displayValue / 10) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-medium">{displayValue.toFixed(1)}</span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-1.5",
          percentage >= 70 ? "[&>div]:bg-green-500" :
          percentage >= 40 ? "[&>div]:bg-yellow-500" :
          "[&>div]:bg-red-500"
        )}
      />
    </div>
  );
}

function SleepInsightBadge({ sleepImpact }: { sleepImpact: SleepImpact }) {
  if (!sleepImpact.insight) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
            <Moon className="h-4 w-4 text-blue-500" />
            <span>{sleepImpact.insight}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-sm">
            {sleepImpact.avgEnergyAfterGoodSleep != null && (
              <p>Energie po dobrém spánku: {sleepImpact.avgEnergyAfterGoodSleep.toFixed(1)}</p>
            )}
            {sleepImpact.avgEnergyAfterPoorSleep != null && (
              <p>Energie po špatném spánku: {sleepImpact.avgEnergyAfterPoorSleep.toFixed(1)}</p>
            )}
            {sleepImpact.optimalSleepHours && (
              <p>Doporučená délka: {sleepImpact.optimalSleepHours}h</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function RecoveryInsightsCard({ clientId, className }: RecoveryInsightsCardProps) {
  const { data, isLoading } = useRecoveryAnalytics(clientId);
  
  if (isLoading) {
    return (
      <Card className={cn("jm-card", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-h3 flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Regenerace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card className={cn("jm-card", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-h3 flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Regenerace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nedostatek dat pro analýzu regenerace
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const { recovery, sleepImpact, enjoymentTrend } = data;
  
  return (
    <Card className={cn("jm-card", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-h3 flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Regenerace
          </CardTitle>
          {trendIcons[recovery.trend]}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2",
              statusColors[recovery.status]
            )}>
              {recovery.readinessScore?.toFixed(1) ?? '—'}
            </div>
          </div>
          <div className="flex-1">
            <Badge variant="outline" className={cn("mb-1", statusColors[recovery.status])}>
              {recovery.status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
              {recovery.status === 'fatigued' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {recovery.statusLabel}
            </Badge>
            <p className="text-sm text-muted-foreground">
              Recovery Index (1-10)
            </p>
          </div>
        </div>
        
        {/* Component Scores */}
        <div className="space-y-2">
          <ScoreBar 
            label="Spánek" 
            value={recovery.components.sleep} 
            icon={BedDouble}
          />
          <ScoreBar 
            label="Energie" 
            value={recovery.components.energy} 
            icon={Zap}
          />
          <ScoreBar 
            label="Pocit v těle" 
            value={recovery.components.bodyFeel} 
            icon={Activity}
          />
          <ScoreBar 
            label="Svalovka (inv.)" 
            value={recovery.components.soreness} 
            icon={Activity}
          />
        </div>
        
        {/* Sleep Insight */}
        {sleepImpact && <SleepInsightBadge sleepImpact={sleepImpact} />}
        
        {/* Enjoyment Warning */}
        {enjoymentTrend.isWarning && enjoymentTrend.warningMessage && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <span className="text-orange-700 dark:text-orange-400">
              {enjoymentTrend.warningMessage}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
