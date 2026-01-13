import { Trophy, Medal, Award, Users, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatChallengeScore } from '@/lib/challengeUtils';
import { cn } from '@/lib/utils';

interface TeamEntry {
  rank: number;
  team_id: string;
  team_name: string;
  total_score: number;
  member_count: number;
  is_my_team: boolean;
  previous_rank?: number;
}

interface TeamLeaderboardClientProps {
  teams: TeamEntry[];
  primaryMetric: string;
  scoringMode: 'sum' | 'average' | 'best';
  myTeamId?: string;
}

export function TeamLeaderboardClient({
  teams,
  primaryMetric,
  scoringMode,
  myTeamId,
}: TeamLeaderboardClientProps) {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-warning" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="h-5 w-5 text-warning/70" />;
    return null;
  };

  const getRankChange = (team: TeamEntry) => {
    if (team.previous_rank === undefined) return null;
    const change = team.previous_rank - team.rank;
    if (change > 0) {
      return (
        <span className="flex items-center text-success text-xs">
          <ChevronUp className="h-3 w-3" />
          {change}
        </span>
      );
    }
    if (change < 0) {
      return (
        <span className="flex items-center text-destructive text-xs">
          <ChevronDown className="h-3 w-3" />
          {Math.abs(change)}
        </span>
      );
    }
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const myTeam = teams.find(t => t.is_my_team);
  const maxScore = teams.length > 0 ? teams[0].total_score : 0;

  if (teams.length === 0) {
    return (
      <Card className="text-center py-8">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Zatím nejsou žádné týmy</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          Týmový žebříček
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {teams.map((team) => {
          const isMyTeam = team.is_my_team;
          const scorePercent = maxScore > 0 ? (team.total_score / maxScore) * 100 : 0;

          return (
            <div
              key={team.team_id}
              className={cn(
                "relative overflow-hidden rounded-lg p-3 transition-all",
                isMyTeam
                  ? "bg-primary/10 border-2 border-primary/30"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              {/* Score bar background */}
              <div
                className={cn(
                  "absolute inset-0 opacity-20",
                  isMyTeam ? "bg-primary" : "bg-foreground"
                )}
                style={{ width: `${scorePercent}%` }}
              />

              <div className="relative flex items-center gap-3">
                {/* Rank */}
                <div className="w-8 flex justify-center shrink-0">
                  {getRankIcon(team.rank) || (
                    <span className="text-lg font-bold text-muted-foreground">
                      {team.rank}
                    </span>
                  )}
                </div>

                {/* Team info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold truncate",
                      isMyTeam && "text-primary"
                    )}>
                      {team.team_name}
                      {isMyTeam && ' (Tvůj tým)'}
                    </span>
                    {getRankChange(team)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {team.member_count} členů
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold font-mono">
                    {formatChallengeScore(team.total_score, primaryMetric)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* My team position if not in top */}
        {myTeam && myTeam.rank > 10 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Tvoje pozice</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-lg font-bold">{myTeam.rank}.</span>
              <div className="flex-1">
                <span className="font-semibold">{myTeam.team_name}</span>
              </div>
              <span className="font-mono font-bold">
                {formatChallengeScore(myTeam.total_score, primaryMetric)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
