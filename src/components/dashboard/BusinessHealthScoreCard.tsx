import { memo, useState } from 'react';
import { Info, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBusinessHealthScore } from '@/hooks/useBusinessHealthScore';
import { cn } from '@/lib/utils';
import { BusinessHealthDetailModal } from './BusinessHealthDetailModal';
import { AnimatedHealthGauge } from './AnimatedHealthGauge';
import { getStatusLabel } from '@/utils/healthInsightsGenerator';

const STATUS_STYLES = {
  excellent: {
    bg: 'from-success/15 via-success/5 to-transparent',
    border: 'border-success/20',
    badge: 'bg-success/20 text-success',
    glow: 'shadow-success/20',
  },
  good: {
    bg: 'from-primary/15 via-primary/5 to-transparent',
    border: 'border-primary/20',
    badge: 'bg-primary/20 text-primary',
    glow: 'shadow-primary/20',
  },
  warning: {
    bg: 'from-warning/15 via-warning/5 to-transparent',
    border: 'border-warning/20',
    badge: 'bg-warning/20 text-warning',
    glow: 'shadow-warning/20',
  },
  critical: {
    bg: 'from-destructive/15 via-destructive/5 to-transparent',
    border: 'border-destructive/20',
    badge: 'bg-destructive/20 text-destructive',
    glow: 'shadow-destructive/20',
  },
};

const COMPONENT_CONFIG = {
  retention: { icon: '👥', key: 'retention' },
  creditHealth: { icon: '💳', key: 'credits' },
  revenueTrend: { icon: '📈', key: 'revenue' },
  payments: { icon: '✓', key: 'payments' },
} as const;

export const BusinessHealthScoreCard = memo(function BusinessHealthScoreCard() {
  const { data, isLoading } = useBusinessHealthScore();
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="glass overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const styles = STATUS_STYLES[data.status];
  const weekChange = data.weekChange || 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card
          className={cn(
            'overflow-hidden cursor-pointer transition-all duration-300',
            'bg-gradient-to-br border',
            styles.bg,
            styles.border,
            'hover:shadow-lg',
            styles.glow,
            'hover:scale-[1.01]'
          )}
          onClick={() => setDetailOpen(true)}
        >
          <CardContent className="p-5">
            {/* Header with Gauge */}
            <div className="flex items-start gap-5">
              <AnimatedHealthGauge
                score={data.score}
                status={data.status}
                size="lg"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">Business Health Score</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-2 text-xs">
                          <p className="font-medium">Jak se počítá skóre:</p>
                          <div className="space-y-1 text-muted-foreground">
                            <p>• <strong>Retence:</strong> aktivní klienti za 60 dní</p>
                            <p>• <strong>Zdraví kreditů:</strong> klienti s kladným kreditem</p>
                            <p>• <strong>Trend příjmů:</strong> změna oproti minulému měsíci</p>
                            <p>• <strong>Platební morálka:</strong> % zaplacených tréninků</p>
                          </div>
                          <p className="text-muted-foreground pt-1 border-t border-border/50">
                            Skóre se automaticky přizpůsobuje tvému byznysu.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', styles.badge)}>
                    {getStatusLabel(data.status)}
                  </span>
                  
                  {weekChange !== 0 && (
                    <span className={cn(
                      'text-xs flex items-center gap-0.5',
                      weekChange > 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {weekChange > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {weekChange > 0 ? '+' : ''}{weekChange} za týden
                    </span>
                  )}
                  {weekChange === 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Minus className="w-3 h-3" />
                      stabilní
                    </span>
                  )}
                </div>

                {data.confidence !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    🎯 Spolehlivost: {Math.round(data.confidence)}%
                  </p>
                )}
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
            </div>

            {/* Component Grid */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {Object.entries(data.components).map(([key, comp], index) => {
                const config = COMPONENT_CONFIG[key as keyof typeof COMPONENT_CONFIG];
                if (!config) return null;
                
                const isRevenue = key === 'revenueTrend';
                const displayValue = isRevenue && comp.value > 0 ? `+${comp.value}` : comp.value;
                
                return (
                  <motion.div
                    key={key}
                    className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm text-center border border-border/50"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-sm mb-0.5">
                      {config.icon}
                    </div>
                    <div className={cn(
                      'font-bold text-sm tabular-nums',
                      comp.value >= 70 ? 'text-success' : 
                      comp.value >= 50 ? 'text-foreground' : 
                      comp.value < 0 ? 'text-destructive' :
                      'text-warning'
                    )}>
                      {displayValue}%
                    </div>
                    <div className="text-muted-foreground text-[10px] leading-tight truncate">
                      {comp.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Primary Insight */}
            {data.insights.length > 0 && (
              <motion.div
                className="mt-3 p-2.5 rounded-lg bg-background/40 border border-border/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs text-muted-foreground leading-relaxed">
                  💡 {data.insights[0]}
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <BusinessHealthDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
});
