import { useState, useMemo } from 'react';
import { Trophy, Medal, Award, History, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TimeInputSimple } from '@/components/ui/time-input-simple';
import { Input } from '@/components/ui/input';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Submission {
  id: string;
  score_primary: number;
  submitted_at: string | null;
  status: string;
}

interface Challenge {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  primary_metric: string;
  unit_label?: string | null;
  scoring_type: string;
  allow_multiple_attempts?: boolean | null;
}

interface ChallengeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  previousSubmissions: Submission[];
  onSubmit: (score: number, note?: string) => Promise<void>;
  isPending: boolean;
}

export function ChallengeSubmissionDialog({
  open,
  onOpenChange,
  challenge,
  previousSubmissions,
  onSubmit,
  isPending,
}: ChallengeSubmissionDialogProps) {
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [numericScore, setNumericScore] = useState('');
  const [note, setNote] = useState('');

  const isTimeMetric = challenge?.primary_metric === 'time_seconds' || 
                       challenge?.primary_metric === 'time_ms';

  // Get best submission
  const bestSubmission = useMemo(() => {
    if (!previousSubmissions.length || !challenge) return null;
    const sorted = [...previousSubmissions].sort((a, b) => {
      if (challenge.scoring_type === 'time_lower_better') {
        return a.score_primary - b.score_primary;
      }
      return b.score_primary - a.score_primary;
    });
    return sorted[0];
  }, [previousSubmissions, challenge]);

  const handleSubmit = async () => {
    if (!challenge) return;

    let score: number;
    if (isTimeMetric) {
      if (!timeMs) return;
      // Convert ms to seconds for storage
      score = timeMs / 1000;
    } else {
      score = parseFloat(numericScore);
      if (isNaN(score) || score <= 0) return;
    }

    await onSubmit(score, note || undefined);
    
    // Reset form
    setTimeMs(null);
    setNumericScore('');
    setNote('');
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
    return null;
  };

  const isValid = isTimeMetric ? (timeMs !== null && timeMs > 0) : (numericScore && parseFloat(numericScore) > 0);

  if (!challenge) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Odeslat výsledek
          </DialogTitle>
          <DialogDescription>
            {challenge.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Instructions */}
          {challenge.instructions && (
            <div className="p-3 rounded-lg bg-muted/50 border border-muted">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {challenge.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Best Score Display */}
          {bestSubmission && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Tvůj nejlepší výsledek</p>
              <p className="text-lg font-bold text-primary">
                {formatChallengeScore(bestSubmission.score_primary, challenge.primary_metric)}
                {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Score Input */}
          <div className="space-y-2">
            <Label>
              Výsledek
              {getMetricLabel(challenge.primary_metric, challenge.unit_label) && !isTimeMetric && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({getMetricLabel(challenge.primary_metric, challenge.unit_label)})
                </span>
              )}
            </Label>
            
            {isTimeMetric ? (
              <div className="flex justify-center py-2">
                <TimeInputSimple
                  value={timeMs}
                  onChange={setTimeMs}
                  showCentiseconds={true}
                />
              </div>
            ) : (
              <Input
                type="number"
                value={numericScore}
                onChange={(e) => setNumericScore(e.target.value)}
                placeholder="Zadej hodnotu"
                className="text-lg"
              />
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Poznámka (volitelné)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jak se ti dařilo? Jaké podmínky?"
              rows={2}
            />
          </div>

          {/* Previous Attempts */}
          {previousSubmissions.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="attempts" className="border-none">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <History className="h-4 w-4" />
                    Moje předchozí pokusy ({previousSubmissions.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {previousSubmissions
                      .sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime())
                      .slice(0, 5)
                      .map((sub, index) => {
                        const isBest = bestSubmission?.id === sub.id;
                        return (
                          <div 
                            key={sub.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-lg",
                              isBest ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isBest && <Trophy className="h-3 w-3 text-amber-500" />}
                              <span className="text-sm font-medium">
                                {formatChallengeScore(sub.score_primary, challenge.primary_metric)}
                                {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {sub.submitted_at && format(new Date(sub.submitted_at), 'd. M.', { locale: cs })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending ? 'Odesílám...' : 'Odeslat'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
