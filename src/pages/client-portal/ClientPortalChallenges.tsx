import { useState } from 'react';
import { Trophy, Clock, Play, Send, ChevronRight, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  useClientActiveChallenges, 
  useSubmitChallengeResult,
  useChallengeLeaderboard,
  useClientPrivacySettings 
} from '@/hooks/useClientPortalBenchmarks';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { format, isAfter, isBefore, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';

export default function ClientPortalChallenges() {
  useClientPortalPageTracking('client_portal_challenges');

  const { data, isLoading } = useClientActiveChallenges();
  const { data: privacySettings } = useClientPrivacySettings();
  const submitResult = useSubmitChallengeResult();

  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitScore, setSubmitScore] = useState('');
  const [submitNote, setSubmitNote] = useState('');

  const { data: leaderboard } = useChallengeLeaderboard(selectedChallenge);

  const challenges = data?.challenges || [];
  const clientSubmissions = data?.clientSubmissions || [];
  const participantCounts = data?.participantCounts || {};
  const displayMode = data?.display_mode || 'both';
  const minGroupSize = data?.min_group_size || 8;

  const getClientBestSubmission = (challengeId: string) => {
    const subs = clientSubmissions.filter(s => s.challenge_id === challengeId);
    if (subs.length === 0) return null;
    
    const challenge = challenges.find(c => c.id === challengeId);
    const sorted = [...subs].sort((a, b) => {
      if (challenge?.scoring_type === 'time_lower_better') {
        return a.score_primary - b.score_primary;
      }
      return b.score_primary - a.score_primary;
    });
    return sorted[0];
  };

  const formatScore = (score: number, metric: string) => {
    if (metric === 'time_seconds') {
      const mins = Math.floor(score / 60);
      const secs = Math.round(score % 60);
      return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    }
    return score.toLocaleString('cs-CZ');
  };

  const getMetricLabel = (metric: string, unitLabel?: string | null) => {
    if (unitLabel) return unitLabel;
    const labels: Record<string, string> = {
      time_seconds: 's',
      reps: 'opakování',
      rounds: 'kol',
      weight_kg: 'kg',
      distance_m: 'm',
      calories: 'kcal',
    };
    return labels[metric] || '';
  };

  const handleSubmit = async () => {
    if (!selectedChallenge || !submitScore) return;

    const score = parseFloat(submitScore);
    if (isNaN(score) || score <= 0) {
      toast.error('Zadejte platnou hodnotu');
      return;
    }

    try {
      await submitResult.mutateAsync({
        challengeId: selectedChallenge,
        score_primary: score,
        note: submitNote || undefined,
      });
      toast.success('Výsledek odeslán!');
      setSubmitDialogOpen(false);
      setSubmitScore('');
      setSubmitNote('');
    } catch (error) {
      toast.error('Nepodařilo se odeslat výsledek');
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Výzvy</h1>
          <p className="text-muted-foreground">Zapoj se do aktuálních výzev</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Výzvy</h1>
          <p className="text-muted-foreground">Zapoj se do aktuálních výzev</p>
        </div>
        <Card className="text-center py-12">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Momentálně nejsou žádné aktivní výzvy</p>
          <p className="text-sm text-muted-foreground mt-2">Tvůj trenér brzy vyhlásí novou výzvu!</p>
        </Card>
      </div>
    );
  }

  const selectedChallengeData = challenges.find(c => c.id === selectedChallenge);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Výzvy
        </h1>
        <p className="text-muted-foreground">Zapoj se do aktuálních výzev</p>
      </div>

      <div className="space-y-4">
        {challenges.map((challenge) => {
          const now = new Date();
          const end = new Date(challenge.end_at);
          const daysLeft = differenceInDays(end, now);
          const best = getClientBestSubmission(challenge.id);
          const participants = participantCounts[challenge.id] || 0;

          return (
            <Card 
              key={challenge.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedChallenge === challenge.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedChallenge(challenge.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {challenge.description}
                    </CardDescription>
                  </div>
                  <Badge variant={daysLeft <= 3 ? 'destructive' : 'secondary'}>
                    <Clock className="h-3 w-3 mr-1" />
                    {daysLeft > 0 ? `${daysLeft} dní` : 'Dnes končí'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {best ? (
                      <div>
                        <span className="text-sm text-muted-foreground">Tvůj nejlepší:</span>
                        <p className="text-xl font-bold">
                          {formatScore(best.score_primary, challenge.primary_metric)}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <span className="text-sm">Ještě jsi neodeslal(a) výsledek</span>
                      </div>
                    )}
                    {participants >= minGroupSize && privacySettings?.allow_challenges_participation && (
                      <Badge variant="outline">
                        {participants} účastníků
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedChallenge(challenge.id);
                        setSubmitDialogOpen(true);
                      }}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Odeslat výsledek
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Challenge Detail / Leaderboard */}
      {selectedChallengeData && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedChallengeData.title}</CardTitle>
            {selectedChallengeData.instructions && (
              <CardDescription className="whitespace-pre-wrap">
                {selectedChallengeData.instructions}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedChallengeData.vod_url && (
              <div>
                <Button variant="outline" asChild>
                  <a href={selectedChallengeData.vod_url} target="_blank" rel="noopener noreferrer">
                    <Play className="h-4 w-4 mr-2" />
                    Video instrukce
                  </a>
                </Button>
              </div>
            )}

            {/* Leaderboard */}
            {privacySettings?.allow_challenges_participation && 
             (participantCounts[selectedChallengeData.id] || 0) >= minGroupSize &&
             (displayMode === 'leaderboard_only' || displayMode === 'both') &&
             leaderboard?.leaderboard && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Leaderboard (anonymní)
                </h3>
                <div className="space-y-2">
                  {leaderboard.leaderboard.slice(0, 10).map((entry: any) => (
                    <div 
                      key={entry.rank}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        entry.is_you ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                      }`}
                    >
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank) || (
                          <span className="text-muted-foreground text-sm">{entry.rank}.</span>
                        )}
                      </div>
                      <span className={`flex-1 ${entry.is_you ? 'font-semibold' : ''}`}>
                        {entry.is_you ? 'Ty' : entry.pseudonym}
                      </span>
                      <span className="font-mono font-medium">
                        {formatScore(entry.score, selectedChallengeData.primary_metric)}
                      </span>
                    </div>
                  ))}
                </div>
                {leaderboard.client_percentile != null && displayMode !== 'leaderboard_only' && (
                  <div className="mt-4 p-3 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Tvoje pozice</p>
                    <p className="text-2xl font-bold">Top {Math.round(100 - leaderboard.client_percentile)}%</p>
                    <Progress value={100 - leaderboard.client_percentile} className="mt-2" />
                  </div>
                )}
              </div>
            )}

            {!privacySettings?.allow_challenges_participation && (
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-sm text-muted-foreground">
                  Pro zobrazení srovnání s ostatními zapni anonymní srovnání v nastavení.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odeslat výsledek</DialogTitle>
            <DialogDescription>
              {selectedChallengeData?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="score">
                Výsledek ({getMetricLabel(selectedChallengeData?.primary_metric || 'reps', selectedChallengeData?.unit_label)})
              </Label>
              <Input
                id="score"
                type="number"
                value={submitScore}
                onChange={(e) => setSubmitScore(e.target.value)}
                placeholder={selectedChallengeData?.primary_metric === 'time_seconds' ? 'Čas v sekundách' : 'Hodnota'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Poznámka (volitelné)</Label>
              <Textarea
                id="note"
                value={submitNote}
                onChange={(e) => setSubmitNote(e.target.value)}
                placeholder="Jak se ti dařilo?"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSubmit} disabled={!submitScore || submitResult.isPending}>
              {submitResult.isPending ? 'Odesílám...' : 'Odeslat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
