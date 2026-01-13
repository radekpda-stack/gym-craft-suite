import { useState } from 'react';
import { useCompletedPeerChallenges } from '@/hooks/usePeerChallenges';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  Trophy, 
  Swords, 
  Users, 
  Globe, 
  Lock,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PeerChallengeDetailModal } from './PeerChallengeDetailModal';

export function CompletedPeerChallengesSection() {
  const { data: challenges = [], isLoading } = useCompletedPeerChallenges();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Zatím žádné dokončené výzvy</p>
        <p className="text-sm mt-1">Tvé dokončené peer výzvy se zobrazí zde</p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'duel': return <Swords className="h-4 w-4 text-orange-500" />;
      case 'private': return <Lock className="h-4 w-4 text-purple-500" />;
      case 'public': return <Globe className="h-4 w-4 text-green-500" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getRankBadge = (rank: number | null) => {
    if (!rank) return null;
    
    if (rank === 1) {
      return (
        <Badge className="bg-yellow-500 text-yellow-950">
          <Trophy className="h-3 w-3 mr-1" />
          1. místo
        </Badge>
      );
    }
    if (rank === 2) {
      return <Badge variant="secondary" className="bg-gray-300 text-gray-800">2. místo</Badge>;
    }
    if (rank === 3) {
      return <Badge variant="secondary" className="bg-orange-300 text-orange-800">3. místo</Badge>;
    }
    return <Badge variant="outline">{rank}. místo</Badge>;
  };

  return (
    <>
      <div className="space-y-3">
        {challenges.map((challenge) => (
          <Card 
            key={challenge.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedChallengeId(challenge.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getTypeIcon(challenge.challenge_type)}
                    <span className="font-medium truncate">{challenge.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getRankBadge(challenge.my_rank)}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(challenge.end_at), 'd. MMMM yyyy', { locale: cs })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {challenge.participant_count} účastníků
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {challenge.xp_result !== null && challenge.xp_result !== undefined && (
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      challenge.xp_result > 0 ? "text-green-600" : challenge.xp_result < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {challenge.xp_result > 0 ? (
                        <>
                          <TrendingUp className="h-4 w-4" />
                          +{challenge.xp_result}
                        </>
                      ) : challenge.xp_result < 0 ? (
                        <>
                          <TrendingDown className="h-4 w-4" />
                          {challenge.xp_result}
                        </>
                      ) : (
                        '0'
                      )}
                      <span className="text-xs">XP</span>
                    </div>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedChallengeId && (
        <PeerChallengeDetailModal
          challengeId={selectedChallengeId}
          open={!!selectedChallengeId}
          onClose={() => setSelectedChallengeId(null)}
        />
      )}
    </>
  );
}
