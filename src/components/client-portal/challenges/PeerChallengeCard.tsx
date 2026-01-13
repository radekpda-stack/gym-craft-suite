import { PeerChallengeWithDetails } from '@/hooks/usePeerChallenges';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  Trophy,
  ChevronRight,
  Target
} from 'lucide-react';

type PeerChallenge = PeerChallengeWithDetails;
import { formatDistanceToNow, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';

interface PeerChallengeCardProps {
  challenge: PeerChallenge;
  onClick: () => void;
}

export function PeerChallengeCard({ challenge, onClick }: PeerChallengeCardProps) {
  const isEnded = isPast(new Date(challenge.end_at));
  const timeRemaining = !isEnded 
    ? formatDistanceToNow(new Date(challenge.end_at), { locale: cs, addSuffix: true })
    : 'Ukončeno';

  const typeLabels: Record<string, string> = {
    duel: '1v1 Duel',
    private: 'Privátní',
    public: 'Veřejná',
  };

  const typeColors: Record<string, string> = {
    duel: 'bg-orange-500/10 text-orange-500',
    private: 'bg-purple-500/10 text-purple-500',
    public: 'bg-green-500/10 text-green-500',
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="secondary" 
                className={typeColors[challenge.challenge_type]}
              >
                {typeLabels[challenge.challenge_type]}
              </Badge>
              {challenge.status === 'completed' && (
                <Badge variant="outline" className="bg-muted">
                  Dokončeno
                </Badge>
              )}
            </div>

            <h3 className="font-semibold truncate mb-1">{challenge.title}</h3>
            
            {challenge.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {challenge.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{challenge.participant_count} účastníků</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                <span>{challenge.primary_metric}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{timeRemaining}</span>
              </div>
            </div>

            {/* My position if available */}
            {challenge.my_submission && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>
                  Moje skóre: <strong>{challenge.my_submission.score_primary}</strong>
                  {challenge.my_rank && ` (${challenge.my_rank}. místo)`}
                </span>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" className="shrink-0">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
