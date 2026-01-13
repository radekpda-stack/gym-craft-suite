/**
 * FeedbackAttentionInbox
 * 
 * Priority-sorted inbox for feedback items requiring trainer attention.
 * 
 * Priority order:
 * 1. Red flags (completed with red_flag_reasons)
 * 2. Waiting > 24h (sent_at + 24h < now)
 * 3. Expired (expires_at < now AND status = pending)
 * 4. To send (is_link_generated = true AND sent_at IS NULL)
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  AlertTriangle, 
  Clock, 
  Send, 
  XCircle, 
  ChevronRight,
  Copy,
  RefreshCw,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface AttentionItem {
  id: string;
  type: 'red_flag' | 'waiting_long' | 'expired' | 'to_send';
  priority: number;
  clientId: string;
  clientName: string;
  trainingId?: string;
  trainingDate?: string;
  feedbackRequestId: string;
  createdAt: string;
  sentAt: string | null;
  expiresAt: string;
  reason?: string;
  token?: string;
  // For red flags
  redFlagReasons?: string[];
  painArea?: string;
}

const PRIORITY_CONFIG = {
  red_flag: {
    priority: 1,
    icon: AlertTriangle,
    label: 'Red Flag',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
  },
  waiting_long: {
    priority: 2,
    icon: Clock,
    label: 'Čeká > 24h',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  expired: {
    priority: 3,
    icon: XCircle,
    label: 'Expirováno',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
  },
  to_send: {
    priority: 4,
    icon: Send,
    label: 'K odeslání',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
  },
};

// Red flag reason labels
const RED_FLAG_LABELS: Record<string, string> = {
  pain_during_high: 'Vysoká bolest',
  high_non_muscle_pain: 'Bolest kloubů/šlach',
  doms_high: 'Vysoký DOMS',
  readiness_low: 'Nízká připravenost',
  low_body_feel: 'Špatný pocit těla',
  low_energy: 'Nízká energie',
  extreme_soreness: 'Extrémní svalovka',
  session_load_spike: 'Skok zátěže',
  high_rpe_low_energy: 'Vysoké RPE + nízká energie',
  high_rpe_low_fit: 'Vysoké RPE + nízký fit',
  consecutive_low_energy: 'Opakovaná nízká energie',
  consecutive_low_readiness: 'Opakovaná nízká připravenost',
  recurring_pain: 'Opakovaná bolest',
};

interface FeedbackAttentionInboxProps {
  limit?: number;
  showHeader?: boolean;
  onItemClick?: (item: AttentionItem) => void;
}

export function FeedbackAttentionInbox({ 
  limit = 10, 
  showHeader = true,
  onItemClick,
}: FeedbackAttentionInboxProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: items, isLoading, refetch } = useQuery({
    queryKey: ['feedback-attention-inbox'],
    queryFn: async (): Promise<AttentionItem[]> => {
      const now = new Date();
      const result: AttentionItem[] = [];

      // 1. Get red flags (completed feedback with is_red_flag=true)
      const { data: redFlagFeedback } = await supabase
        .from('training_feedback')
        .select(`
          id,
          created_at,
          is_red_flag,
          pain_area,
          feedback_request_id,
          feedback_requests!inner (
            id,
            client_id,
            token,
            created_at,
            sent_at,
            expires_at,
            clients!inner (
              id,
              name
            )
          )
        `)
        .eq('is_red_flag', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (redFlagFeedback) {
        for (const fb of redFlagFeedback as any[]) {
          const req = fb.feedback_requests;
          if (!req) continue;
          
          result.push({
            id: fb.id,
            type: 'red_flag',
            priority: 1,
            clientId: req.client_id,
            clientName: req.clients?.name || 'Neznámý klient',
            trainingId: req.training_session_id,
            feedbackRequestId: req.id,
            createdAt: fb.created_at,
            sentAt: req.sent_at,
            expiresAt: req.expires_at,
            token: req.token,
            redFlagReasons: [],
            painArea: fb.pain_area,
          });
        }
      }

      // 2. Get pending requests
      const { data: pendingRequests } = await supabase
        .from('feedback_requests')
        .select(`
          id,
          client_id,
          token,
          status,
          is_link_generated,
          created_at,
          sent_at,
          expires_at,
          clients!inner (
            id,
            name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      if (pendingRequests) {
        for (const req of pendingRequests as any[]) {
          const expiresAt = new Date(req.expires_at);
          const isExpired = expiresAt < now;
          const sentAt = req.sent_at ? new Date(req.sent_at) : null;
          const isWaitingLong = sentAt && differenceInHours(now, sentAt) > 24;
          const isToSend = req.is_link_generated && !req.sent_at;

          // Skip if already in red flags
          if (result.some(r => r.feedbackRequestId === req.id)) continue;

          if (isExpired) {
            result.push({
              id: `expired-${req.id}`,
              type: 'expired',
              priority: 3,
              clientId: req.client_id,
              clientName: req.clients?.name || 'Neznámý klient',
              feedbackRequestId: req.id,
              createdAt: req.created_at,
              sentAt: req.sent_at,
              expiresAt: req.expires_at,
              token: req.token,
            });
          } else if (isWaitingLong) {
            result.push({
              id: `waiting-${req.id}`,
              type: 'waiting_long',
              priority: 2,
              clientId: req.client_id,
              clientName: req.clients?.name || 'Neznámý klient',
              feedbackRequestId: req.id,
              createdAt: req.created_at,
              sentAt: req.sent_at,
              expiresAt: req.expires_at,
              token: req.token,
              reason: `Čeká ${differenceInHours(now, sentAt!)} hodin`,
            });
          } else if (isToSend) {
            result.push({
              id: `tosend-${req.id}`,
              type: 'to_send',
              priority: 4,
              clientId: req.client_id,
              clientName: req.clients?.name || 'Neznámý klient',
              feedbackRequestId: req.id,
              createdAt: req.created_at,
              sentAt: null,
              expiresAt: req.expires_at,
              token: req.token,
            });
          }
        }
      }

      // Sort by priority, then by date
      result.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return result.slice(0, limit);
    },
    refetchInterval: 60000,
  });

  const handleCopyLink = async (item: AttentionItem) => {
    if (!item.token) return;
    
    const link = `${window.location.origin}/feedback/${item.token}`;
    await navigator.clipboard.writeText(link);
    
    toast({
      title: 'Odkaz zkopírován',
      description: 'Odkaz na feedback byl zkopírován do schránky.',
    });
  };

  const handleCopyMessage = async (item: AttentionItem) => {
    if (!item.token) return;
    
    const link = `${window.location.origin}/feedback/${item.token}`;
    const message = `Ahoj, mohl/a bys prosím vyplnit krátký feedback z tréninku? ${link}`;
    await navigator.clipboard.writeText(message);
    
    toast({
      title: 'Zpráva zkopírována',
      description: 'Připravená zpráva byla zkopírována do schránky.',
    });
  };

  const handleRegenerateLink = async (item: AttentionItem) => {
    setProcessingId(item.id);
    
    try {
      // Update expires_at to 48h from now
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 48);
      
      const { error } = await supabase
        .from('feedback_requests')
        .update({ 
          expires_at: newExpiresAt.toISOString(),
          status: 'pending',
        })
        .eq('id', item.feedbackRequestId);

      if (error) throw error;

      toast({
        title: 'Odkaz obnoven',
        description: 'Platnost odkazu byla prodloužena o 48 hodin.',
      });
      
      refetch();
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se obnovit odkaz.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkSent = async (item: AttentionItem) => {
    setProcessingId(item.id);
    
    try {
      const { error } = await supabase
        .from('feedback_requests')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', item.feedbackRequestId);

      if (error) throw error;

      toast({
        title: 'Označeno jako odesláno',
        description: 'Feedback request byl označen jako odeslaný.',
      });
      
      refetch();
    } catch (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodařilo se označit jako odesláno.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        {showHeader && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Potřebuje pozornost
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const hasItems = items && items.length > 0;

  return (
    <Card className="glass">
      {showHeader && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Potřebuje pozornost
              {hasItems && (
                <Badge variant="secondary" className="ml-1">
                  {items.length}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {!hasItems ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Vše v pořádku, žádné položky nevyžadují pozornost.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-border">
              {items.map((item) => {
                const config = PRIORITY_CONFIG[item.type];
                const Icon = config.icon;
                const isProcessing = processingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 hover:bg-secondary/30 transition-colors',
                      'border-l-2',
                      config.borderColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn('p-2 rounded-lg shrink-0', config.bgColor)}>
                          <Icon className={cn('w-4 h-4', config.color)} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link 
                              to={`/clients/${item.clientId}`}
                              className="font-medium hover:text-primary truncate"
                            >
                              {item.clientName}
                            </Link>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {config.label}
                            </Badge>
                          </div>
                          
                          {/* Red flag reasons */}
                          {item.type === 'red_flag' && item.redFlagReasons && item.redFlagReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.redFlagReasons.slice(0, 3).map((reason) => (
                                <Badge 
                                  key={reason} 
                                  variant="destructive" 
                                  className="text-xs"
                                >
                                  {RED_FLAG_LABELS[reason] || reason}
                                </Badge>
                              ))}
                              {item.painArea && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.painArea}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {/* Waiting reason */}
                          {item.reason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.reason}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(item.createdAt), { 
                              addSuffix: true, 
                              locale: cs 
                            })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.type === 'red_flag' && item.trainingId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/trainings/${item.trainingId}`}>
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Detail
                            </Link>
                          </Button>
                        )}
                        
                        {item.type === 'to_send' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyLink(item)}
                              disabled={isProcessing}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                await handleCopyMessage(item);
                                handleMarkSent(item);
                              }}
                              disabled={isProcessing}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Poslat
                            </Button>
                          </>
                        )}
                        
                        {item.type === 'waiting_long' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyMessage(item)}
                            disabled={isProcessing}
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            Připomenout
                          </Button>
                        )}
                        
                        {item.type === 'expired' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyMessage(item)}
                              disabled={isProcessing}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegenerateLink(item)}
                              disabled={isProcessing}
                            >
                              <RefreshCw className={cn(
                                'w-4 h-4 mr-1',
                                isProcessing && 'animate-spin'
                              )} />
                              Obnovit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}