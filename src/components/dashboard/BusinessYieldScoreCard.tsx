import { memo, useState } from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Minus, Activity, Zap, Users, Shield, DollarSign, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBusinessYieldScore, YieldPillar } from '@/hooks/useBusinessYieldScore';
import { cn } from '@/lib/utils';
import { BusinessHealthDetailModal } from './BusinessHealthDetailModal';

const STATUS_CONFIG = {
  excellent: {
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Skvělé',
  },
  good: {
    gradient: 'from-primary/20 via-primary/5 to-transparent',
    ring: 'ring-primary/30',
    text: 'text-primary',
    bg: 'bg-primary/10',
    label: 'Stabilní',
  },
  warning: {
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    ring: 'ring-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    label: 'Vyžaduje pozornost',
  },
  critical: {
    gradient: 'from-red-500/20 via-red-500/5 to-transparent',
    ring: 'ring-red-500/30',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Rizikové',
  },
};

const PILLAR_CONFIG = {
  revenue: { label: 'Efektivita', icon: DollarSign, tooltip: 'Příjem/hodina, průměrná cena tréninku' },
  utilization: { label: 'Vytížení', icon: Zap, tooltip: 'Využití kapacity, míra rušení' },
  clientQuality: { label: 'Klienti', icon: Users, tooltip: 'Retence, koncentrace příjmů' },
  stability: { label: 'Stabilita', icon: Shield, tooltip: 'Platební morálka, dluhy' },
};

function PillarBar({ pillar, pillarKey }: { pillar: YieldPillar; pillarKey: keyof typeof PILLAR_CONFIG }) {
  const config = PILLAR_CONFIG[pillarKey];
  const Icon = config.icon;
  const isPositive = pillar.score >= 70;
  const isNeutral = pillar.score >= 50 && pillar.score < 70;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <Icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground truncate">{config.label}</span>
            </div>
            <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  isPositive ? 'bg-emerald-500' : isNeutral ? 'bg-amber-500' : 'bg-red-500'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pillar.score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className={cn(
                'text-xs font-medium',
                isPositive ? 'text-emerald-400' : isNeutral ? 'text-amber-400' : 'text-red-400'
              )}>
                {pillar.score}
              </span>
              {pillar.trend !== 'stable' && (
                <span className={cn(
                  'text-[10px]',
                  pillar.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {pillar.trend === 'up' ? '↑' : '↓'}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">{config.tooltip}</p>
          <p className="text-xs mt-1">Skóre: {pillar.score}/100 (váha {Math.round(pillar.weight * 100)}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const BusinessYieldScoreCard = memo(function BusinessYieldScoreCard() {
  const { data, isLoading } = useBusinessYieldScore();
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="overflow-hidden bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const config = STATUS_CONFIG[data.status];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          className={cn(
            'group relative overflow-hidden cursor-pointer',
            'bg-gradient-to-br border-0',
            config.gradient,
            'ring-1',
            config.ring,
            'hover:scale-[1.01] transition-transform'
          )}
          onClick={() => setDetailOpen(true)}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Score */}
              <div className={cn(
                'relative w-20 h-20 rounded-xl flex flex-col items-center justify-center',
                'bg-background/50 border border-border/30'
              )}>
                <span className={cn('text-3xl font-bold', config.text)}>{data.score}</span>
                <div className="w-12 h-1 rounded-full bg-muted/30 mt-1 overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', config.bg)}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.score}%` }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className={cn('w-4 h-4', config.text)} />
                  <h3 className="font-semibold text-sm">Business Yield</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground/60" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Měří efektivitu převodu času na peníze a stabilitu byznysu.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', config.bg, config.text)}>
                    {config.label}
                  </span>
                  <span className={cn(
                    'text-xs flex items-center gap-1 px-2 py-0.5 rounded-full',
                    data.weekChange > 0 ? 'text-emerald-400 bg-emerald-500/10' :
                    data.weekChange < 0 ? 'text-red-400 bg-red-500/10' :
                    'text-muted-foreground bg-muted/20'
                  )}>
                    {data.weekChange > 0 ? <TrendingUp className="w-3 h-3" /> :
                     data.weekChange < 0 ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {data.weekChange !== 0 ? `${data.weekChange > 0 ? '+' : ''}${data.weekChange}/týden` : 'stabilní'}
                  </span>
                </div>

                {/* Pillar bars */}
                <div className="flex gap-3">
                  <PillarBar pillar={data.pillars.revenue} pillarKey="revenue" />
                  <PillarBar pillar={data.pillars.utilization} pillarKey="utilization" />
                  <PillarBar pillar={data.pillars.clientQuality} pillarKey="clientQuality" />
                  <PillarBar pillar={data.pillars.stability} pillarKey="stability" />
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground/50 self-center" />
            </div>

            {/* Insight preview */}
            {data.insights.whatSlows.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/20">
                <p className="text-xs text-muted-foreground line-clamp-1">
                  ⚠️ {data.insights.whatSlows[0]}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <BusinessHealthDetailModal open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
});
