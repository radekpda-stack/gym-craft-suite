import { useState, useMemo } from 'react';
import { Trophy, Clock, Send, ChevronRight, Medal, Award, Users, History } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  useClientActiveChallenges, 
  useSubmitChallengeResult,
  useChallengeLeaderboard,
  useClientPrivacySettings 
} from '@/hooks/useClientPortalBenchmarks';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { useClientChallengeHistory } from '@/hooks/useClientChallengeHistory';
import { ChallengeHistory } from '@/components/client-portal/challenges/ChallengeHistory';
import { AchievementsBadges } from '@/components/client-portal/challenges/AchievementsBadges';
import { ChallengeSubmissionDialog } from '@/components/client-portal/challenges/ChallengeSubmissionDialog';
import { formatChallengeScore, getMetricLabel, formatCountdown, getCountdownVariant } from '@/lib/challengeUtils';
import { format, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ClientPortalChallenges() {
  useClientPortalPageTracking('client_portal_challenges');

  const { data, isLoading } = useClientActiveChallenges();
  const { data: privacySettings } = useClientPrivacySettings();
  const { data: historyData, isLoading: historyLoading } = useClientChallengeHistory();
  const submitResult = useSubmitChallengeResult();

  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const { data: leaderboard } = useChallengeLeaderboard(selectedChallenge);

  const challenges = data?.challenges || [];
  const clientSubmissions = data?.clientSubmissions || [];
  const participantCounts = data?.participantCounts || {};
  const displayMode = data?.display_mode || 'both';
  const minGroupSize = data?.min_group_size || 8;

  // Split into active and completed
  const { activeChallenges, completedChallenges } = useMemo(() => {
    const now = new Date();
    const active = challenges.filter(c => isAfter(new Date(c.end_at), now));
    const completed = challenges.filter(c => !isAfter(new Date(c.end_at), now));
    return { activeChallenges: active, completedChallenges: completed };
  }, [challenges]);

  const getClientSubmissions = (challengeId: string) => {
    return clientSubmissions.filter(s => s.challenge_id === challengeId);
  };

  const getClientBestSubmission = (challengeId: string) => {
    const subs = getClientSubmissions(challengeId);
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-amber-700" />;
    return null;
  };

  const handleSubmit = async (score: number, note?: string) => {
    if (!selectedChallenge) return;

    try {
      await submitResult.mutateAsync({
        challengeId: selectedChallenge,
        score_primary: score,
        note,
      });
      toast.success('Výsledek odeslán!');
      setSubmitDialogOpen(false);
    } catch (error) {
      toast.error('Nepodařilo se odeslat výsledek');
      throw error;
    }
  };

  const selectedChallengeData = challenges.find(c => c.id === selectedChallenge);

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

  const renderChallengeCard = (challenge: any, isActive: boolean = true) => {
    const end = new Date(challenge.end_at);
    const best = getClientBestSubmission(challenge.id);
    const participants = participantCounts[challenge.id] || 0;
    const submissions = getClientSubmissions(challenge.id);

    return (
      <Card 
        key={challenge.id} 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          selectedChallenge === challenge.id && "ring-2 ring-primary"
        )}
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
            {isActive ? (
              <Badge variant={getCountdownVariant(end)}>
                <Clock className="h-3 w-3 mr-1" />
                {formatCountdown(end)}
              </Badge>
            ) : (
              <Badge variant="outline">
                Ukončeno {format(end, 'd. M.', { locale: cs })}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {best ? (
                <div>
                  <span className="text-sm text-muted-foreground">Tvůj nejlepší:</span>
                  <p className="text-xl font-bold">
                    {formatChallengeScore(best.score_primary, challenge.primary_metric)}
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <span className="text-sm">Ještě jsi neodeslal(a) výsledek</span>
                </div>
              )}
              {submissions.length > 1 && (
                <Badge variant="outline" className="text-xs">
                  <History className="h-3 w-3 mr-1" />
                  {submissions.length} pokusů
                </Badge>
              )}
              {participants >= minGroupSize && privacySettings?.allow_challenges_participation && (
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {participants}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
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
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Výzvy
        </h1>
        <p className="text-muted-foreground">Zapoj se do aktuálních výzev</p>
      </div>

      {/* Tabs for Active/Completed */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Aktivní
            {activeChallenges.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeChallenges.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Ukončené
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {activeChallenges.length === 0 ? (
            <Card className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-2">Momentálně nejsou žádné aktivní výzvy</p>
              <p className="text-sm text-muted-foreground">Tvůj trenér brzy vyhlásí novou výzvu!</p>
            </Card>
          ) : (
            activeChallenges.map(challenge => renderChallengeCard(challenge, true))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-4">
          {completedChallenges.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-sm text-muted-foreground">Zatím nemáš žádné dokončené výzvy</p>
            </Card>
          ) : (
            completedChallenges.map(challenge => renderChallengeCard(challenge, false))
          )}
        </TabsContent>
      </Tabs>

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
                    <Trophy className="h-4 w-4 mr-2" />
                    Video instrukce
                  </a>
                </Button>
              </div>
            )}

            {/* My Attempts Section */}
            {getClientSubmissions(selectedChallengeData.id).length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="my-attempts" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Moje pokusy ({getClientSubmissions(selectedChallengeData.id).length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {getClientSubmissions(selectedChallengeData.id)
                        .sort((a, b) => new Date(b.submitted_at || '').getTime() - new Date(a.submitted_at || '').getTime())
                        .map((sub) => {
                          const best = getClientBestSubmission(selectedChallengeData.id);
                          const isBest = best?.id === sub.id;
                          return (
                            <div 
                              key={sub.id}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg",
                                isBest ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isBest && <Trophy className="h-4 w-4 text-amber-500" />}
                                <span className="font-medium">
                                  {formatChallengeScore(sub.score_primary, selectedChallengeData.primary_metric)}
                                </span>
                                {getMetricLabel(selectedChallengeData.primary_metric, selectedChallengeData.unit_label) && (
                                  <span className="text-sm text-muted-foreground">
                                    {getMetricLabel(selectedChallengeData.primary_metric, selectedChallengeData.unit_label)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {sub.submitted_at && format(new Date(sub.submitted_at), 'd. M. yyyy', { locale: cs })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg transition-all",
                        entry.is_you ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                      )}
                    >
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank) || (
                          <span className="text-muted-foreground text-sm">{entry.rank}.</span>
                        )}
                      </div>
                      <span className={cn("flex-1", entry.is_you && "font-semibold")}>
                        {entry.is_you ? 'Ty' : entry.pseudonym}
                      </span>
                      <span className="font-mono font-medium">
                        {formatChallengeScore(entry.score, selectedChallengeData.primary_metric)}
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

            {/* Participation count */}
            {(participantCounts[selectedChallengeData.id] || 0) > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <Users className="w-4 h-4" />
                <span>{participantCounts[selectedChallengeData.id]} účastníků</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History & Achievements */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChallengeHistory 
          completedChallenges={historyData?.completedChallenges || []}
          isLoading={historyLoading}
        />
        <AchievementsBadges
          achievements={historyData?.achievements || []}
          streakCount={historyData?.streakCount || 0}
          prCount={historyData?.prCount || 0}
          isLoading={historyLoading}
        />
      </div>

      {/* Submit Dialog */}
      <ChallengeSubmissionDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        challenge={selectedChallengeData || null}
        previousSubmissions={selectedChallengeData ? getClientSubmissions(selectedChallengeData.id) : []}
        onSubmit={handleSubmit}
        isPending={submitResult.isPending}
      />
    </div>
  );
}
