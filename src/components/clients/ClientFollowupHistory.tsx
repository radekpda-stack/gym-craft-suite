import { useState } from 'react';
import { Bell, Check, ExternalLink, Filter, ArrowUp, Minus, ArrowDown, Edit2, X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  useTrainingFollowups, 
  useResolveFollowup, 
  useUpdateFollowup,
  useCreateFollowup,
  FOLLOWUP_TEMPLATES,
  FollowupType,
  FollowupPriority,
} from '@/hooks/useTrainingFollowups';
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

const priorityConfig = {
  high: { label: 'Vysoká', icon: ArrowUp, color: 'text-red-400' },
  medium: { label: 'Střední', icon: Minus, color: 'text-yellow-400' },
  low: { label: 'Nízká', icon: ArrowDown, color: 'text-muted-foreground' },
};

type FilterType = 'all' | 'unresolved' | 'resolved';

export function ClientFollowupHistory({ clientId }: ClientFollowupHistoryProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<FollowupType>('general');
  const [newPriority, setNewPriority] = useState<FollowupPriority>('medium');

  const { data: followups = [], isLoading } = useTrainingFollowups(clientId);
  const resolveFollowup = useResolveFollowup();
  const updateFollowup = useUpdateFollowup();
  const createFollowup = useCreateFollowup();

  const filteredFollowups = followups.filter((f) => {
    if (filter === 'unresolved') return !f.is_resolved;
    if (filter === 'resolved') return f.is_resolved;
    return true;
  });

  const unresolvedCount = followups.filter((f) => !f.is_resolved).length;
  const highPriorityCount = followups.filter((f) => !f.is_resolved && f.priority === 'high').length;

  const handleResolve = async (followupId: string) => {
    try {
      await resolveFollowup.mutateAsync({ followupId, clientId });
      toast({ title: 'Připomenutí označeno jako vyřešené' });
    } catch (error) {
      toast({ title: 'Chyba při označování', variant: 'destructive' });
    }
  };

  const handleEdit = (followup: typeof followups[0]) => {
    setEditingId(followup.id);
    setEditContent(followup.content);
  };

  const handleSaveEdit = async (followupId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateFollowup.mutateAsync({ followupId, clientId, content: editContent.trim() });
      setEditingId(null);
      setEditContent('');
      toast({ title: 'Připomenutí upraveno' });
    } catch (error) {
      toast({ title: 'Chyba při úpravě', variant: 'destructive' });
    }
  };

  const handleAddNew = async () => {
    if (!newContent.trim()) return;
    try {
      await createFollowup.mutateAsync({
        client_id: clientId,
        content: newContent.trim(),
        followup_type: newType,
        priority: newPriority,
      });
      setNewContent('');
      setNewType('general');
      setNewPriority('medium');
      setIsAddingNew(false);
      toast({ title: 'Připomenutí přidáno' });
    } catch (error) {
      toast({ title: 'Chyba při přidávání', variant: 'destructive' });
    }
  };

  const handleTemplateSelect = (template: typeof FOLLOWUP_TEMPLATES[0]) => {
    setNewContent(template.content);
    setNewType(template.type);
    setIsAddingNew(true);
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Historie připomenutí
            {unresolvedCount > 0 && (
              <Badge variant={highPriorityCount > 0 ? 'destructive' : 'secondary'} className="ml-2">
                {unresolvedCount} aktivní
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Šablony
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {FOLLOWUP_TEMPLATES.map((template, i) => (
                  <DropdownMenuItem key={i} onClick={() => handleTemplateSelect(template)}>
                    {template.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setIsAddingNew(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Přidat
            </Button>
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-[130px]">
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
        </div>
      </CardHeader>
      <CardContent>
        {/* Add new form */}
        {isAddingNew && (
          <div className="mb-4 p-3 bg-card/50 rounded-lg border border-primary/30">
            <Textarea
              placeholder="Co si chcete připomenout?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[60px] resize-none mb-2"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select value={newType} onValueChange={(v) => setNewType(v as FollowupType)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(followupTypes).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as FollowupPriority)}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`w-4 h-4 ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)}>
                Zrušit
              </Button>
              <Button size="sm" onClick={handleAddNew} disabled={!newContent.trim() || createFollowup.isPending}>
                {createFollowup.isPending ? 'Ukládám...' : 'Přidat'}
              </Button>
            </div>
          </div>
        )}

        {filteredFollowups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Žádná připomenutí</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFollowups.map((followup) => {
              const typeConfig = followupTypes[followup.followup_type] || followupTypes.general;
              const prioConfig = priorityConfig[(followup.priority as FollowupPriority) || 'medium'];
              const PrioIcon = prioConfig.icon;
              const createdDate = format(new Date(followup.created_at), 'd.M.yyyy', { locale: cs });
              const resolvedDate = followup.resolved_at
                ? format(new Date(followup.resolved_at), 'd.M.yyyy', { locale: cs })
                : null;
              const isEditing = editingId === followup.id;

              return (
                <div
                  key={followup.id}
                  className={`p-3 rounded-lg border ${
                    followup.is_resolved
                      ? 'bg-card/30 border-border/50'
                      : followup.priority === 'high'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-orange-500/5 border-orange-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <PrioIcon className={`w-4 h-4 mt-1 shrink-0 ${prioConfig.color}`} />
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
                        {followup.is_resolved && (
                          <Badge variant="outline" className="text-xs border-green-500/30 text-green-400">
                            <Check className="w-3 h-3 mr-1" />
                            Vyřešeno {resolvedDate}
                          </Badge>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(followup.id)} disabled={updateFollowup.isPending}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className={`text-sm ${followup.is_resolved ? 'text-muted-foreground' : ''}`}>
                          {followup.content}
                        </p>
                      )}
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
                    {!followup.is_resolved && !isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEdit(followup)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(followup.id)}
                          disabled={resolveFollowup.isPending}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
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
