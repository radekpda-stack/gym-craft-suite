import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatChallengeScore, getMetricLabel } from '@/lib/challengeUtils';

interface CompletedChallenge {
  id: string;
  title: string;
  endDate: string;
  bestScore: number;
  rank?: number;
  metric: string;
  unitLabel?: string;
}

interface ChallengeHistoryProps {
  completedChallenges: CompletedChallenge[];
  isLoading?: boolean;
}

export function ChallengeHistory({ completedChallenges, isLoading }: ChallengeHistoryProps) {
  const getRankIcon = (rank?: number) => {
    if (!rank) return null;
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Dokončené výzvy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (completedChallenges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Dokončené výzvy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Zatím jsi nedokončil/a žádnou výzvu
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Zapoj se do aktuální výzvy!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Dokončené výzvy ({completedChallenges.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {completedChallenges.map((challenge) => (
            <div 
              key={challenge.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                challenge.rank && challenge.rank <= 3 
                  ? "bg-amber-500/10" 
                  : "bg-muted"
              )}>
                {getRankIcon(challenge.rank) || (
                  <Trophy className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{challenge.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(parseISO(challenge.endDate), 'MMMM yyyy', { locale: cs })}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold">
                  {formatChallengeScore(challenge.bestScore, challenge.metric)}
                  {getMetricLabel(challenge.metric, challenge.unitLabel) && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {getMetricLabel(challenge.metric, challenge.unitLabel)}
                    </span>
                  )}
                </p>
                {challenge.rank && (
                  <p className="text-xs text-muted-foreground">
                    {challenge.rank}. místo
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
