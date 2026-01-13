import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Clock, 
  Target, 
  Users,
  Send,
  Loader2,
  Medal,
  MessageSquare,
  History,
  Download
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  useTrainerPeerChallengeDetail, 
  useAddTrainerComment,
  useExportPeerChallengeResults 
} from '@/hooks/useTrainerPeerChallenges';
import { cn } from '@/lib/utils';

interface PeerChallengeTrainerDetailModalProps {
  challengeId: string;
  open: boolean;
  onClose: () => void;
}

export function PeerChallengeTrainerDetailModal({
  challengeId,
  open,
  onClose,
}: PeerChallengeTrainerDetailModalProps) {
  const [comment, setComment] = useState('');

  const { data: challenge, isLoading } = useTrainerPeerChallengeDetail(challengeId);
  const addComment = useAddTrainerComment();
  const exportResults = useExportPeerChallengeResults();

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await addComment.mutateAsync({ challengeId, comment });
    setComment('');
  };

  const typeLabels: Record<string, string> = {
    duel: '1v1 Duel',
    private: 'Privátní',
    public: 'Veřejná',
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!challenge) {
    return null;
  }

  const isEnded = isPast(new Date(challenge.end_at));
  const participants = challenge.participants || [];
  const submissions = challenge.submissions || [];
  const activityLog = challenge.activity_log || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">
              {typeLabels[challenge.challenge_type]}
            </Badge>
            {challenge.status === 'completed' || isEnded ? (
              <Badge variant="secondary">Dokončeno</Badge>
            ) : (
              <Badge className="bg-green-500">Aktivní</Badge>
            )}
          </div>
          <DialogTitle className="text-xl">{challenge.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Vytvořil: <span className="font-medium">{(challenge.created_by_client as any)?.name || 'Neznámý'}</span>
          </p>
        </DialogHeader>

        <Tabs defaultValue="leaderboard" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">
              <Trophy className="h-4 w-4 mr-1" />
              Žebříček
            </TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="h-4 w-4 mr-1" />
              Účastníci
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="h-4 w-4 mr-1" />
              Historie
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
            <TabsContent value="leaderboard" className="mt-0 space-y-4">
              {/* Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{challenge.primary_metric}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{participants.length} účastníků</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {isEnded 
                      ? `Skončilo ${format(new Date(challenge.end_at), 'PPP', { locale: cs })}`
                      : `Končí ${formatDistanceToNow(new Date(challenge.end_at), { locale: cs, addSuffix: true })}`
                    }
                  </span>
                </div>
              </div>

              {/* Leaderboard - trainer sees real names */}
              {submissions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  Zatím žádné výsledky
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {submissions.map((sub: any, index: number) => (
                    <div 
                      key={sub.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="w-8 text-center">
                        {index === 0 ? (
                          <Medal className="h-5 w-5 text-yellow-500 mx-auto" />
                        ) : index === 1 ? (
                          <Medal className="h-5 w-5 text-gray-400 mx-auto" />
                        ) : index === 2 ? (
                          <Medal className="h-5 w-5 text-orange-400 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {(sub.clients as any)?.name || 'Neznámý'}
                        </span>
                        {sub.note && (
                          <p className="text-xs text-muted-foreground truncate">{sub.note}</p>
                        )}
                      </div>
                      <div className="font-bold text-lg">
                        {sub.score_primary}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => exportResults.mutate(challengeId)}
                disabled={exportResults.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportovat výsledky
              </Button>
            </TabsContent>

            <TabsContent value="participants" className="mt-0">
              <div className="border rounded-lg divide-y">
                {participants.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3">
                    <div>
                      <span className="font-medium">{(p.clients as any)?.name || 'Neznámý'}</span>
                      <p className="text-xs text-muted-foreground">
                        {p.role === 'creator' ? 'Tvůrce' : p.role === 'challenger' ? 'Vyzyvatel' : 'Účastník'}
                      </p>
                    </div>
                    <Badge variant={p.status === 'accepted' ? 'default' : 'secondary'}>
                      {p.status === 'accepted' ? 'Přijato' : p.status === 'pending' ? 'Čeká' : 'Odmítnuto'}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              {activityLog.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  Žádná aktivita
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLog.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd.MM. HH:mm', { locale: cs })}
                      </div>
                      <div className="text-sm">
                        {log.action === 'created' && 'Výzva vytvořena'}
                        {log.action === 'joined' && 'Připojil se účastník'}
                        {log.action === 'submitted' && 'Odeslán výsledek'}
                        {log.action === 'commented' && 'Přidán komentář trenéra'}
                        {log.action === 'added_participant' && 'Přidán účastník trenérem'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Trainer comment */}
        <div className="border-t pt-4 mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4" />
            Komentář trenéra
          </div>
          
          {challenge.trainer_comment && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm">
              {challenge.trainer_comment}
              <p className="text-xs text-muted-foreground mt-1">
                {challenge.trainer_comment_at && format(new Date(challenge.trainer_comment_at), 'PPP', { locale: cs })}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder="Přidat komentář..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="flex-1"
            />
            <Button 
              onClick={handleAddComment}
              disabled={!comment.trim() || addComment.isPending}
            >
              {addComment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
