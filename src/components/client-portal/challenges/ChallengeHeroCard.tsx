import { Trophy, Clock, Send, Users, History, Medal, Award, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatChallengeScore, getMetricLabel, formatCountdown, getCountdownVariant } from '@/lib/challengeUtils';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { format, differenceInMilliseconds } from 'date-fns';
import { cs } from 'date-fns/locale';

interface LeaderboardEntry {
  rank: number;
  pseudonym: string;
  score: number;
  is_you: boolean;
}

interface ChallengeHeroCardProps {
  challenge: {
    id: string;
    title: string;
    description?: string | null;
    instructions?: string | null;
    end_at: string;
    start_at: string;
    primary_metric: string;
    scoring_type: string;
    unit_label?: string | null;
    vod_url?: string | null;
    is_team_challenge?: boolean;
  };
  clientBest: {
    score_primary: number;
    submitted_at?: string | null;
  } | null;
  submissionCount: number;
  leaderboard: LeaderboardEntry[] | null;
  participantCount: number;
  clientRank: number | null;
  onSubmit: () => void;
  showLeaderboard: boolean;
}

export function ChallengeHeroCard({
  challenge,
  clientBest,
  submissionCount,
  leaderboard,
  participantCount,
  clientRank,
  onSubmit,
  showLeaderboard,
}: ChallengeHeroCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const endDate = new Date(challenge.end_at);
  const startDate = new Date(challenge.start_at);
  const now = new Date();
  
  // Calculate progress (time elapsed)
  const totalDuration = differenceInMilliseconds(endDate, startDate);
  const elapsed = differenceInMilliseconds(now, startDate);
  const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
    return null;
  };

  const getRankBg = (rank: number, isYou: boolean) => {
    if (isYou) return "bg-primary/15 border border-primary/30";
    if (rank === 1) return "bg-amber-500/10";
    if (rank === 2) return "bg-gray-400/10";
    if (rank === 3) return "bg-amber-700/10";
    return "bg-muted/50";
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Section */}
      <div className="p-4 sm:p-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{challenge.title}</h2>
              {challenge.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {challenge.description}
                </p>
              )}
            </div>
          </div>
          <Badge 
            variant={getCountdownVariant(endDate)} 
            className="text-sm px-3 py-1.5 shrink-0 self-start"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {formatCountdown(endDate)}
          </Badge>
        </div>

        {/* Time Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Průběh výzvy</span>
            <span>{Math.round(progressPercent)}% uplynulo</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <CardContent className="p-4 sm:p-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Left Column - Your Result */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Tvůj výsledek
            </h3>
            
            {clientBest ? (
              <div className="space-y-3">
                <div>
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums">
                    {formatChallengeScore(clientBest.score_primary, challenge.primary_metric)}
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                      <span className="text-lg font-normal text-muted-foreground ml-2">
                        {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {submissionCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <History className="h-3 w-3 mr-1" />
                      {submissionCount} {submissionCount === 1 ? 'pokus' : submissionCount < 5 ? 'pokusy' : 'pokusů'}
                    </Badge>
                  )}
                  {clientRank && (
                    <Badge variant="secondary" className="text-xs">
                      {clientRank}. místo
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <Send className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Zatím nemáš žádný výsledek</p>
                <p className="text-sm text-muted-foreground/70">Odešli svůj první pokus!</p>
              </div>
            )}
          </div>

          {/* Right Column - Leaderboard TOP 3 */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top 3 Leaderboard
            </h3>
            
            {showLeaderboard && leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((entry) => (
                  <div 
                    key={entry.rank}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                      getRankBg(entry.rank, entry.is_you)
                    )}
                  >
                    <div className="w-7 flex justify-center shrink-0">
                      {getRankIcon(entry.rank) || (
                        <span className="text-muted-foreground font-medium">{entry.rank}.</span>
                      )}
                    </div>
                    <span className={cn(
                      "flex-1 truncate",
                      entry.is_you && "font-semibold text-primary"
                    )}>
                      {entry.is_you ? 'Ty' : entry.pseudonym}
                    </span>
                    <span className="font-mono font-medium text-sm tabular-nums">
                      {formatChallengeScore(entry.score, challenge.primary_metric)}
                    </span>
                  </div>
                ))}
                
                {participantCount > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    <Users className="h-3 w-3 inline mr-1" />
                    Celkem {participantCount} účastníků
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {!showLeaderboard 
                    ? 'Zapni anonymní srovnání v nastavení'
                    : 'Zatím nejsou žádné výsledky'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={onSubmit}
            size="lg"
            className="flex-1 h-12 text-base"
          >
            <Send className="h-5 w-5 mr-2" />
            Odeslat nový výsledek
          </Button>
          
          {(challenge.instructions || challenge.vod_url) && (
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="h-12"
                >
                  <ChevronDown className={cn(
                    "h-4 w-4 mr-2 transition-transform",
                    detailsOpen && "rotate-180"
                  )} />
                  Detail výzvy
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </div>

        {/* Collapsible Details */}
        {(challenge.instructions || challenge.vod_url) && (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleContent>
              <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-3">
                {challenge.instructions && (
                  <div>
                    <h4 className="font-medium mb-1">Instrukce</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {challenge.instructions}
                    </p>
                  </div>
                )}
                {challenge.vod_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={challenge.vod_url} target="_blank" rel="noopener noreferrer">
                      <Trophy className="h-4 w-4 mr-2" />
                      Video instrukce
                    </a>
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
