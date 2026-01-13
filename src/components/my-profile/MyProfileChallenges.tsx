import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface MyProfileChallengesProps {
  clientId: string;
}

export function MyProfileChallenges({ clientId }: MyProfileChallengesProps) {
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['my-challenges', clientId],
    queryFn: async () => {
      // Get challenges the client participated in
      const { data: participations, error: partError } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('client_id', clientId);

      if (partError) throw partError;

      if (!participations?.length) return [];

      const challengeIds = participations.map(p => p.challenge_id);

      // Get challenge details
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .in('id', challengeIds)
        .order('end_at', { ascending: false });

      if (challengeError) throw challengeError;

      // Get submissions for this client
      const { data: submissions, error: subError } = await supabase
        .from('challenge_submissions')
        .select('*')
        .eq('client_id', clientId)
        .in('challenge_id', challengeIds);

      if (subError) throw subError;

      // Combine data
      return challengeData?.map(challenge => ({
        ...challenge,
        submission: submissions?.find(s => s.challenge_id === challenge.id),
      })) || [];
    },
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!challenges?.length) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Zatím jste se nezúčastnili žádné výzvy.</p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const activeChallennges = challenges.filter(c => new Date(c.end_at) > now);
  const pastChallenges = challenges.filter(c => new Date(c.end_at) <= now);

  return (
    <div className="space-y-6">
      {activeChallennges.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Aktivní výzvy
          </h3>
          {activeChallennges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} isActive />
          ))}
        </div>
      )}

      {pastChallenges.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Dokončené výzvy
          </h3>
          {pastChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} isActive={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChallengeCard({ challenge, isActive }: { challenge: any; isActive: boolean }) {
  const hasWon = challenge.submission?.is_winner;

  return (
    <Card className={isActive ? 'border-primary/30' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{challenge.title}</CardTitle>
          <div className="flex gap-2">
            {hasWon && (
              <Badge className="bg-warning/20 text-warning border-warning/30">
                <Trophy className="w-3 h-3 mr-1" />
                Výherce
              </Badge>
            )}
            {isActive ? (
              <Badge variant="outline" className="border-success/30 text-success">
                Probíhá
              </Badge>
            ) : (
              <Badge variant="secondary">Ukončeno</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Do: {format(new Date(challenge.end_at), 'd. MMMM yyyy', { locale: cs })}</span>
          {challenge.submission && (
            <span>Váš výsledek: {challenge.submission.result_display || challenge.submission.score_primary}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
