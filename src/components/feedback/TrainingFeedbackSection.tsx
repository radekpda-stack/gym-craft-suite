import { useEffect, useRef, useState } from 'react';
import { differenceInHours, format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, Copy, Check, Clock, Bell, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { FeedbackSummaryCard } from './FeedbackSummaryCard';
import type { TrainingFeedback } from '@/hooks/useTrainingFeedback';

interface TrainingFeedbackSectionProps {
  trainingId: string;
  trainingDate: string;
  trainingStatus: string;
  clientId: string;
  clientName: string;
  feedbackEnabled?: boolean;
  existingFeedback?: boolean;
  feedbackData?: TrainingFeedback | null;
  feedbackRequest?: {
    id: string;
    token: string;
    status: string;
    expires_at: string;
    sent_at: string | null;
    reminder_count: number;
  } | null;
}

type LinkData = {
  url: string;
  token: string;
  expiresAt: string;
};

export function TrainingFeedbackSection({
  trainingId,
  trainingDate,
  trainingStatus,
  clientId,
  clientName,
  feedbackEnabled = true,
  existingFeedback = false,
  feedbackData,
  feedbackRequest,
}: TrainingFeedbackSectionProps) {
  const { trackFeature } = useFeatureTracking();
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const attemptedAutoGenerate = useRef(false);

  const [linkData, setLinkData] = useState<LinkData | null>(
    feedbackRequest?.token
      ? {
          url: `${window.location.origin}/feedback/${feedbackRequest.token}`,
          token: feedbackRequest.token,
          expiresAt: feedbackRequest.expires_at,
        }
      : null
  );

  // Time calculations
  const trainingDateObj = new Date(trainingDate);
  const hoursSinceTraining = differenceInHours(new Date(), trainingDateObj);

  // Determine feedback status
  const getFeedbackStatus = () => {
    if (existingFeedback || feedbackData) return 'received';
    if (feedbackRequest?.status === 'completed') return 'received';
    if (feedbackRequest?.status === 'pending') return 'waiting';
    return 'none';
  };

  const status = getFeedbackStatus();

  const handleGenerateLink = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-feedback-link', {
        body: {
          client_id: clientId,
          training_id: trainingId,
          base_url: window.location.origin,
        },
      });

      if (error) throw error;

      setLinkData({
        url: data.url,
        token: data.token,
        expiresAt: data.expiresAt,
      });
    } catch (error: any) {
      console.error('Error generating feedback link:', error);
      toast.error(error.message || 'Chyba při vytváření odkazu');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate link on first render for completed trainings
  useEffect(() => {
    if (trainingStatus !== 'completed') return;
    if (!feedbackEnabled) return;
    if (status === 'received') return;
    if (linkData) return;
    if (attemptedAutoGenerate.current) return;

    attemptedAutoGenerate.current = true;
    void handleGenerateLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingStatus, feedbackEnabled, status, trainingId, clientId]);

  // One-click copy URL
  const handleCopyLink = async () => {
    if (!linkData) return;

    try {
      await navigator.clipboard.writeText(linkData.url);
      setCopied(true);
      toast.success('Odkaz zkopírován do schránky');
      trackFeature('feedback_link_copy', 'feedback');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Nepodařilo se zkopírovat odkaz');
    }
  };

  // Mark reminder sent
  const handleSendReminder = async () => {
    if (!linkData) return;

    try {
      await supabase.functions.invoke('mark-feedback-reminder', {
        body: { token: linkData.token },
      });
      toast.success('Připomínka zaznamenána');
    } catch (error) {
      console.error('Error marking reminder:', error);
      toast.error('Nepodařilo se uložit připomínku');
    }
  };

  // Don't show for non-completed trainings
  if (trainingStatus !== 'completed') {
    return null;
  }

  // Don't show if feedback is disabled for client
  if (!feedbackEnabled) {
    return (
      <Card className="border-dashed opacity-60">
        <CardContent className="pt-6 text-center text-muted-foreground text-sm">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Klient má vypnuté posílání feedback dotazníků
        </CardContent>
      </Card>
    );
  }

  // Show feedback summary card when feedback is received
  if (status === 'received' && feedbackData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Zpětná vazba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackSummaryCard
            feedback={feedbackData}
            clientName={clientName}
            trainingDate={trainingDate}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Zpětná vazba
          </CardTitle>
          <Badge
            variant={status === 'received' ? 'default' : status === 'waiting' ? 'secondary' : 'outline'}
            className={cn(
              status === 'received' && 'bg-green-500/20 text-green-600 border-green-500/30',
              status === 'waiting' && 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
            )}
          >
            {status === 'received' && <Check className="w-3 h-3 mr-1" />}
            {status === 'waiting' && <Clock className="w-3 h-3 mr-1" />}
            {status === 'received' ? 'Doručena' : status === 'waiting' ? 'Čeká' : 'Neposlána'}
          </Badge>
        </div>
        <CardDescription>Pošlete klientovi odkaz pro vyplnění zpětné vazby</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {status === 'received' && !feedbackData && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium text-green-600">Zpětná vazba byla vyplněna</p>
          </div>
        )}

        {status !== 'received' && (
          <>
            {linkData ? (
              <div className="space-y-3">
                <Button
                  variant={copied ? 'default' : 'outline'}
                  onClick={handleCopyLink}
                  className={cn('w-full', copied && 'bg-green-600 hover:bg-green-700')}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Zkopírováno!' : 'Kopírovat odkaz'}
                </Button>

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Platnost do: {format(new Date(linkData.expiresAt), 'd.M.yyyy HH:mm', { locale: cs })}
                </p>

                {feedbackRequest?.sent_at && status === 'waiting' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={handleSendReminder}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Poslat připomínku
                    {feedbackRequest.reminder_count > 0 && (
                      <span className="ml-1">({feedbackRequest.reminder_count}×)</span>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm space-y-3">
                <Clock className={cn('w-6 h-6 mx-auto opacity-50', isGenerating && 'animate-spin')} />
                <div>
                  <p>{isGenerating ? 'Připravuji odkaz…' : 'Odkaz se nepodařilo připravit automaticky'}</p>
                  <p className="text-xs mt-1">
                    {hoursSinceTraining < 24
                      ? 'Zkuste to prosím za chvíli, nebo klikněte na Vygenerovat.'
                      : 'Klikněte na Vygenerovat.'}
                  </p>
                </div>
                <Button onClick={handleGenerateLink} disabled={isGenerating} className="w-full">
                  <Link2 className="w-4 h-4 mr-2" />
                  Vygenerovat odkaz
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
