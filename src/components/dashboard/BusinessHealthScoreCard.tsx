import { memo, useState } from 'react';
import { Info, ChevronRight, TrendingUp, TrendingDown, Minus, Activity, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useBusinessHealthScore } from '@/hooks/useBusinessHealthScore';
import { cn } from '@/lib/utils';
import { BusinessHealthDetailModal } from './BusinessHealthDetailModal';
import { getStatusLabel } from '@/utils/healthInsightsGenerator';

const STATUS_CONFIG = {
  excellent: {
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    accentGradient: 'from-emerald-400 to-green-500',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    glow: '0 0 40px rgba(16, 185, 129, 0.15)',
    pulseColor: 'bg-emerald-400',
  },
  good: {
    gradient: 'from-primary/20 via-primary/5 to-transparent',
    accentGradient: 'from-primary to-violet-500',
    ring: 'ring-primary/30',
    text: 'text-primary',
    bg: 'bg-primary/10',
    glow: '0 0 40px rgba(139, 92, 246, 0.15)',
    pulseColor: 'bg-primary',
  },
  warning: {
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    accentGradient: 'from-amber-400 to-orange-500',
    ring: 'ring-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    glow: '0 0 40px rgba(245, 158, 11, 0.15)',
    pulseColor: 'bg-amber-400',
  },
  critical: {
    gradient: 'from-red-500/20 via-red-500/5 to-transparent',
    accentGradient: 'from-red-400 to-rose-500',
    ring: 'ring-red-500/30',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    glow: '0 0 40px rgba(239, 68, 68, 0.2)',
    pulseColor: 'bg-red-400',
  },
};

const METRIC_CONFIG = {
  retention: { label: 'Retence', icon: '👥' },
  creditHealth: { label: 'Kredity', icon: '💳' },
  revenueTrend: { label: 'Příjmy', icon: '📈' },
  payments: { label: 'Platby', icon: '✓' },
} as const;

export const BusinessHealthScoreCard = memo(function BusinessHealthScoreCard() {
  const { data, isLoading } = useBusinessHealthScore();
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="overflow-hidden bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-28 w-28 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const config = STATUS_CONFIG[data.status];
  const weekChange = data.weekChange || 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card
          className={cn(
            'group relative overflow-hidden cursor-pointer',
            'bg-gradient-to-br border-0',
            config.gradient,
            'backdrop-blur-xl',
            'transition-all duration-500 ease-out',
            'hover:scale-[1.01]',
            'ring-1',
            config.ring
          )}
          style={{ boxShadow: config.glow }}
          onClick={() => setDetailOpen(true)}
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          {/* Subtle shine effect on hover */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
            }}
            initial={{ x: '-100%' }}
            whileHover={{ x: '100%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />

          <CardContent className="relative p-5">
            <div className="flex items-start gap-5">
              {/* Modern Score Display */}
              <motion.div
                className="relative flex-shrink-0"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {/* Outer glow ring */}
                <div className={cn(
                  'absolute -inset-2 rounded-2xl blur-xl opacity-40',
                  config.bg
                )} />
                
                {/* Score container */}
                <div className={cn(
                  'relative w-24 h-24 rounded-2xl',
                  'bg-gradient-to-br from-background/80 to-background/40',
                  'backdrop-blur-sm',
                  'border border-border/30',
                  'flex flex-col items-center justify-center',
                  'shadow-lg'
                )}>
                  {/* Animated pulse indicator */}
                  <motion.div
                    className={cn('absolute -top-1 -right-1 w-3 h-3 rounded-full', config.pulseColor)}
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  
                  {/* Score number */}
                  <motion.span
                    className={cn('text-4xl font-bold tabular-nums', config.text)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {data.score}
                  </motion.span>
                  
                  {/* Progress bar under score */}
                  <div className="w-14 h-1.5 rounded-full bg-muted/30 mt-2 overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full bg-gradient-to-r', config.accentGradient)}
                      initial={{ width: 0 }}
                      animate={{ width: `${data.score}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className={cn('w-4 h-4', config.text)} />
                  <h3 className="font-semibold text-foreground text-sm">Business Health</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
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
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Status badge with trend */}
                <div className="flex items-center gap-2 flex-wrap">
                  <motion.span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                      config.bg,
                      config.text
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Sparkles className="w-3 h-3" />
                    {getStatusLabel(data.status)}
                  </motion.span>
                  
                  <motion.span
                    className={cn(
                      'text-xs flex items-center gap-1 px-2 py-1 rounded-full',
                      weekChange > 0 ? 'text-emerald-400 bg-emerald-500/10' : 
                      weekChange < 0 ? 'text-red-400 bg-red-500/10' : 
                      'text-muted-foreground bg-muted/20'
                    )}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    {weekChange > 0 ? <TrendingUp className="w-3 h-3" /> : 
                     weekChange < 0 ? <TrendingDown className="w-3 h-3" /> : 
                     <Minus className="w-3 h-3" />}
                    {weekChange !== 0 ? `${weekChange > 0 ? '+' : ''}${weekChange}/týden` : 'stabilní'}
                  </motion.span>
                </div>

                {/* Confidence indicator */}
                {data.confidence !== undefined && (
                  <motion.p
                    className="text-xs text-muted-foreground/70 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Spolehlivost dat: {Math.round(data.confidence)}%
                  </motion.p>
                )}
              </div>

              {/* Arrow indicator */}
              <motion.div
                className="flex-shrink-0 self-center"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
              </motion.div>
            </div>

            {/* Metrics row */}
            <motion.div
              className="grid grid-cols-4 gap-2 mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {Object.entries(data.components).map(([key, comp], index) => {
                const metricConfig = METRIC_CONFIG[key as keyof typeof METRIC_CONFIG];
                if (!metricConfig) return null;
                
                const isRevenue = key === 'revenueTrend';
                const displayValue = isRevenue && comp.value > 0 ? `+${comp.value}` : comp.value;
                const isPositive = comp.value >= 70;
                const isNeutral = comp.value >= 50 && comp.value < 70;
                
                return (
                  <motion.div
                    key={key}
                    className={cn(
                      'relative p-3 rounded-xl text-center',
                      'bg-background/40 backdrop-blur-sm',
                      'border border-border/20',
                      'transition-all duration-300',
                      'hover:bg-background/60 hover:border-border/40'
                    )}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 * index + 0.4 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="text-base mb-1">{metricConfig.icon}</div>
                    <div className={cn(
                      'font-bold text-base tabular-nums',
                      isPositive ? 'text-emerald-400' : 
                      isNeutral ? 'text-foreground' : 
                      comp.value < 0 ? 'text-red-400' :
                      'text-amber-400'
                    )}>
                      {displayValue}%
                    </div>
                    <div className="text-muted-foreground/60 text-[10px] font-medium mt-0.5">
                      {metricConfig.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Insight pill */}
            {data.insights.length > 0 && (
              <motion.div
                className={cn(
                  'mt-4 p-3 rounded-xl',
                  'bg-background/30 backdrop-blur-sm',
                  'border border-border/20'
                )}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-xs text-muted-foreground/80 leading-relaxed flex items-start gap-2">
                  <span className="text-sm">💡</span>
                  <span>{data.insights[0]}</span>
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
