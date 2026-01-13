import { PeerChallenge } from '@/hooks/usePeerChallenges';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Swords } from 'lucide-react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DuelCardProps {
  challenge: PeerChallenge;
  myScore: number | null;
  opponentScore: number | null;
  opponentName: string;
  onClick: () => void;
}

export function DuelCard({ 
  challenge, 
  myScore, 
  opponentScore, 
  opponentName,
  onClick 
}: DuelCardProps) {
  const isEnded = isPast(new Date(challenge.end_at));
  const timeRemaining = !isEnded 
    ? formatDistanceToNow(new Date(challenge.end_at), { locale: cs, addSuffix: true })
    : null;

  const iAmWinning = myScore !== null && opponentScore !== null 
    ? (challenge.scoring_type === 'time_lower_better' 
        ? myScore < opponentScore 
        : myScore > opponentScore)
    : null;

  const isTie = myScore === opponentScore && myScore !== null;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-orange-500" />
            <span className="font-medium text-sm">{challenge.title}</span>
          </div>
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            Duel
          </Badge>
        </div>

        {/* Duel visualization */}
        <div className="p-4">
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            {/* My side */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Ty</div>
              <div className={cn(
                "text-2xl font-bold",
                isTie ? "text-yellow-500" : iAmWinning === true ? "text-green-500" : iAmWinning === false ? "text-red-500" : ""
              )}>
                {myScore ?? '-'}
              </div>
            </div>

            {/* VS divider */}
            <div className="flex flex-col items-center px-2">
              <div className="text-xs font-bold text-muted-foreground">VS</div>
              {isTie && <div className="text-xs text-yellow-500 mt-1">Remíza</div>}
            </div>

            {/* Opponent side */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1 truncate max-w-20" title={opponentName}>
                {opponentName}
              </div>
              <div className={cn(
                "text-2xl font-bold",
                isTie ? "text-yellow-500" : iAmWinning === false ? "text-green-500" : iAmWinning === true ? "text-red-500" : ""
              )}>
                {opponentScore ?? '-'}
              </div>
            </div>
          </div>

          {/* Time remaining */}
          {timeRemaining && (
            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Zbývá {timeRemaining}</span>
            </div>
          )}

          {isEnded && (
            <div className="text-center mt-4">
              <Badge variant="secondary">
                {iAmWinning ? '🎉 Vyhrál jsi!' : iAmWinning === false ? 'Prohrál jsi' : 'Ukončeno'}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
