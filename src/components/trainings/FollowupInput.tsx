import { useState } from 'react';
import { Bell, Plus, X, Edit2, Check, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  useCreateFollowup, 
  useTrainingSessionFollowups, 
  useDeleteFollowup,
  useUpdateFollowup,
  FOLLOWUP_TEMPLATES,
  FollowupType,
  FollowupPriority,
} from '@/hooks/useTrainingFollowups';
import { toast } from '@/hooks/use-toast';

interface FollowupInputProps {
  trainingSessionId?: string;
  clientId: string;
  showTemplates?: boolean;
}

const followupTypes = [
  { value: 'pain', label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'technique', label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'goal', label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'general', label: 'Obecné', color: 'bg-muted text-muted-foreground border-border' },
] as const;

const priorityConfig = {
  high: { label: 'Vysoká', icon: ArrowUp, color: 'text-red-400' },
  medium: { label: 'Střední', icon: Minus, color: 'text-yellow-400' },
  low: { label: 'Nízká', icon: ArrowDown, color: 'text-muted-foreground' },
};

export function FollowupInput({ trainingSessionId, clientId, showTemplates = true }: FollowupInputProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<FollowupType>('general');
  const [priority, setPriority] = useState<FollowupPriority>('medium');
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: sessionFollowups = [] } = useTrainingSessionFollowups(trainingSessionId);
  const createFollowup = useCreateFollowup();
  const deleteFollowup = useDeleteFollowup();
  const updateFollowup = useUpdateFollowup();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createFollowup.mutateAsync({
        training_session_id: trainingSessionId,
        client_id: clientId,
        content: content.trim(),
        followup_type: type,
        priority,
      });
      setContent('');
      setType('general');
      setPriority('medium');
      setIsExpanded(false);
      toast({ title: 'Připomenutí přidáno' });
    } catch (error) {
      toast({ title: 'Chyba při přidávání připomenutí', variant: 'destructive' });
    }
  };

  const handleDelete = async (followupId: string) => {
    try {
      await deleteFollowup.mutateAsync({ followupId, clientId });
      toast({ title: 'Připomenutí smazáno' });
    } catch (error) {
      toast({ title: 'Chyba při mazání', variant: 'destructive' });
    }
  };

  const handleEdit = (followup: typeof sessionFollowups[0]) => {
    setEditingId(followup.id);
    setEditContent(followup.content);
  };

  const handleSaveEdit = async (followupId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateFollowup.mutateAsync({
        followupId,
        clientId,
        content: editContent.trim(),
      });
      setEditingId(null);
      setEditContent('');
      toast({ title: 'Připomenutí upraveno' });
    } catch (error) {
      toast({ title: 'Chyba při úpravě', variant: 'destructive' });
    }
  };

  const handleTemplateSelect = (template: typeof FOLLOWUP_TEMPLATES[0]) => {
    setContent(template.content);
    setType(template.type);
    setIsExpanded(true);
  };

  const getTypeConfig = (typeValue: string) => {
    return followupTypes.find(t => t.value === typeValue) || followupTypes[3];
  };

  const PriorityIcon = priorityConfig[priority].icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Bell className="w-4 h-4" />
          Připomenout příště
        </div>
        <div className="flex items-center gap-2">
          {showTemplates && !isExpanded && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
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
          )}
          {!isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Přidat
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 p-3 bg-card/50 rounded-lg border border-border">
          <Textarea
            placeholder="Co si chcete připomenout na příštím tréninku?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={type} onValueChange={(v) => setType(v as FollowupType)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {followupTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as FollowupPriority)}>
              <SelectTrigger className="w-[120px]">
                <PriorityIcon className={`w-4 h-4 mr-1 ${priorityConfig[priority].color}`} />
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
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              Zrušit
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || createFollowup.isPending}
            >
              {createFollowup.isPending ? 'Ukládám...' : 'Přidat'}
            </Button>
          </div>
        </div>
      )}

      {sessionFollowups.length > 0 && (
        <div className="space-y-2">
          {sessionFollowups.map((followup) => {
            const typeConfig = getTypeConfig(followup.followup_type);
            const prioConfig = priorityConfig[followup.priority || 'medium'];
            const PrioIcon = prioConfig.icon;
            const isEditing = editingId === followup.id;

            return (
              <div
                key={followup.id}
                className={`flex items-start gap-2 p-2 rounded-lg border ${
                  followup.priority === 'high' 
                    ? 'bg-red-500/5 border-red-500/20' 
                    : 'bg-card/30 border-border/50'
                }`}
              >
                <PrioIcon className={`w-4 h-4 mt-0.5 shrink-0 ${prioConfig.color}`} />
                <Badge variant="outline" className={`shrink-0 ${typeConfig.color}`}>
                  {typeConfig.label}
                </Badge>
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleSaveEdit(followup.id)}
                      disabled={updateFollowup.isPending}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{followup.content}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit(followup)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(followup.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
