import { useState } from 'react';
import { Bell, Check, ExternalLink, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrainingFollowups, useResolveFollowup } from '@/hooks/useTrainingFollowups';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientFollowupHistoryProps {
  clientId: string;
}

const followupTypes = {
  pain: { label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  technique: { label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  goal: { label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  general: { label: 'Obecné', color: 'bg-muted text-muted-foreground border-border' },
};

type FilterType = 'all' | 'unresolved' | 'resolved';

export function ClientFollowupHistory({ clientId }: ClientFollowupHistoryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const { data: followups = [], isLoading } = useTrainingFollowups(clientId);
  const resolveFollowup = useResolveFollowup();

  const filteredFollowups = followups.filter((f) => {
    if (filter === 'unresolved') return !f.is_resolved;
    if (filter === 'resolved') return f.is_resolved;
    return true;
  });

  const unresolvedCount = followups.filter((f) => !f.is_resolved).length;

  const handleResolve = async (followupId: string) => {
    try {
      await resolveFollowup.mutateAsync({
        followupId,
        clientId,
      });
      toast({ title: 'Připomenutí označeno jako vyřešené' });
    } catch (error) {
      toast({ title: 'Chyba při označování', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Historie připomenutí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Historie připomenutí
            {unresolvedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedCount} aktivní
              </Badge>
            )}
          </CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny</SelectItem>
              <SelectItem value="unresolved">Nevyřešené</SelectItem>
              <SelectItem value="resolved">Vyřešené</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFollowups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Žádná připomenutí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFollowups.map((followup) => {
              const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
              const createdDate = format(new Date(followup.created_at), 'd.M.yyyy', { locale: cs });
              const resolvedDate = followup.resolved_at
                ? format(new Date(followup.resolved_at), 'd.M.yyyy', { locale: cs })
                : null;

              return (
                <div
                  key={followup.id}
                  className={`p-3 rounded-lg border ${
                    followup.is_resolved
                      ? 'bg-card/30 border-border/50'
                      : 'bg-orange-500/5 border-orange-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                          {typeConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {createdDate}
                        </span>
                        {followup.training_session_id && (
                          <Link
                            to={`/treninky/${followup.training_session_id}`}
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Detail tréninku
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {followup.is_resolved && (
                          <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                            <Check className="w-3 h-3 mr-1" />
                            Vyřešeno {resolvedDate}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${followup.is_resolved ? 'text-muted-foreground' : ''}`}>
                        {followup.content}
                      </p>
                      {followup.resolved_in_training_id && (
                        <Link
                          to={`/treninky/${followup.resolved_in_training_id}`}
                          className="text-xs text-muted-foreground hover:text-primary mt-1 inline-flex items-center gap-1"
                        >
                          Vyřešeno v tréninku
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    {!followup.is_resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(followup.id)}
                        disabled={resolveFollowup.isPending}
                        className="shrink-0 border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
