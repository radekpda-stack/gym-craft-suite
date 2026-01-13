import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, TrendingDown, Sparkles, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface SubmissionFeedbackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeTitle: string;
  submittedScore: number;
  primaryMetric: string;
  unitLabel?: string | null;
  scoringType: string;
  previousBest?: number | null;
  percentile?: number | null;
  rank?: number | null;
  totalParticipants?: number;
}

export function SubmissionFeedback({
  open,
  onOpenChange,
  challengeTitle,
  submittedScore,
  primaryMetric,
  unitLabel,
  scoringType,
  previousBest,
  percentile,
  rank,
  totalParticipants,
}: SubmissionFeedbackProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Calculate improvement
  const improvement = previousBest != null ? submittedScore - previousBest : null;
  const isLowerBetter = scoringType === 'time_lower_better';
  const isImproved = improvement != null && (isLowerBetter ? improvement < 0 : improvement > 0);
  const isNewPR = isImproved || previousBest == null;

  // Trigger confetti for good results
  useEffect(() => {
    if (open && (isNewPR || (percentile != null && percentile >= 75))) {
      setShowConfetti(true);
      
      // Fire confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open, isNewPR, percentile]);

  const getMotivationalMessage = () => {
    if (rank === 1) return 'Jsi na prvním místě! 🏆';
    if (rank && rank <= 3) return 'Jsi v TOP 3! Skvělý výkon!';
    if (percentile != null && percentile >= 90) return 'Výborně! Patříš mezi TOP 10%!';
    if (percentile != null && percentile >= 75) return 'Skvělé! Jsi lepší než 75% účastníků!';
    if (percentile != null && percentile >= 50) return 'Dobrá práce! Jsi v horní polovině!';
    if (isNewPR && previousBest) return 'Nový osobní rekord! 🎉';
    if (isNewPR) return 'Tvůj první pokus je zaznamenán! 💪';
    return 'Výsledek odeslán. Pokračuj v tréninku!';
  };

  const handleShare = async () => {
    const text = `Právě jsem dokončil(a) výzvu "${challengeTitle}" s výsledkem ${formatChallengeScore(submittedScore, primaryMetric)} ${getMetricLabel(primaryMetric, unitLabel)}!`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback - copy to clipboard
      await navigator.clipboard.writeText(text);
      // Could show toast here
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            Výsledek odeslán!
          </DialogTitle>
          <DialogDescription>{challengeTitle}</DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Main Score */}
          <div className="space-y-1">
            <p className="text-4xl font-bold text-primary">
              {formatChallengeScore(submittedScore, primaryMetric)}
            </p>
            <p className="text-sm text-muted-foreground">
              {getMetricLabel(primaryMetric, unitLabel)}
            </p>
          </div>

          {/* Improvement indicator */}
          {improvement != null && improvement !== 0 && (
            <div className={cn(
              "flex items-center justify-center gap-2 text-lg font-medium",
              isImproved ? "text-success" : "text-muted-foreground"
            )}>
              {isImproved ? (
                <>
                  <TrendingUp className="h-5 w-5" />
                  <span>
                    {isLowerBetter ? '-' : '+'}
                    {formatChallengeScore(Math.abs(improvement), primaryMetric)}
                  </span>
                  <span className="text-sm">oproti minule</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5" />
                  <span className="text-sm">Minule bylo lepší</span>
                </>
              )}
            </div>
          )}

          {/* Percentile */}
          {percentile != null && (
            <div className="px-4 py-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">Top {Math.round(100 - percentile)}%</p>
              <p className="text-xs text-muted-foreground">
                Lepší než {Math.round(percentile)}% účastníků
              </p>
            </div>
          )}

          {/* Rank */}
          {rank != null && totalParticipants && (
            <div className="flex items-center justify-center gap-2">
              <Trophy className={cn(
                "h-5 w-5",
                rank === 1 ? "text-warning" : rank === 2 ? "text-muted-foreground" : rank === 3 ? "text-warning/70" : "text-muted-foreground"
              )} />
              <span className="text-lg">
                {rank}. místo z {totalParticipants}
              </span>
            </div>
          )}

          {/* Motivational message */}
          <p className="text-lg font-medium text-foreground">
            {getMotivationalMessage()}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Sdílet
          </Button>
          <Button className="flex-1" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
