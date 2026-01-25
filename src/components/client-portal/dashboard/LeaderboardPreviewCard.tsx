import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Dumbbell, Heart, Zap, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useExercisesWithPercentiles } from '@/hooks/useExercisePercentiles';
import { usePerformanceBenchmarks } from '@/hooks/usePerformanceBenchmarks';
import { haptic } from '@/lib/animations';
import ClientPortalLeaderboard from '@/pages/client-portal/ClientPortalLeaderboard';

export function LeaderboardPreviewCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { clientId, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  
  const { data: exercises, isLoading } = useExercisesWithPercentiles(trainerId);
  const { data: benchmarks } = usePerformanceBenchmarks(clientId ?? undefined);

  const strengthCount = exercises?.strength?.length || 0;
  const plyoCount = exercises?.plyometrics?.length || 0;
  const cardioCount = exercises?.cardio?.length || 0;
  const totalCount = strengthCount + plyoCount + cardioCount;

  // Don't show the card if no exercises are available
  if (!isLoading && totalCount === 0) {
    return null;
  }

  const handleOpen = () => {
    haptic('light');
    setIsOpen(true);
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const containerVariants = {
    rest: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: { type: "spring" as const, stiffness: 400, damping: 25 }
    },
    tap: { scale: 0.98 }
  };

  const iconVariants = {
    rest: { rotate: 0 },
    hover: { 
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.5 }
    }
  };

  const arrowVariants = {
    rest: { x: 0 },
    hover: { x: 4, transition: { type: "spring" as const, stiffness: 400 } }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <motion.div
          variants={containerVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Card 
            className={cn(
              "cursor-pointer overflow-hidden relative group",
              "border-border/50 hover:border-primary/40",
              "transition-all duration-300",
              "hover:shadow-lg hover:shadow-primary/5"
            )}
            onClick={handleOpen}
          >
            {/* Animated gradient background on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            
            {/* Subtle shimmer effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                animate={{
                  translateX: ['-100%', '200%']
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatDelay: 5,
                  ease: "easeInOut"
                }}
              />
            </div>

            <CardHeader className="pb-2 relative">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <motion.div variants={iconVariants}>
                    <Trophy className="w-4 h-4 text-primary" />
                  </motion.div>
                  Žebříček
                </span>
                <motion.div variants={arrowVariants}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Srovnej se s ostatními klienty
              </p>
            </CardHeader>
            
            <CardContent className="relative">
              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {strengthCount > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20"
                    >
                      <Dumbbell className="w-3 h-3 text-primary" />
                      Síla ({strengthCount})
                    </Badge>
                  </motion.div>
                )}
                {plyoCount > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="gap-1.5 bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      Plyo ({plyoCount})
                    </Badge>
                  </motion.div>
                )}
                {cardioCount > 0 && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Badge 
                      variant="secondary" 
                      className="gap-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                    >
                      <Heart className="w-3 h-3 text-emerald-500" />
                      Kardio ({cardioCount})
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* Quick highlight - strongest exercise */}
              {benchmarks?.strongestExercise && (
                <motion.div 
                  className="mt-3 pt-3 border-t border-border/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="text-muted-foreground">Tvá síla:</span>
                    <span className="font-medium capitalize">{benchmarks.strongestExercise.name}</span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Full Leaderboard Sheet with spring animation */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] overflow-y-auto rounded-t-3xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Žebříček</SheetTitle>
            <SheetDescription>Porovnání výkonu s ostatními klienty</SheetDescription>
          </SheetHeader>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <ClientPortalLeaderboard />
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  );
}
