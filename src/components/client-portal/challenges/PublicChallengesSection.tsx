import { useState } from 'react';
import { usePublicPeerChallenges, useJoinPeerChallenge } from '@/hooks/usePeerChallenges';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Globe, 
  Users, 
  Clock,
  Zap,
  UserPlus,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PublicChallengesSection() {
  const { data: challenges = [], isLoading } = usePublicPeerChallenges();
  const joinChallenge = useJoinPeerChallenge();
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleJoin = async (challenge: typeof challenges[0]) => {
    setJoiningId(challenge.id);
    try {
      await joinChallenge.mutateAsync(challenge.invite_code);
      toast.success('Připojeno k výzvě!', {
        description: challenge.title,
      });
    } catch (error: any) {
      toast.error('Nepodařilo se připojit', {
        description: error.message,
      });
    } finally {
      setJoiningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
        <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Momentálně nejsou žádné veřejné výzvy</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Globe className="h-4 w-4 text-green-500" />
        Veřejné výzvy k připojení
      </h4>
      
      {challenges.map((challenge) => {
        const participantCount = (challenge.peer_challenge_participants as any)?.[0]?.count || 0;
        const isJoining = joiningId === challenge.id;

        return (
          <Card 
            key={challenge.id}
            className={cn(
              "border-dashed border-green-500/30 bg-green-500/5",
              "hover:border-green-500/50 transition-colors"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      <Globe className="h-3 w-3 mr-1" />
                      Veřejná
                    </Badge>
                    {challenge.xp_bet_enabled && (
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
                        <Zap className="h-3 w-3 mr-1" />
                        XP sázky
                      </Badge>
                    )}
                  </div>
                  <h5 className="font-medium mb-1">{challenge.title}</h5>
                  {challenge.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {challenge.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {participantCount} účastníků
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Končí {formatDistanceToNow(new Date(challenge.end_at), { locale: cs, addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoin(challenge);
                  }}
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Připojit se
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
