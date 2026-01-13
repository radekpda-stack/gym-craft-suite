/**
 * ChallengeStatsCard Component
 * 
 * Shows statistics for a challenge:
 * - Participant count
 * - Submission count
 * - Average score
 * - Score distribution
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Send, 
  TrendingUp, 
  Clock,
  Trophy,
  Target,
} from 'lucide-react';
import { Challenge, useChallengeSubmissions } from '@/hooks/useChallenges';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';
import { differenceInDays, isAfter, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChallengeStatsCardProps {
  challenge: Challenge;
  className?: string;
}

export function ChallengeStatsCard({ challenge, className }: ChallengeStatsCardProps) {
  const { data: submissions = [] } = useChallengeSubmissions(challenge.id);

  const stats = useMemo(() => {
    if (!submissions.length) {
      return {
        participantCount: 0,
        submissionCount: 0,
        avgScore: 0,
        bestScore: 0,
        worstScore: 0,
        approvedCount: 0,
        pendingCount: 0,
      };
    }

    const uniqueClients = new Set(submissions.map(s => s.client_id));
    const scores = submissions.map(s => s.score_primary);
    const approvedSubs = submissions.filter(s => s.status === 'approved');
    const pendingSubs = submissions.filter(s => s.status === 'pending');

    return {
      participantCount: uniqueClients.size,
      submissionCount: submissions.length,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      bestScore: challenge.scoring_type === 'time_lower_better' 
        ? Math.min(...scores) 
        : Math.max(...scores),
      worstScore: challenge.scoring_type === 'time_lower_better' 
        ? Math.max(...scores) 
        : Math.min(...scores),
      approvedCount: approvedSubs.length,
      pendingCount: pendingSubs.length,
    };
  }, [submissions, challenge.scoring_type]);

  const now = new Date();
  const start = new Date(challenge.start_at);
  const end = new Date(challenge.end_at);
  const isActive = isAfter(now, start) && isBefore(now, end);
  const daysLeft = differenceInDays(end, now);
  const totalDays = differenceInDays(end, start);
  const progress = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Statistiky výzvy
          </span>
          {isActive ? (
            <Badge className="bg-success">
              <Clock className="h-3 w-3 mr-1" />
              {daysLeft}d zbývá
            </Badge>
          ) : isBefore(now, start) ? (
            <Badge variant="outline">Plánováno</Badge>
          ) : (
            <Badge variant="secondary">Ukončeno</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        {isActive && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Průběh výzvy</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Účastníků</span>
            </div>
            <p className="text-2xl font-bold">{stats.participantCount}</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Send className="h-4 w-4" />
              <span className="text-xs">Pokusů</span>
            </div>
            <p className="text-2xl font-bold">{stats.submissionCount}</p>
          </div>

          {stats.submissionCount > 0 && (
            <>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Trophy className="h-4 w-4 text-warning" />
                  <span className="text-xs">Nejlepší</span>
                </div>
                <p className="text-lg font-bold">
                  {formatChallengeScore(stats.bestScore, challenge.primary_metric)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                  </span>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs">Průměr</span>
                </div>
                <p className="text-lg font-bold">
                  {formatChallengeScore(stats.avgScore, challenge.primary_metric)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {getMetricLabel(challenge.primary_metric, challenge.unit_label)}
                  </span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Status counts */}
        {stats.submissionCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary">{stats.approvedCount} schváleno</Badge>
            {stats.pendingCount > 0 && (
              <Badge variant="outline" className="text-warning border-warning">
                {stats.pendingCount} čeká
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
