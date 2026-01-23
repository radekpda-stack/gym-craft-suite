import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Medal, Users, Award, Crown, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { parseISO } from 'date-fns';
import { useClientActiveChallenges, useChallengeLeaderboard } from '@/hooks/useClientPortalBenchmarks';
import { formatCountdown, formatChallengeScoreFull, getMetricLabel } from '@/lib/challengeUtils';
import { cn } from '@/lib/utils';

interface ActiveChallengeWidgetProps {
  className?: string;
}

export function ActiveChallengeWidget({ className }: ActiveChallengeWidgetProps) {
  const { data, isLoading } = useClientActiveChallenges();

  // Get first active challenge
  const challenge = data?.challenges?.[0];
  const submission = challenge 
    ? data?.clientSubmissions?.find(s => s.challenge_id === challenge.id)
    : null;
  const participantCount = challenge 
    ? (data?.participantCounts?.[challenge.id] ?? 0)
    : 0;

  // Get full leaderboard for the active challenge
  const { data: leaderboardData, isLoading: leaderboardLoading } = useChallengeLeaderboard(challenge?.id || null);
  const leaderboard = leaderboardData?.leaderboard || [];
  const myEntry = leaderboard.find((e: any) => e.is_you);
  const myRank = myEntry?.rank;

  // Don't render anything if no active challenges
  if (!isLoading && !challenge) {
    return null;
  }

  const endDate = challenge ? parseISO(challenge.end_at) : new Date();
  const countdownText = formatCountdown(endDate);
  const isUrgent = endDate.getTime() - Date.now() < 72 * 60 * 60 * 1000; // < 72h

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-warning" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="h-5 w-5 text-warning/70" />;
    return null;
  };

  const getRankBgClass = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-warning/20 to-warning/5';
    if (rank === 2) return 'bg-gradient-to-r from-muted/40 to-muted/10';
    if (rank === 3) return 'bg-gradient-to-r from-warning/15 to-warning/5';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={className}
    >
      <Card className="relative overflow-hidden border-primary/20">
        {/* Header section */}
        <CardHeader className="pb-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-[10px]">
                    Aktivní výzva
                  </Badge>
                  {isUrgent && (
                    <Badge variant="destructive" className="text-[10px]">
                      Končí brzy!
                    </Badge>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-6 w-40" />
                ) : (
                  <CardTitle className="text-lg truncate">
                    {challenge?.title}
                  </CardTitle>
                )}
              </div>
            </div>
          </div>

          {/* Stats bar - wrap on mobile */}
          {!isLoading && challenge && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span className={cn(isUrgent && "text-destructive font-medium")}>{countdownText}</span>
              </div>
              {participantCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>{participantCount}</span>
                </div>
              )}
              {myRank && (
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-primary font-medium">{myRank}.</span>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading || leaderboardLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : challenge ? (
            <div className="space-y-4">
              {/* Full Leaderboard */}
              {leaderboard.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5" />
                    Žebříček výsledků
                  </p>
                  <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                    {leaderboard.map((entry: any) => (
                      <motion.div
                        key={entry.rank}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: entry.rank * 0.03 }}
                        className={cn(
                          "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all",
                          entry.is_you && "bg-primary/10 border border-primary/20 ring-1 ring-primary/10",
                          !entry.is_you && getRankBgClass(entry.rank),
                          !entry.is_you && entry.rank > 3 && "hover:bg-muted/50"
                        )}
                      >
                        {/* Rank */}
                        <div className="w-8 flex items-center justify-center shrink-0">
                          {getRankIcon(entry.rank) || (
                            <span className={cn(
                              "text-sm font-medium",
                              entry.is_you ? "text-primary" : "text-muted-foreground"
                            )}>
                              {entry.rank}.
                            </span>
                          )}
                        </div>

                        {/* Avatar & Name */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            entry.rank === 1 ? "bg-warning/20 text-warning" :
                            entry.rank === 2 ? "bg-muted text-muted-foreground" :
                            entry.rank === 3 ? "bg-warning/15 text-warning/80" :
                            entry.is_you ? "bg-primary/20 text-primary" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {entry.pseudonym?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "font-medium truncate text-sm",
                                entry.is_you && "text-primary"
                              )}>
                                {entry.is_you ? 'Ty' : entry.pseudonym}
                              </span>
                              {entry.is_you && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                                  Tvůj výsledek
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "font-mono font-semibold tabular-nums text-sm",
                            entry.is_you && "text-primary"
                          )}>
                            {formatChallengeScoreFull(entry.score, challenge.primary_metric)}
                          </span>
                          {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Zatím žádné výsledky</p>
                  <p className="text-xs">Buď první, kdo odešle svůj výkon!</p>
                </div>
              )}

              {/* Submit button or My result summary */}
              <div className="pt-2 border-t">
                {submission ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tvůj nejlepší výsledek</p>
                      <p className="font-semibold">
                        {formatChallengeScoreFull(submission.score_primary, challenge.primary_metric)}
                        {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                          <span className="ml-1 font-normal text-muted-foreground text-sm">
                            {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                          </span>
                        )}
                      </p>
                    </div>
                    {challenge.allow_multiple_attempts && (
                      <Link to="/zona/challenges">
                        <Button variant="outline" size="sm">
                          Vylepšit výsledek
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link to="/zona/challenges" className="block">
                    <Button className="w-full gap-2" size="lg">
                      <Trophy className="w-4 h-4" />
                      Odeslat výsledek
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
