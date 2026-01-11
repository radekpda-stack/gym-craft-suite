import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, ChevronRight, Clock, Medal, Users, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { parseISO } from 'date-fns';
import { useClientActiveChallenges, useChallengeLeaderboard } from '@/hooks/useClientPortalBenchmarks';
import { formatCountdown, formatChallengeScore, formatChallengeScoreFull, getMetricLabel } from '@/lib/challengeUtils';
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

  // Get leaderboard for the active challenge
  const { data: leaderboardData } = useChallengeLeaderboard(challenge?.id || null);
  const leaderboard = leaderboardData?.leaderboard?.slice(0, 3) || [];

  // Don't render anything if no active challenges
  if (!isLoading && !challenge) {
    return null;
  }

  const endDate = challenge ? parseISO(challenge.end_at) : new Date();
  const countdownText = formatCountdown(endDate);
  const isUrgent = endDate.getTime() - Date.now() < 72 * 60 * 60 * 1000; // < 72h

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-3.5 w-3.5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-3.5 w-3.5 text-gray-400" />;
    if (rank === 3) return <Award className="h-3.5 w-3.5 text-amber-700" />;
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={className}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-purple-500" />
            </div>
            <Link to="/client/challenges">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Výzvy <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : challenge ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
                  Aktivní výzva
                </span>
                {isUrgent && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                    Končí brzy!
                  </span>
                )}
              </div>

              <p className="text-lg font-bold truncate mb-2">
                {challenge.title}
              </p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {countdownText}
                </div>
                {participantCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {participantCount} účastníků
                  </div>
                )}
              </div>

              {/* Leaderboard preview */}
              {leaderboard.length > 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Výsledky</p>
                  {leaderboard.map((entry: any) => (
                    <div 
                      key={entry.rank}
                      className={cn(
                        "flex items-center gap-2 text-xs py-1 px-2 rounded",
                        entry.is_you && "bg-primary/10 font-medium"
                      )}
                    >
                      <span className="w-5 flex justify-center">
                        {getRankIcon(entry.rank) || <span className="text-muted-foreground">{entry.rank}.</span>}
                      </span>
                      <span className="flex-1 truncate">
                        {entry.is_you ? 'Ty' : entry.pseudonym}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatChallengeScoreFull(entry.score, challenge.primary_metric)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {submission ? (
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tvůj nejlepší výsledek</p>
                  <p className="text-sm font-semibold">
                    {formatChallengeScore(submission.score_primary, challenge.primary_metric)}
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label) && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <Link to="/client/challenges">
                  <Button variant="secondary" size="sm" className="w-full">
                    Odeslat výsledek
                  </Button>
                </Link>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
