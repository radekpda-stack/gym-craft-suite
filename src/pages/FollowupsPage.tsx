import { useState } from 'react';
import { Bell, ArrowUp, Minus, ArrowDown, ExternalLink, Check, Filter, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAllUnresolvedFollowups, useResolveFollowup, FollowupPriority } from '@/hooks/useTrainingFollowups';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const followupTypes = {
  pain: { label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  technique: { label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  goal: { label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  general: { label: 'Obecné', color: 'bg-muted text-muted-foreground border-border' },
};

const priorityConfig = {
  high: { label: 'Vysoká', icon: ArrowUp, color: 'text-red-400' },
  medium: { label: 'Střední', icon: Minus, color: 'text-yellow-400' },
  low: { label: 'Nízká', icon: ArrowDown, color: 'text-muted-foreground' },
};

type FilterPriority = 'all' | 'high' | 'medium' | 'low';
type FilterType = 'all' | 'pain' | 'technique' | 'goal' | 'general';

export default function FollowupsPage() {
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  const { data: followups = [], isLoading } = useAllUnresolvedFollowups();
  const resolveFollowup = useResolveFollowup();

  const filteredFollowups = followups.filter((f) => {
    if (priorityFilter !== 'all' && f.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && f.followup_type !== typeFilter) return false;
    return true;
  });

  // Group by client
  const groupedByClient = filteredFollowups.reduce((acc, followup) => {
    const clientId = followup.client_id;
    const clientName = followup.client?.name || 'Neznámý klient';
    if (!acc[clientId]) {
      acc[clientId] = { name: clientName, followups: [] };
    }
    acc[clientId].followups.push(followup);
    return acc;
  }, {} as Record<string, { name: string; followups: typeof followups }>);

  const handleResolve = async (followupId: string, clientId: string) => {
    try {
      await resolveFollowup.mutateAsync({ followupId, clientId });
      toast({ title: 'Připomenutí označeno jako vyřešené' });
    } catch (error) {
      toast({ title: 'Chyba při označování', variant: 'destructive' });
    }
  };

  const highPriorityCount = followups.filter(f => f.priority === 'high').length;

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className={`w-6 h-6 ${highPriorityCount > 0 ? 'text-red-400' : 'text-primary'}`} />
            Všechna připomenutí
          </h1>
          <p className="text-muted-foreground">
            {followups.length} nevyřešených připomenutí
            {highPriorityCount > 0 && (
              <span className="text-red-400 ml-2">({highPriorityCount} vysoká priorita)</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as FilterPriority)}>
          <SelectTrigger className="w-[140px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Priorita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny priority</SelectItem>
            <SelectItem value="high">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-red-400" /> Vysoká
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center gap-2">
                <Minus className="w-4 h-4 text-yellow-400" /> Střední
              </div>
            </SelectItem>
            <SelectItem value="low">
              <div className="flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-muted-foreground" /> Nízká
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {Object.entries(followupTypes).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : filteredFollowups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Žádná aktivní připomenutí</p>
            <p className="text-sm">Všechno je vyřešeno! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByClient).map(([clientId, { name, followups: clientFollowups }]) => (
            <Card key={clientId}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" />
                  <Link 
                    to={`/klienti/${clientId}`} 
                    className="hover:text-primary hover:underline"
                  >
                    {name}
                  </Link>
                  <Badge variant="secondary" className="ml-auto">
                    {clientFollowups.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {clientFollowups.map((followup) => {
                    const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
                    const prioConfig = priorityConfig[(followup.priority as FollowupPriority) || 'medium'];
                    const PrioIcon = prioConfig.icon;
                    const createdDate = format(new Date(followup.created_at), 'd.M.yyyy', { locale: cs });

                    return (
                      <div
                        key={followup.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          followup.priority === 'high'
                            ? 'bg-red-500/5 border border-red-500/20'
                            : 'bg-card/50 border border-border/50'
                        }`}
                      >
                        <PrioIcon className={`w-4 h-4 mt-0.5 shrink-0 ${prioConfig.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                              {typeConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{createdDate}</span>
                            {followup.training_session_id && (
                              <Link
                                to={`/treninky/${followup.training_session_id}`}
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                              >
                                Detail tréninku
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                            {followup.exercise?.name && (
                              <span className="text-xs text-primary">{followup.exercise.name}</span>
                            )}
                          </div>
                          <p className="text-sm">{followup.content}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(followup.id, followup.client_id)}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
