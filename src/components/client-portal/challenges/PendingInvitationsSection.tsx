import { PeerChallengeInvitation } from '@/hooks/usePeerChallenges';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Target, Users, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

interface PendingInvitationsSectionProps {
  invitations: PeerChallengeInvitation[];
  onAccept: (participantId: string) => void;
  onDecline: (participantId: string) => void;
  isLoading?: boolean;
}

export function PendingInvitationsSection({
  invitations,
  onAccept,
  onDecline,
  isLoading,
}: PendingInvitationsSectionProps) {
  if (invitations.length === 0) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    duel: '1v1 Duel',
    private: 'Privátní',
    public: 'Veřejná',
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
        Čekající pozvánky ({invitations.length})
      </h4>

      <div className="space-y-2">
        {invitations.map((inv) => (
          <Card key={inv.participant_id} className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {typeLabels[inv.challenge_type]}
                    </Badge>
                  </div>

                  <p className="font-medium mb-1">
                    <span className="text-primary">{inv.invited_by_name}</span>
                    <span className="text-muted-foreground"> tě vyzývá:</span>
                  </p>
                  
                  <p className="font-semibold truncate">{inv.challenge_title}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>{inv.primary_metric}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Končí {formatDistanceToNow(new Date(inv.end_at), { 
                          locale: cs, 
                          addSuffix: true 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{inv.participant_count} účastníků</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDecline(inv.participant_id)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Odmítnout
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onAccept(inv.participant_id)}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Přijmout
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
