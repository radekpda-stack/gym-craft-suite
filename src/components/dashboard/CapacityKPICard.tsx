import { useNavigate } from 'react-router-dom';
import { Gauge, Settings, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { useCapacityUtilization } from '@/hooks/useCapacityUtilization';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function CapacityKPICard() {
  const navigate = useNavigate();
  const { isConfigured, isLoading: settingsLoading } = useCapacitySettings();
  const { data, isLoading: dataLoading } = useCapacityUtilization();

  const isLoading = settingsLoading || dataLoading;

  // Not configured state
  if (!isConfigured && !settingsLoading) {
    return (
      <div className="glass rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center min-h-[120px] gap-2">
        <Gauge className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Obsazenost</p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => navigate('/settings')}
        >
          <Settings className="w-3.5 h-3.5" />
          Nastavit kapacitu
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading || !data) {
    return (
      <div className="glass rounded-xl p-3 sm:p-4 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="h-5 w-5 bg-muted rounded" />
        </div>
        <div className="h-8 bg-muted rounded w-16 mb-1" />
        <div className="h-3 bg-muted rounded w-24" />
      </div>
    );
  }

  const { utilizationPercent, occupiedSlots, availableSlots, trend } = data;

  // Determine color based on utilization
  const getUtilizationColor = (percent: number) => {
    if (percent >= 80) return 'text-green-500';
    if (percent >= 50) return 'text-primary';
    if (percent >= 30) return 'text-warning';
    return 'text-muted-foreground';
  };

  const TrendIcon = trend !== null && trend > 0 
    ? TrendingUp 
    : trend !== null && trend < 0 
      ? TrendingDown 
      : Minus;

  const trendColor = trend !== null && trend > 0 
    ? 'text-green-500' 
    : trend !== null && trend < 0 
      ? 'text-destructive' 
      : 'text-muted-foreground';

  return (
    <div 
      className="glass rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
      onClick={() => navigate('/schedule')}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm text-muted-foreground font-medium">
          Obsazenost
        </span>
        <Gauge className={cn('w-4 h-4 sm:w-5 sm:h-5', getUtilizationColor(utilizationPercent))} />
      </div>
      
      <div className={cn('text-2xl sm:text-3xl font-bold', getUtilizationColor(utilizationPercent))}>
        {utilizationPercent}%
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {occupiedSlots} z {availableSlots} slotů
        </span>
        
        {trend !== null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn('text-xs flex items-center gap-0.5', trendColor)}>
                <TrendIcon className="w-3 h-3" />
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Změna oproti předchozímu období</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground">—</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Srovnání není k dispozici</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
