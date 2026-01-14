import { useState } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateFollowup, useTrainingSessionFollowups, useDeleteFollowup } from '@/hooks/useTrainingFollowups';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface FollowupInputProps {
  trainingSessionId: string;
  clientId: string;
}

const followupTypes = [
  { value: 'pain', label: 'Bolest', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'technique', label: 'Technika', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'goal', label: 'Cíl', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'general', label: 'Obecné', color: 'bg-muted text-muted-foreground border-border' },
] as const;

export function FollowupInput({ trainingSessionId, clientId }: FollowupInputProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'pain' | 'technique' | 'goal' | 'general'>('general');
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: sessionFollowups = [] } = useTrainingSessionFollowups(trainingSessionId);
  const createFollowup = useCreateFollowup();
  const deleteFollowup = useDeleteFollowup();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await createFollowup.mutateAsync({
        training_session_id: trainingSessionId,
        client_id: clientId,
        content: content.trim(),
        followup_type: type,
      });
      setContent('');
      setType('general');
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

  const getTypeConfig = (typeValue: string) => {
    return followupTypes.find(t => t.value === typeValue) || followupTypes[3];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Bell className="w-4 h-4" />
          Připomenout příště
        </div>
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

      {isExpanded && (
        <div className="space-y-3 p-3 bg-card/50 rounded-lg border border-border">
          <Textarea
            placeholder="Co si chcete připomenout na příštím tréninku?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center gap-2">
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-[140px]">
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
            return (
              <div
                key={followup.id}
                className="flex items-start gap-2 p-2 bg-card/30 rounded-lg border border-border/50"
              >
                <Badge variant="outline" className={`shrink-0 ${typeConfig.color}`}>
                  {typeConfig.label}
                </Badge>
                <span className="flex-1 text-sm">{followup.content}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(followup.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
