import { useState } from 'react';
import { Bell, ArrowUp, Minus, ArrowDown, ExternalLink, Check, Filter, User, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

interface FollowupsSectionProps {
  defaultExpanded?: boolean;
  showFilters?: boolean;
}

export function FollowupsSection({ defaultExpanded = true, showFilters = true }: FollowupsSectionProps) {
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5" />
            Připomenutí
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (followups.length === 0) {
    return null; // Don't show section if no followups
  }

  return (
    <Card className={highPriorityCount > 0 ? 'border-red-500/30' : ''}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className={`w-5 h-5 ${highPriorityCount > 0 ? 'text-red-400' : ''}`} />
                Připomenutí
                <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'}>
                  {followups.length}
                </Badge>
                {highPriorityCount > 0 && (
                  <span className="text-xs text-red-400">({highPriorityCount} vysoká)</span>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as FilterPriority)}>
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="Priorita" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny</SelectItem>
                    <SelectItem value="high">Vysoká</SelectItem>
                    <SelectItem value="medium">Střední</SelectItem>
                    <SelectItem value="low">Nízká</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FilterType)}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Všechny</SelectItem>
                    {Object.entries(followupTypes).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Content */}
            {filteredFollowups.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground text-sm">
                Žádná připomenutí pro vybrané filtry
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedByClient).map(([clientId, { name, followups: clientFollowups }]) => (
                  <div key={clientId} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <Link 
                        to={`/clients/${clientId}`} 
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {name}
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {clientFollowups.length}
                      </Badge>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {clientFollowups.map((followup) => {
                        const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
                        const prioConfig = priorityConfig[(followup.priority as FollowupPriority) || 'medium'];
                        const PrioIcon = prioConfig.icon;
                        const createdDate = format(new Date(followup.created_at), 'd.M.yyyy', { locale: cs });

                        return (
                          <div
                            key={followup.id}
                            className={`flex items-start gap-2 p-2 rounded-lg ${
                              followup.priority === 'high'
                                ? 'bg-red-500/5 border border-red-500/20'
                                : 'bg-card/50 border border-border/50'
                            }`}
                          >
                            <PrioIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${prioConfig.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeConfig.color}`}>
                                  {typeConfig.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">{createdDate}</span>
                                {followup.training_session_id && (
                                  <Link
                                    to={`/trainings/${followup.training_session_id}`}
                                    className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                                  >
                                    Trénink
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </Link>
                                )}
                              </div>
                              <p className="text-xs line-clamp-2">{followup.content}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolve(followup.id, followup.client_id)}
                              disabled={resolveFollowup.isPending}
                              className="shrink-0 h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
