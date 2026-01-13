import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Flame, Dumbbell, Target, Zap, Star, 
  ChevronRight, X, TrendingUp, Clock, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCelebrations } from '@/contexts/CelebrationContext';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface TrainingSummaryOverlayProps {
  open: boolean;
  onClose: () => void;
  summary: {
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    exerciseCount: number;
    durationMinutes: number;
    averageRPE: number | null;
    newPRs: {
      exerciseName: string;
      value: number;
      unit: string;
      improvement: number;
    }[];
    topExercises: {
      name: string;
      volume: number;
      sets: number;
    }[];
    xpEarned: number;
    streakDays: number;
  };
  clientName: string;
}

export function TrainingSummaryOverlay({ open, onClose, summary, clientName }: TrainingSummaryOverlayProps) {
  const [showPRs, setShowPRs] = useState(false);
  const { showPR } = useCelebrations();

  // Trigger confetti on open if there are PRs
  useEffect(() => {
    if (open && summary.newPRs.length > 0) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1'],
        });
      }, 500);

      // Show PR celebration after summary
      const prTimer = setTimeout(() => {
        setShowPRs(true);
      }, 1500);

      return () => {
        clearTimeout(timer);
        clearTimeout(prTimer);
      };
    }
  }, [open, summary.newPRs.length]);

  // Trigger individual PR celebrations
  useEffect(() => {
    if (showPRs && summary.newPRs.length > 0) {
      summary.newPRs.forEach((pr, index) => {
        setTimeout(() => {
          showPR(pr.exerciseName, `${pr.value} ${pr.unit}`, 25);
        }, index * 2000);
      });
    }
  }, [showPRs, summary.newPRs, showPR]);

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}t`;
    }
    return `${volume} kg`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-8">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="p-3 rounded-full bg-primary/20"
                >
                  <Trophy className="w-8 h-8 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold">Trénink dokončen!</h2>
                  <p className="text-sm text-muted-foreground">{clientName}</p>
                </div>
              </div>

              {/* XP Badge */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold"
              >
                <Zap className="w-5 h-5" />
                +{summary.xpEarned} XP
              </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Objem</span>
                  </div>
                  <p className="text-2xl font-bold">{formatVolume(summary.totalVolume)}</p>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="p-4 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-success" />
                    <span className="text-xs text-muted-foreground">Série</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.totalSets}</p>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="p-4 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Cviky</span>
                  </div>
                  <p className="text-2xl font-bold">{summary.exerciseCount}</p>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="p-4 rounded-xl bg-muted/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-warning" />
                    <span className="text-xs text-muted-foreground">RPE</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {summary.averageRPE ? `${summary.averageRPE}/10` : '-'}
                  </p>
                </motion.div>
              </div>

              {/* New PRs Section */}
              {summary.newPRs.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-warning/20 to-warning/10 border border-warning/30"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-warning" />
                    <span className="font-semibold text-warning">
                      Nové osobní rekordy!
                    </span>
                    <Badge className="bg-warning text-warning-foreground ml-auto">
                      {summary.newPRs.length} PR
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {summary.newPRs.map((pr, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium">{pr.exerciseName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{pr.value} {pr.unit}</span>
                          {pr.improvement > 0 && (
                            <Badge variant="outline" className="text-success border-success/50">
                              +{pr.improvement} {pr.unit}
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Streak */}
              {summary.streakDays > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex items-center justify-center gap-3 p-3 rounded-xl bg-warning/10 border border-warning/20"
                >
                  <Flame className="w-6 h-6 text-warning" />
                  <span className="font-semibold text-warning">
                    {summary.streakDays} dní v řadě!
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(summary.streakDays, 7) }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1.1 + i * 0.05 }}
                        className="w-2 h-2 rounded-full bg-orange-500"
                      />
                    ))}
                  </div>
                </motion.div>
              )}


              {/* Close Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                <Button onClick={onClose} className="w-full" size="lg">
                  Pokračovat
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
