/**
 * ChallengeWinnerManager Component
 * 
 * Allows trainer to:
 * - Approve/reject submissions
 * - Mark winners (1st, 2nd, 3rd place)
 * - Award XP to winners
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  Check, 
  X, 
  Star,
  Loader2,
} from 'lucide-react';
import { Challenge, useChallengeSubmissions } from '@/hooks/useChallenges';
import { useManageSubmissions } from '@/hooks/useChallengeActions';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChallengeWinnerManagerProps {
  challenge: Challenge;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChallengeWinnerManager({ challenge, open, onOpenChange }: ChallengeWinnerManagerProps) {
  const { data: submissions, isLoading } = useChallengeSubmissions(challenge.id);
  const manageSubmissions = useManageSubmissions();

  const [selectedWinners, setSelectedWinners] = useState<Record<string, number>>({});
  const [xpValues, setXpValues] = useState<Record<number, number>>({ 1: 100, 2: 50, 3: 25 });

  // Sort and get best per client
  const sortedSubmissions = [...(submissions || [])].sort((a, b) => {
    if (challenge.scoring_type === 'time_lower_better') {
      return a.score_primary - b.score_primary;
    }
    return b.score_primary - a.score_primary;
  });

  const bestPerClient = new Map<string, typeof sortedSubmissions[0]>();
  for (const sub of sortedSubmissions) {
    const clientId = sub.client_id;
    const existing = bestPerClient.get(clientId);
    if (!existing) {
      bestPerClient.set(clientId, sub);
    } else {
      const isBetter = challenge.scoring_type === 'time_lower_better'
        ? sub.score_primary < existing.score_primary
        : sub.score_primary > existing.score_primary;
      if (isBetter) {
        bestPerClient.set(clientId, sub);
      }
    }
  }

  const rankedSubmissions = Array.from(bestPerClient.values()).sort((a, b) => {
    if (challenge.scoring_type === 'time_lower_better') {
      return a.score_primary - b.score_primary;
    }
    return b.score_primary - a.score_primary;
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-warning" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="h-5 w-5 text-warning/70" />;
    return <span className="text-muted-foreground font-medium">{rank}.</span>;
  };

  const toggleWinner = (submissionId: string, rank: number) => {
    setSelectedWinners(prev => {
      const current = prev[submissionId];
      if (current === rank) {
        const { [submissionId]: _, ...rest } = prev;
        return rest;
      }
      // Remove any other submission with the same rank
      const filtered = Object.fromEntries(
        Object.entries(prev).filter(([_, r]) => r !== rank)
      );
      return { ...filtered, [submissionId]: rank };
    });
  };

  const handleApprove = async (submissionId: string) => {
    try {
      await manageSubmissions.mutateAsync({
        action: 'approve',
        submissionIds: [submissionId],
      });
      toast.success('Výsledek schválen');
    } catch {
      toast.error('Nepodařilo se schválit');
    }
  };

  const handleReject = async (submissionId: string) => {
    try {
      await manageSubmissions.mutateAsync({
        action: 'reject',
        submissionIds: [submissionId],
      });
      toast.success('Výsledek zamítnut');
    } catch {
      toast.error('Nepodařilo se zamítnout');
    }
  };

  const handleAwardWinners = async () => {
    if (Object.keys(selectedWinners).length === 0) {
      toast.error('Vyberte alespoň jednoho vítěze');
      return;
    }

    try {
      const winners = Object.entries(selectedWinners).map(([submissionId, rank]) => ({
        submissionId,
        rank,
        xp: xpValues[rank] || 0,
      }));

      await manageSubmissions.mutateAsync({
        action: 'award_winners',
        winners,
        challengeId: challenge.id,
      });

      toast.success('Vítězové byli oceněni!');
      onOpenChange(false);
    } catch {
      toast.error('Nepodařilo se ocenit vítěze');
    }
  };

  const getWinnerRank = (submissionId: string) => selectedWinners[submissionId];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Správa výsledků: {challenge.title}
          </DialogTitle>
          <DialogDescription>
            Schvalte výsledky a vyberte vítěze výzvy
          </DialogDescription>
        </DialogHeader>

        {/* XP Settings */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Star className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium">XP za umístění:</span>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-warning" />
            <Input
              type="number"
              value={xpValues[1]}
              onChange={(e) => setXpValues(prev => ({ ...prev, 1: parseInt(e.target.value) || 0 }))}
              className="w-16 h-7 text-center"
            />
          </div>
          <div className="flex items-center gap-1">
            <Medal className="h-4 w-4 text-gray-400" />
            <Input
              type="number"
              value={xpValues[2]}
              onChange={(e) => setXpValues(prev => ({ ...prev, 2: parseInt(e.target.value) || 0 }))}
              className="w-16 h-7 text-center"
            />
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4 text-warning/70" />
            <Input
              type="number"
              value={xpValues[3]}
              onChange={(e) => setXpValues(prev => ({ ...prev, 3: parseInt(e.target.value) || 0 }))}
              className="w-16 h-7 text-center"
            />
          </div>
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : rankedSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Zatím žádné výsledky</p>
            </div>
          ) : (
            rankedSubmissions.map((sub, index) => {
              const winnerRank = getWinnerRank(sub.id);
              const isWinner = winnerRank !== undefined;
              
              return (
                <div
                  key={sub.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border transition-all",
                    isWinner && "bg-warning/10 border-warning/30",
                    sub.status === 'rejected' && "opacity-50",
                    index < 3 && !isWinner && "bg-muted/30"
                  )}
                >
                  {/* Auto Rank */}
                  <div className="w-8 flex justify-center shrink-0">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{(sub as any).clients?.name || 'Neznámý'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sub.submitted_at), 'd. MMM HH:mm', { locale: cs })}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">
                      {formatChallengeScore(sub.score_primary, challenge.primary_metric)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <Badge 
                    variant={sub.status === 'approved' ? 'default' : sub.status === 'rejected' ? 'destructive' : 'secondary'}
                    className="shrink-0"
                  >
                    {sub.status === 'approved' ? 'Schváleno' : sub.status === 'rejected' ? 'Zamítnuto' : 'Čeká'}
                  </Badge>

                  {/* Winner Selection */}
                  {challenge.ranking_mode === 'top3' ? (
                    <div className="flex gap-1 shrink-0">
                      {[1, 2, 3].map(rank => (
                        <Button
                          key={rank}
                          variant={winnerRank === rank ? 'default' : 'outline'}
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            winnerRank === rank && rank === 1 && "bg-warning hover:bg-warning/90",
                            winnerRank === rank && rank === 2 && "bg-muted-foreground hover:bg-muted-foreground/90",
                            winnerRank === rank && rank === 3 && "bg-warning/70 hover:bg-warning/60"
                          )}
                          onClick={() => toggleWinner(sub.id, rank)}
                          disabled={sub.status === 'rejected'}
                        >
                          {rank === 1 && <Trophy className="h-4 w-4" />}
                          {rank === 2 && <Medal className="h-4 w-4" />}
                          {rank === 3 && <Award className="h-4 w-4" />}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Button
                      variant={winnerRank === 1 ? 'default' : 'outline'}
                      size="icon"
                      className={cn("h-8 w-8", winnerRank === 1 && "bg-warning hover:bg-warning/90")}
                      onClick={() => toggleWinner(sub.id, 1)}
                      disabled={sub.status === 'rejected'}
                    >
                      <Trophy className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Approve/Reject */}
                  {sub.status === 'pending' && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success hover:text-success"
                        onClick={() => handleApprove(sub.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleReject(sub.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {Object.keys(selectedWinners).length} vítězů vybráno
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Zavřít
              </Button>
              <Button 
                onClick={handleAwardWinners}
                disabled={Object.keys(selectedWinners).length === 0 || manageSubmissions.isPending}
                className="gap-2"
              >
                {manageSubmissions.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                Ocenit vítěze
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
