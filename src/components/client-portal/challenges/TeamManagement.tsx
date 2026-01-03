import { useState } from 'react';
import { Users, Crown, Copy, Check, LogOut, Trophy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatChallengeScore } from '@/lib/challengeUtils';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  client_id: string;
  pseudonym: string;
  role: 'captain' | 'member';
  best_score: number | null;
  joined_at: string;
}

interface TeamManagementProps {
  team: {
    id: string;
    team_name: string;
    invite_code: string;
    total_score: number;
    member_count: number;
    captain_client_id: string;
  };
  members: TeamMember[];
  currentClientId: string;
  minSize: number;
  maxSize: number;
  primaryMetric: string;
  scoringMode: 'sum' | 'average' | 'best';
  onLeaveTeam: () => Promise<void>;
  onRegenerateCode?: () => Promise<string>;
  teamRank?: number;
  nextTeamScore?: number;
}

export function TeamManagement({
  team,
  members,
  currentClientId,
  minSize,
  maxSize,
  primaryMetric,
  scoringMode,
  onLeaveTeam,
  onRegenerateCode,
  teamRank,
  nextTeamScore,
}: TeamManagementProps) {
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isCaptain = team.captain_client_id === currentClientId;
  const isTeamFull = members.length >= maxSize;
  const isTeamMinSize = members.length >= minSize;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    toast.success('Kód zkopírován!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await onLeaveTeam();
      toast.success('Opustil(a) jsi tým');
    } catch (error) {
      toast.error('Nepodařilo se opustit tým');
    } finally {
      setLeaving(false);
    }
  };

  const getScoringModeLabel = () => {
    switch (scoringMode) {
      case 'sum': return 'Součet skóre';
      case 'average': return 'Průměrné skóre';
      case 'best': return 'Nejlepší skóre členů';
      default: return 'Celkové skóre';
    }
  };

  // Calculate progress to next team
  const progressToNext = nextTeamScore && nextTeamScore > team.total_score
    ? ((team.total_score / nextTeamScore) * 100)
    : 100;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {team.team_name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {teamRank && (
                <Badge variant="secondary" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  {teamRank}. místo
                </Badge>
              )}
              <span>{members.length}/{maxSize} členů</span>
            </CardDescription>
          </div>
          {!isTeamFull && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Kód pozvánky</p>
                <p className="font-mono font-bold tracking-widest">{team.invite_code}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyInviteCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Score */}
        <div className="p-4 rounded-lg bg-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{getScoringModeLabel()}</span>
            <span className="text-2xl font-bold">
              {formatChallengeScore(team.total_score, primaryMetric)}
            </span>
          </div>
          {nextTeamScore && nextTeamScore > team.total_score && (
            <div className="space-y-1">
              <Progress value={progressToNext} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {formatChallengeScore(nextTeamScore - team.total_score, primaryMetric)} do dalšího týmu
              </p>
            </div>
          )}
        </div>

        {/* Team Status */}
        {!isTeamMinSize && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Tým potřebuje minimálně {minSize} členy pro účast v žebříčku
            </p>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Členové týmu</h4>
          <div className="space-y-2">
            {members.map((member) => {
              const isMe = member.client_id === currentClientId;
              return (
                <div
                  key={member.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg",
                    isMe ? "bg-primary/10" : "bg-muted/50"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {member.pseudonym.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", isMe && "text-primary")}>
                        {isMe ? 'Ty' : member.pseudonym}
                      </span>
                      {member.role === 'captain' && (
                        <Crown className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-sm">
                    {member.best_score != null
                      ? formatChallengeScore(member.best_score, primaryMetric)
                      : '-'
                    }
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Opustit tým
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Opustit tým?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isCaptain
                    ? 'Jsi kapitán týmu. Pokud odejdeš, tým bude rozpuštěn.'
                    : 'Opravdu chceš opustit tento tým? Tvoje příspěvky budou odebrány z týmového skóre.'
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleLeave} disabled={leaving}>
                  {leaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opouštím...
                    </>
                  ) : (
                    'Opustit tým'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
