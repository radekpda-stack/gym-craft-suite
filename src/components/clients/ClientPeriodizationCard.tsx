/**
 * ClientPeriodizationCard Component
 * 
 * Shows current training phase and trends
 */
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useClientPeriodization, PHASE_CONFIG } from '@/hooks/useClientPeriodization';
import { useState } from 'react';

interface ClientPeriodizationCardProps {
  clientId: string;
  defaultOpen?: boolean;
}

export function ClientPeriodizationCard({ clientId, defaultOpen = false }: ClientPeriodizationCardProps) {
  const { data, isLoading } = useClientPeriodization(clientId);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isLoading) {
    return <Skeleton className="h-20 rounded-2xl" />;
  }

  if (!data || data.currentPhase === 'unknown') {
    return null;
  }

  const phaseConfig = PHASE_CONFIG[data.currentPhase];
  const nextPhaseConfig = PHASE_CONFIG[data.suggestedNextPhase];

  const TrendIcon = ({ trend }: { trend: 'increasing' | 'stable' | 'decreasing' }) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'decreasing': return <TrendingDown className="w-3 h-3 text-destructive" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          'w-full rounded-2xl p-4 border text-left transition-colors hover:bg-secondary/30',
          phaseConfig.bgColor
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-xl', phaseConfig.bgColor)}>
                <Layers className={cn('w-5 h-5', phaseConfig.color)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{phaseConfig.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {data.weeksInPhase}. týden
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{phaseConfig.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Trend indicators */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Vol</span>
                <TrendIcon trend={data.volumeTrend} />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Int</span>
                <TrendIcon trend={data.intensityTrend} />
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-2xl bg-secondary/30 space-y-3">
          {/* Recommendation */}
          <div className="text-sm">
            <span className="text-muted-foreground">Doporučení: </span>
            <span className="text-foreground">{data.recommendation}</span>
          </div>

          {/* Weekly volumes chart simplified */}
          {data.weeklyVolumes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Týdenní objem (poslední 4 týdny)</p>
              <div className="flex items-end gap-1 h-12">
                {data.weeklyVolumes.slice(-4).map((week, i) => {
                  const maxVol = Math.max(...data.weeklyVolumes.slice(-4).map(w => w.volume));
                  const height = maxVol > 0 ? (week.volume / maxVol) * 100 : 0;
                  return (
                    <div 
                      key={i}
                      className="flex-1 bg-primary/30 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 10)}%` }}
                      title={`${Math.round(week.volume / 1000)}k kg`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Next phase suggestion */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Další fáze:</span>
            <Badge className={cn('text-xs', nextPhaseConfig.bgColor, nextPhaseConfig.color)}>
              {nextPhaseConfig.label}
            </Badge>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
