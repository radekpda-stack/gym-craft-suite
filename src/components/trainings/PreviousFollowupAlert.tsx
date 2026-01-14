import { Bell, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnresolvedFollowups, useResolveFollowup } from '@/hooks/useTrainingFollowups';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface PreviousFollowupAlertProps {
  clientId: string;
  currentTrainingId?: string;
}

const followupTypes = {
  pain: { label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  technique: { label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  goal: { label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  general: { label: 'Obecné', color: 'bg-muted text-muted-foreground border-border' },
};

export function PreviousFollowupAlert({ clientId, currentTrainingId }: PreviousFollowupAlertProps) {
  const { data: unresolvedFollowups = [], isLoading } = useUnresolvedFollowups(clientId);
  const resolveFollowup = useResolveFollowup();

  if (isLoading || unresolvedFollowups.length === 0) {
    return null;
  }

  const handleResolve = async (followupId: string) => {
    try {
      await resolveFollowup.mutateAsync({
        followupId,
        clientId,
        resolvedInTrainingId: currentTrainingId,
      });
      toast({ title: 'Připomenutí označeno jako vyřešené' });
    } catch (error) {
      toast({ title: 'Chyba při označování', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold text-orange-400">
          Připomenutí z minulých tréninků
        </h3>
        <Badge variant="outline" className="ml-auto border-orange-500/30 text-orange-400">
          {unresolvedFollowups.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {unresolvedFollowups.map((followup) => {
          const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
          const trainingDate = followup.training_session?.date
            ? format(new Date(followup.training_session.date), 'd.M.yyyy', { locale: cs })
            : null;

          return (
            <div
              key={followup.id}
              className="flex items-start gap-3 p-3 bg-background/50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                    {typeConfig.label}
                  </Badge>
                  {trainingDate && (
                    <span className="text-xs text-muted-foreground">
                      {trainingDate}
                    </span>
                  )}
                  {followup.training_session_id && (
                    <Link
                      to={`/treninky/${followup.training_session_id}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
                <p className="text-sm">{followup.content}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolve(followup.id)}
                disabled={resolveFollowup.isPending}
                className="shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Check className="w-4 h-4 mr-1" />
                Vyřešeno
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
