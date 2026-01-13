import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { 
  useClientInsights, 
  selectRotatedInsights,
  type ClientInsight 
} from '@/hooks/useClientInsights';

export function ClientInsightsCard() {
  const { clientId } = useClientPortal();
  const { data: allInsights, isLoading } = useClientInsights(clientId ?? undefined);
  const [rotationSeed, setRotationSeed] = useState(() => Date.now());
  const [selectedInsight, setSelectedInsight] = useState<ClientInsight | null>(null);

  const displayedInsights = useMemo(() => {
    if (!allInsights) return [];
    return selectRotatedInsights(allInsights, 3, rotationSeed);
  }, [allInsights, rotationSeed]);

  const handleRefresh = () => {
    setRotationSeed(Date.now());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allInsights || allInsights.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5 pointer-events-none" />
          
          <CardContent className="relative p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Postřehy</h3>
              </div>
              {allInsights.length > 3 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Insights List */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {displayedInsights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <button
                      onClick={() => setSelectedInsight(insight)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                        "hover:scale-[1.01] active:scale-[0.99]",
                        insight.type === 'warning' 
                          ? "bg-warning/10 hover:bg-warning/15 border border-warning/20"
                          : insight.type === 'success'
                          ? "bg-success/10 hover:bg-success/15 border border-success/20"
                          : "bg-muted/50 hover:bg-muted/70 border border-border/30"
                      )}
                    >
                      <span className="text-lg shrink-0">{insight.icon}</span>
                      <span className={cn(
                        "text-sm text-left flex-1 line-clamp-2",
                        insight.type === 'warning' && "text-warning-foreground",
                      )}>
                        {insight.text}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Sheet */}
      <InsightDetailSheet 
        insight={selectedInsight}
        open={!!selectedInsight}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
      />
    </>
  );
}

// Internal detail sheet component
interface InsightDetailSheetProps {
  insight: ClientInsight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InsightDetailSheet({ insight, open, onOpenChange }: InsightDetailSheetProps) {
  if (!insight) return null;

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-success" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeConfig = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-success/20 via-success/10 to-transparent',
          iconBg: 'bg-success/20',
          iconRing: 'ring-success/30',
          badge: { variant: 'default' as const, label: 'Pozitivní' },
          accentColor: 'success'
        };
      case 'warning':
        return {
          gradient: 'from-warning/20 via-warning/10 to-transparent',
          iconBg: 'bg-warning/20',
          iconRing: 'ring-warning/30',
          badge: { variant: 'destructive' as const, label: 'Upozornění' },
          accentColor: 'warning'
        };
      default:
        return {
          gradient: 'from-primary/20 via-primary/10 to-transparent',
          iconBg: 'bg-primary/20',
          iconRing: 'ring-primary/30',
          badge: { variant: 'secondary' as const, label: 'Info' },
          accentColor: 'primary'
        };
    }
  };

  const config = getTypeConfig(insight.type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl border-t-0 overflow-hidden">
        {/* Hero Header with Gradient */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${config.gradient} pointer-events-none`} />
        
        {/* Decorative blur elements */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-${config.accentColor}/10 blur-3xl pointer-events-none`} />
        
        <SheetHeader className="relative text-left pb-6 pt-2">
          <div className="flex items-start gap-4">
            {/* Animated Icon */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`w-14 h-14 rounded-2xl ${config.iconBg} ring-2 ${config.iconRing} flex items-center justify-center shrink-0 backdrop-blur-sm`}
            >
              <span className="text-2xl">{insight.icon}</span>
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SheetTitle className="text-lg font-semibold leading-tight mb-2">
                  {insight.detail?.title || insight.text}
                </SheetTitle>
                <Badge variant={config.badge.variant} className="font-medium">
                  {config.badge.label}
                </Badge>
              </motion.div>
            </div>
          </div>
          
          {insight.detail?.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <SheetDescription className="text-sm mt-4 leading-relaxed">
                {insight.detail.description}
              </SheetDescription>
            </motion.div>
          )}
        </SheetHeader>

        <div className="relative space-y-5 pb-6">
          {/* Main Metric Card */}
          {insight.detail?.metric && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 p-5 border border-border/40 backdrop-blur-sm"
            >
              {/* Decorative blur */}
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-${config.accentColor}/15 blur-2xl`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {insight.detail.metric.label}
                  </span>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 400 }}
                  >
                    {getTrendIcon(insight.detail.metric.trend)}
                  </motion.div>
                </div>
                <motion.div 
                  className="text-3xl font-bold tracking-tight"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  {insight.detail.metric.value}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Breakdown Section */}
          {insight.detail?.breakdown && insight.detail.breakdown.items.length > 0 && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <h4 className="text-sm font-semibold text-muted-foreground px-1">
                Rozdělení
              </h4>
              <div className="space-y-2">
                {insight.detail.breakdown.items.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/20"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tip Section with Glow */}
          {insight.detail?.tip && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative p-4 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-20 h-20 bg-primary/15 blur-2xl rounded-full" />
              
              <div className="relative flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-primary leading-relaxed pt-1">
                  {insight.detail.tip}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
