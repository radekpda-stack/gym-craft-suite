import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInHours, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, Copy, Check, Clock, Share2, User, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { FeedbackSummaryCard } from './FeedbackSummaryCard';
import { InviteStatusBadge } from './InviteStatusBadge';
import { ShareConfirmSheet } from './ShareConfirmSheet';
import { useQuery } from '@tanstack/react-query';
import type { TrainingFeedback } from '@/hooks/useTrainingFeedback';

interface Participant {
  client_id: string;
  name: string;
  email?: string | null;
  feedback_enabled?: boolean;
}

interface ParticipantFeedbackRequest {
  id: string;
  token: string;
  status: string;
  expires_at: string;
  sent_at: string | null;
  opened_at: string | null;
  reminder_count: number;
  client_id: string;
}

interface MultiParticipantFeedbackSectionProps {
  trainingId: string;
  trainingDate: string;
  trainingStatus: string;
  participants: Participant[];
  feedbackEnabled?: boolean;
}

// Hook to fetch feedback requests for all participants
function useParticipantFeedbackRequests(trainingId: string, participantIds: string[]) {
  return useQuery({
    queryKey: ['participant-feedback-requests', trainingId, participantIds],
    queryFn: async () => {
      if (participantIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('feedback_requests')
        .select('id, token, status, expires_at, sent_at, opened_at, reminder_count, client_id')
        .eq('training_session_id', trainingId)
        .in('client_id', participantIds)
        .neq('status', 'cancelled');
      
      if (error) throw error;
      return data as ParticipantFeedbackRequest[];
    },
    enabled: participantIds.length > 0,
  });
}

// Hook to fetch feedback for all participants
function useParticipantFeedback(trainingId: string) {
  return useQuery({
    queryKey: ['participant-training-feedback', trainingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('training_session_id', trainingId);
      
      if (error) throw error;
      return data as TrainingFeedback[];
    },
  });
}

interface ParticipantFeedbackRowProps {
  participant: Participant;
  trainingId: string;
  trainingDate: string;
  feedbackRequest?: ParticipantFeedbackRequest;
  feedback?: TrainingFeedback;
  isGenerating: boolean;
  onGenerate: () => void;
}

function ParticipantFeedbackRow({
  participant,
  trainingId,
  trainingDate,
  feedbackRequest,
  feedback,
  isGenerating,
  onGenerate,
}: ParticipantFeedbackRowProps) {
  const navigate = useNavigate();
  const { trackFeature } = useFeatureTracking();
  const [copied, setCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isMarkedSent, setIsMarkedSent] = useState(!!feedbackRequest?.sent_at);

  const linkData = feedbackRequest?.token
    ? {
        url: `${window.location.origin}/feedback/${feedbackRequest.token}`,
        token: feedbackRequest.token,
        expiresAt: feedbackRequest.expires_at,
      }
    : null;

  const status = feedback ? 'received' : (feedbackRequest?.status === 'pending' ? 'waiting' : 'none');

  const handleCopyLink = async () => {
    if (!linkData) return;

    try {
      await navigator.clipboard.writeText(linkData.url);
      setCopied(true);
      toast.success(`Odkaz pro ${participant.name} zkopírován`);
      trackFeature('feedback_link_copy', 'feedback', {
        metadata: { client_id: participant.client_id }
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Zkopírujte odkaz:', linkData.url);
    }
  };

  const handleToggleSent = async () => {
    if (!linkData) return;

    if (!isMarkedSent) {
      try {
        const { error } = await supabase.functions.invoke('mark-feedback-sent', {
          body: { token: linkData.token, send_channel: 'manual' },
        });
        if (error) throw error;
        setIsMarkedSent(true);
        toast.success('Označeno jako odesláno');
      } catch (error) {
        console.error('Error marking sent:', error);
        toast.error('Nepodařilo se označit jako odesláno');
      }
    }
  };

  // Show completed feedback
  if (status === 'received' && feedback) {
    return (
      <div className="p-3 rounded-lg border bg-success/5 border-success/20">
      <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{participant.name}</span>
          <Check className="w-4 h-4 text-success ml-auto" />
          <span className="text-xs text-success">Vyplněno</span>
        </div>
        <FeedbackSummaryCard
          feedback={feedback}
          clientName={participant.name}
          trainingDate={trainingDate}
        />
      </div>
    );
  }

  // Show link or generate button
  return (
    <div className="p-3 rounded-lg border bg-card">
    <div className="flex items-center gap-2 mb-2">
      <User className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium text-sm">{participant.name}</span>
      {feedbackRequest && (
        <div className="ml-auto">
          <InviteStatusBadge
            status={feedbackRequest.status}
            sentAt={feedbackRequest.sent_at}
            openedAt={feedbackRequest.opened_at}
            completedAt={null}
            expiresAt={feedbackRequest.expires_at}
          />
        </div>
      )}
    </div>

      {linkData ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowShareSheet(true)}
            className="flex-1"
          >
            <Share2 className="w-3 h-3 mr-1" />
            Sdílet
          </Button>
          <Button
            size="sm"
            variant={copied ? 'default' : 'ghost'}
            onClick={handleCopyLink}
            className={cn(copied && 'bg-success hover:bg-success/90')}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
          
          <ShareConfirmSheet
            open={showShareSheet}
            onOpenChange={setShowShareSheet}
            clientName={participant.name}
            trainingDate={trainingDate}
            linkUrl={linkData.url}
            linkToken={linkData.token}
            onLinkCopied={() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            onLinkSent={() => {
              setIsMarkedSent(true);
              handleToggleSent();
            }}
            onOpenClientCard={() => navigate(`/clients/${participant.client_id}`)}
          />
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <Clock className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <MessageSquare className="w-3 h-3 mr-1" />
          )}
          Vygenerovat odkaz
        </Button>
      )}
    </div>
  );
}

