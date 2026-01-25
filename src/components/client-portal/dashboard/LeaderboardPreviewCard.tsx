import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Dumbbell, Heart, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useExercisesWithPercentiles } from '@/hooks/useExercisePercentiles';
import ClientPortalLeaderboard from '@/pages/client-portal/ClientPortalLeaderboard';

export function LeaderboardPreviewCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  
  const { data: exercises, isLoading } = useExercisesWithPercentiles(trainerId);

  const strengthCount = exercises?.strength?.length || 0;
  const plyoCount = exercises?.plyometrics?.length || 0;
  const cardioCount = exercises?.cardio?.length || 0;
  const totalCount = strengthCount + plyoCount + cardioCount;

  // Don't show the card if no exercises are available
  if (!isLoading && totalCount === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card 
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => setIsOpen(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Žebříček
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Srovnej se s ostatními klienty
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {strengthCount > 0 && (
                <Badge variant="secondary" className="gap-1.5">
                  <Dumbbell className="w-3 h-3" />
                  Síla ({strengthCount})
                </Badge>
              )}
              {plyoCount > 0 && (
                <Badge variant="secondary" className="gap-1.5">
                  <Zap className="w-3 h-3" />
                  Plyo ({plyoCount})
                </Badge>
              )}
              {cardioCount > 0 && (
                <Badge variant="secondary" className="gap-1.5">
                  <Heart className="w-3 h-3" />
                  Kardio ({cardioCount})
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Full Leaderboard Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Žebříček</SheetTitle>
            <SheetDescription>Porovnání výkonu s ostatními klienty</SheetDescription>
          </SheetHeader>
          <ClientPortalLeaderboard />
        </SheetContent>
      </Sheet>
    </>
  );
}
