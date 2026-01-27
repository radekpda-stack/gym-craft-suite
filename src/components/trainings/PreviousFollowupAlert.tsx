import { Bell, Check, ExternalLink, ArrowUp, Minus, ArrowDown, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnresolvedFollowups, useResolveFollowup, FollowupPriority } from '@/hooks/useTrainingFollowups';
import { format, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface PreviousFollowupAlertProps {
  clientId: string;
  currentTrainingId?: string;
  trainingDate?: string;
}

const followupTypes = {
  pain: { label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: null },
  technique: { label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: null },
  goal: { label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: null },
  general: { label: 'Obecné', color: 'bg-muted text-muted-foreground border-border', icon: null },
  measurement: { label: 'Měření', color: 'bg-primary/20 text-primary border-primary/30', icon: Scale },
};

const priorityConfig = {
  high: { label: 'Vysoká', icon: ArrowUp, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  medium: { label: 'Střední', icon: Minus, color: 'text-yellow-400', bgColor: 'bg-background/50' },
  low: { label: 'Nízká', icon: ArrowDown, color: 'text-muted-foreground', bgColor: 'bg-background/30' },
};

export function PreviousFollowupAlert({ clientId, currentTrainingId, trainingDate }: PreviousFollowupAlertProps) {
  const { data: unresolvedFollowups = [], isLoading } = useUnresolvedFollowups(clientId);
  const resolveFollowup = useResolveFollowup();

  // Filter followups - for measurement type, only show if remind_after_date <= today/trainingDate
  const today = trainingDate || new Date().toISOString().split('T')[0];
  const filteredFollowups = unresolvedFollowups.filter(followup => {
    if (followup.followup_type === 'measurement' && followup.remind_after_date) {
      return followup.remind_after_date <= today;
    }
    return true;
  });

  if (isLoading || filteredFollowups.length === 0) {
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

  const highPriorityCount = filteredFollowups.filter(f => f.priority === 'high').length;
  const measurementCount = filteredFollowups.filter(f => f.followup_type === 'measurement').length;

  return (
    <div className={`rounded-lg border p-4 ${
      highPriorityCount > 0 
        ? 'border-red-500/30 bg-red-500/10' 
        : measurementCount > 0
        ? 'border-primary/30 bg-primary/10'
        : 'border-orange-500/30 bg-orange-500/10'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className={`w-5 h-5 ${
          highPriorityCount > 0 
            ? 'text-red-400' 
            : measurementCount > 0
            ? 'text-primary'
            : 'text-orange-400'
        }`} />
        <h3 className={`font-semibold ${
          highPriorityCount > 0 
            ? 'text-red-400' 
            : measurementCount > 0
            ? 'text-primary'
            : 'text-orange-400'
        }`}>
          {measurementCount > 0 && highPriorityCount === 0 
            ? 'Připomínka měření' 
            : 'Připomenutí z minulých tréninků'}
        </h3>
        <Badge variant="outline" className={`ml-auto ${
          highPriorityCount > 0 
            ? 'border-red-500/30 text-red-400' 
            : measurementCount > 0
            ? 'border-primary/30 text-primary'
            : 'border-orange-500/30 text-orange-400'
        }`}>
          {filteredFollowups.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {filteredFollowups.map((followup) => {
          const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
          const prioConfig = priorityConfig[(followup.priority as FollowupPriority) || 'medium'];
          const PrioIcon = prioConfig.icon;
          const TypeIcon = typeConfig.icon;
          const trainingSessionDate = followup.training_session?.date
            ? format(new Date(followup.training_session.date), 'd.M.yyyy', { locale: cs })
            : null;
          
          // For measurement type, show days since remind_after_date or measurement creation
          const daysSince = followup.remind_after_date 
            ? differenceInDays(new Date(), new Date(followup.remind_after_date))
            : null;

          return (
            <div
              key={followup.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${prioConfig.bgColor}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {TypeIcon ? (
                    <TypeIcon className={`w-4 h-4 text-primary`} />
                  ) : (
                    <PrioIcon className={`w-4 h-4 ${prioConfig.color}`} />
                  )}
                  <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                    {typeConfig.label}
                  </Badge>
                  {trainingSessionDate && followup.followup_type !== 'measurement' && (
                    <span className="text-xs text-muted-foreground">
                      {trainingSessionDate}
                    </span>
                  )}
                  {followup.followup_type === 'measurement' && daysSince !== null && (
                    <span className="text-xs text-muted-foreground">
                      {daysSince === 0 ? 'dnes' : daysSince > 0 ? `před ${daysSince} dny` : `za ${Math.abs(daysSince)} dní`}
                    </span>
                  )}
                  {followup.exercise?.name && (
                    <span className="text-xs text-primary">
                      {followup.exercise.name}
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
