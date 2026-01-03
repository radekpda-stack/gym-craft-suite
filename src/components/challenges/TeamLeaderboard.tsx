import { useState } from 'react';
import { Trophy, Medal, Award, Users, ChevronDown, ChevronRight, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatChallengeScore } from '@/lib/challengeUtils';
import { cn } from '@/lib/utils';

interface TeamMember {
  client_id: string;
  pseudonym: string;
  role: 'captain' | 'member';
  best_score: number | null;
}

interface TeamEntry {
  rank: number;
  team_id: string;
  team_name: string;
  total_score: number;
  member_count: number;
  members: TeamMember[];
}

interface TeamLeaderboardProps {
  teams: TeamEntry[];
  primaryMetric: string;
  scoringMode: 'sum' | 'average' | 'best';
  unitLabel?: string | null;
}

export function TeamLeaderboard({
  teams,
  primaryMetric,
  scoringMode,
  unitLabel,
}: TeamLeaderboardProps) {
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
    return null;
  };

  const getScoringModeLabel = () => {
    switch (scoringMode) {
      case 'sum': return 'Součet';
      case 'average': return 'Průměr';
      case 'best': return 'Nejlepší';
      default: return '';
    }
  };

  const toggleExpanded = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Týmový žebříček
            </CardTitle>
            <CardDescription>
              Bodování: {getScoringModeLabel()}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {teams.length} týmů
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {teams.map((team) => {
          const isExpanded = expandedTeams.has(team.team_id);

          return (
            <Collapsible
              key={team.team_id}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(team.team_id)}
            >
              <div
                className={cn(
                  "rounded-lg border transition-all",
                  team.rank <= 3 && "border-amber-500/30"
                )}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-4 h-auto hover:bg-muted"
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Rank */}
                      <div className="w-8 flex justify-center shrink-0">
                        {getRankIcon(team.rank) || (
                          <span className="text-lg font-bold text-muted-foreground">
                            {team.rank}
                          </span>
                        )}
                      </div>

                      {/* Team info */}
                      <div className="flex-1 text-left">
                        <span className="font-semibold">{team.team_name}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {team.member_count} členů
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right mr-2">
                        <span className="text-lg font-bold font-mono">
                          {formatChallengeScore(team.total_score, primaryMetric)}
                        </span>
                        {unitLabel && (
                          <span className="text-sm text-muted-foreground ml-1">
                            {unitLabel}
                          </span>
                        )}
                      </div>

                      {/* Expand icon */}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 border-t">
                    <div className="space-y-2 pt-3">
                      {team.members.map((member) => (
                        <div
                          key={member.client_id}
                          className="flex items-center gap-3 p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium">{member.pseudonym}</span>
                            {member.role === 'captain' && (
                              <Crown className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <span className="font-mono text-sm">
                            {member.best_score != null
                              ? formatChallengeScore(member.best_score, primaryMetric)
                              : '-'
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
