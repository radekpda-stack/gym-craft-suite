import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Clock, 
  Target, 
  Users,
  Send,
  Loader2,
  Medal,
  Zap,
  Copy,
  Check
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { usePeerChallenge, useSubmitPeerChallengeResult, usePeerChallengeLeaderboard } from '@/hooks/usePeerChallenges';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { cn } from '@/lib/utils';
import { XPBetSelector } from './XPBetSelector';
import { toast } from 'sonner';

interface PeerChallengeDetailModalProps {
  challengeId: string;
  open: boolean;
  onClose: () => void;
}

export function PeerChallengeDetailModal({
  challengeId,
  open,
  onClose,
}: PeerChallengeDetailModalProps) {
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const { clientId } = useClientPortal();
  const { data: challenge, isLoading } = usePeerChallenge(challengeId);
  const { data: leaderboard = [] } = usePeerChallengeLeaderboard(challengeId);
  const submitResult = useSubmitPeerChallengeResult();

  const isEnded = challenge ? isPast(new Date(challenge.end_at)) : false;
  
  // Find my participation status
  const myParticipation = challenge?.peer_challenge_participants?.find(
    (p: any) => p.client_id === clientId
  );
  const participantCount = challenge?.peer_challenge_participants?.length || 0;
  const myXPBet = myParticipation?.xp_bet || 0;
  const xpBettingEnabled = (challenge as any)?.xp_bet_enabled ?? true; // Default to enabled
  const xpBetMin = (challenge as any)?.xp_bet_min || 10;
  const xpBetMax = (challenge as any)?.xp_bet_max || 500;

  // Calculate total XP pool
  const totalXPPool = challenge?.peer_challenge_participants?.reduce(
    (sum: number, p: any) => sum + (p.xp_bet || 0), 0
  ) || 0;

  // Check if user is the creator
  const isCreator = myParticipation?.role === 'creator';
  const inviteCode = challenge?.invite_code;

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    toast.success('Kód zkopírován');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async () => {
    if (!score || !challengeId) return;

    await submitResult.mutateAsync({
      challengeId,
      score: parseFloat(score),
      note: note || undefined,
    });

    setScore('');
    setNote('');
  };

  const typeLabels: Record<string, string> = {
    duel: '1v1 Duel',
    private: 'Privátní',
    public: 'Veřejná',
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!challenge) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">
              {typeLabels[challenge.challenge_type]}
            </Badge>
            {challenge.status === 'completed' && (
              <Badge variant="secondary">Dokončeno</Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{challenge.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Info */}
            {challenge.description && (
              <p className="text-muted-foreground">{challenge.description}</p>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>{challenge.primary_metric}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{participantCount} účastníků</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {isEnded 
                    ? `Skončilo ${format(new Date(challenge.end_at), 'PPP', { locale: cs })}`
                    : `Končí ${formatDistanceToNow(new Date(challenge.end_at), { locale: cs, addSuffix: true })}`
                  }
                </span>
              </div>
            </div>

            {/* XP Pool info */}
            {totalXPPool > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium">XP v sázce</span>
                </div>
                <div className="text-lg font-bold text-yellow-600">
                  {totalXPPool.toLocaleString()} XP
                </div>
              </div>
            )}

            {/* Invite Code Section - only for creator */}
            {isCreator && inviteCode && challenge.challenge_type !== 'duel' && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Kód pro pozvání</div>
                  <div className="font-mono text-lg font-bold tracking-widest">
                    {inviteCode}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copiedCode ? 'Zkopírováno' : 'Kopírovat'}
                </Button>
              </div>
            )}

            {/* XP Betting Section */}
            {!isEnded && myParticipation?.status === 'accepted' && xpBettingEnabled && (
              <>
                <Separator />
                <XPBetSelector
                  challengeId={challengeId}
                  currentBet={myXPBet}
                  minBet={xpBetMin}
                  maxBet={xpBetMax}
                />
              </>
            )}

            {/* Leaderboard */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Žebříček
              </h3>
              
              {leaderboard.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  Zatím žádné výsledky
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {leaderboard.map((entry, index) => {
                    // Find participant's bet
                    const participantBet = challenge?.peer_challenge_participants?.find(
                      (p: any) => p.client_id === entry.client_id
                    )?.xp_bet || 0;
                    
                    return (
                      <div 
                        key={entry.client_id}
                        className={cn(
                          "flex items-center gap-3 p-3",
                          entry.is_me && "bg-primary/5"
                        )}
                      >
                        <div className="w-8 text-center">
                          {index === 0 ? (
                            <Medal className="h-5 w-5 text-yellow-500 mx-auto" />
                          ) : index === 1 ? (
                            <Medal className="h-5 w-5 text-gray-400 mx-auto" />
                          ) : index === 2 ? (
                            <Medal className="h-5 w-5 text-orange-400 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground font-medium">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={cn("font-medium", entry.is_me && "text-primary")}>
                            {entry.display_name}
                            {entry.is_me && ' (ty)'}
                          </span>
                          {participantBet > 0 && (
                            <span className="ml-2 text-xs text-yellow-600">
                              🎲 {participantBet} XP
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-lg">
                          {entry.best_score}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit form */}
            {!isEnded && myParticipation?.status === 'accepted' && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-semibold mb-3">Odeslat výsledek</h3>
                <div className="space-y-3">
                  <div>
                    <Input
                      type="number"
                      placeholder="Tvoje skóre"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Poznámka (volitelné)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!score || submitResult.isPending}
                    className="w-full"
                  >
                    {submitResult.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Odeslat výsledek
                  </Button>
                </div>
              </div>
            )}

            {/* Trainer comment */}
            {challenge.trainer_comment && (
              <div className="border rounded-lg p-4 bg-blue-500/5 border-blue-500/20">
                <div className="text-xs text-muted-foreground mb-1">
                  Komentář trenéra
                </div>
                <p className="text-sm">{challenge.trainer_comment}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