export function MultiParticipantFeedbackSection({
  trainingId,
  trainingDate,
  trainingStatus,
  participants,
  feedbackEnabled = true,
}: MultiParticipantFeedbackSectionProps) {
  const { trackFeature } = useFeatureTracking();
  const [isExpanded, setIsExpanded] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const participantIds = participants.map(p => p.client_id);
  const { data: feedbackRequests = [], refetch: refetchRequests } = useParticipantFeedbackRequests(trainingId, participantIds);
  const { data: feedbackList = [] } = useParticipantFeedback(trainingId);

  // Don't show for non-completed trainings
  if (trainingStatus !== 'completed') {
    return null;
  }

  // Don't show if feedback is disabled
  if (!feedbackEnabled) {
    return (
      <Card className="border-dashed opacity-60">
        <CardContent className="pt-6 text-center text-muted-foreground text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Feedback dotazníky jsou vypnuté
        </CardContent>
      </Card>
    );
  }

  const handleGenerateLink = async (clientId: string) => {
    setGeneratingFor(clientId);
    try {
      const { data, error } = await supabase.functions.invoke('create-feedback-link', {
        body: {
          client_id: clientId,
          training_id: trainingId,
          base_url: window.location.origin,
        },
      });

      if (error) throw error;

      trackFeature('feedback_link_generated', 'feedback', {
        metadata: {
          client_id: clientId,
          training_id: trainingId,
        }
      });
      
      // Refetch to get the new request
      refetchRequests();
      toast.success('Odkaz vygenerován');
    } catch (error: any) {
      console.error('Error generating feedback link:', error);
      toast.error(error.message || 'Chyba při vytváření odkazu');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleGenerateAll = async () => {
    const participantsWithoutLink = participants.filter(
      p => !feedbackRequests.find(fr => fr.client_id === p.client_id)
    );

    for (const participant of participantsWithoutLink) {
      await handleGenerateLink(participant.client_id);
    }
  };

  // Count stats
  const completedCount = feedbackList.length;
  const pendingCount = feedbackRequests.filter(fr => fr.status === 'pending' || fr.status === 'sent').length;
  const totalCount = participants.length;

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Zpětná vazba
              </CardTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3" />
                {completedCount}/{totalCount}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>
            Pošlete klientům odkaz pro vyplnění zpětné vazby
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            {/* Quick actions */}
            {participants.length > 1 && (
              <div className="flex gap-2 pb-2 border-b">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateAll}
                  disabled={generatingFor !== null}
                  className="flex-1"
                >
                  Vygenerovat všem
                </Button>
              </div>
            )}

            {/* Participant list */}
            <div className="space-y-2">
              {participants.map(participant => {
                const request = feedbackRequests.find(fr => fr.client_id === participant.client_id);
                const feedback = feedbackList.find(f => f.client_id === participant.client_id);

                return (
                  <ParticipantFeedbackRow
                    key={participant.client_id}
                    participant={participant}
                    trainingId={trainingId}
                    trainingDate={trainingDate}
                    feedbackRequest={request}
                    feedback={feedback}
                    isGenerating={generatingFor === participant.client_id}
                    onGenerate={() => handleGenerateLink(participant.client_id)}
                  />
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
