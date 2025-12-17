import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Loader2,
  MoreHorizontal,
  Filter,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFeedbackRequests,
  useSendFeedbackEmail,
  useCancelFeedbackRequest,
  FeedbackRequest,
} from '@/hooks/useFeedbackRequests';
import { TrainingFeedback } from '@/hooks/useTrainingFeedback';
import { FeedbackDetailDialog } from './FeedbackDetailDialog';
import { FeedbackTrendsChart } from './FeedbackTrendsChart';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface FeedbackHistoryListProps {
  clientId?: string;
  showFilters?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: 'Čeká', icon: Clock, color: 'bg-yellow-500/20 text-yellow-700' },
  sent: { label: 'Odesláno', icon: Mail, color: 'bg-blue-500/20 text-blue-700' },
  completed: { label: 'Vyplněno', icon: CheckCircle, color: 'bg-green-500/20 text-green-700' },
  expired: { label: 'Expirováno', icon: AlertCircle, color: 'bg-gray-500/20 text-gray-700' },
  cancelled: { label: 'Zrušeno', icon: XCircle, color: 'bg-red-500/20 text-red-700' },
};

// Component to render a single feedback request with detail dialog support
function FeedbackRequestCard({
  request,
  onResend,
  onCancel,
}: {
  request: FeedbackRequest;
  onResend: (req: FeedbackRequest) => void;
  onCancel: (id: string) => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[request.status];
  const StatusIcon = statusConfig.icon;
  const isCompleted = request.status === 'completed';

  // Only fetch feedback data when completed
  const { data: feedback } = useQuery({
    queryKey: ['feedback-by-request', request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('feedback_request_id', request.id)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingFeedback | null;
    },
    enabled: isCompleted,
  });

  return (
    <>
      <Card 
        className={cn(
          'glass transition-all',
          isCompleted && 'cursor-pointer hover:bg-secondary/50'
        )}
        onClick={isCompleted ? () => setDetailOpen(true) : undefined}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={cn('flex items-center gap-1', statusConfig.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </Badge>
                {request.training_sessions && (
                  <span className="text-sm text-muted-foreground">
                    Trénink: {format(new Date(request.training_sessions.date), 'd.M.yyyy', { locale: cs })}
                  </span>
                )}
                {isCompleted && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Eye className="w-3 h-3" />
                    Zobrazit detail
                  </Badge>
                )}
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Klient:</span>{' '}
                  <span className="font-medium">{request.clients?.name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Vytvořeno:</span>{' '}
                  {format(new Date(request.created_at), 'd.M.yyyy HH:mm', { locale: cs })}
                </p>
                {request.sent_at && (
                  <p>
                    <span className="text-muted-foreground">Odesláno:</span>{' '}
                    {format(new Date(request.sent_at), 'd.M.yyyy HH:mm', { locale: cs })}
                  </p>
                )}
                {request.completed_at && (
                  <p>
                    <span className="text-muted-foreground">Vyplněno:</span>{' '}
                    {format(new Date(request.completed_at), 'd.M.yyyy HH:mm', { locale: cs })}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Platnost do:</span>{' '}
                  {format(new Date(request.expires_at), 'd.M.yyyy HH:mm', { locale: cs })}
                </p>

                {/* Quick feedback summary for completed */}
                {isCompleted && feedback && (
                  <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                    {feedback.body_feel !== null && (
                      <Badge variant="secondary" className="text-xs">
                        Pocit: {feedback.body_feel}/10
                      </Badge>
                    )}
                    {feedback.pain !== null && feedback.pain >= 4 && (
                      <Badge className="text-xs bg-orange-500/20 text-orange-700">
                        Bolest: {feedback.pain}/10
                      </Badge>
                    )}
                    {feedback.fun !== null && (
                      <Badge variant="secondary" className="text-xs">
                        Zábava: {feedback.fun}/10
                      </Badge>
                    )}
                    {feedback.is_red_flag && (
                      <Badge className="text-xs bg-red-500/20 text-red-700">
                        ⚠️ Red Flag
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isCompleted && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDetailOpen(true); }}>
                    <Eye className="w-4 h-4 mr-2" />
                    Zobrazit detail
                  </DropdownMenuItem>
                )}
                {(request.status === 'pending' || request.status === 'sent') && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResend(request); }}>
                      <Send className="w-4 h-4 mr-2" />
                      {request.status === 'pending' ? 'Odeslat' : 'Odeslat znovu'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onCancel(request.id); }}
                      className="text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Zrušit
                    </DropdownMenuItem>
                  </>
                )}
                {request.status === 'expired' && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResend(request); }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Vytvořit nový
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={feedback || null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        clientName={request.clients?.name}
        trainingDate={request.training_sessions?.date}
      />
    </>
  );
}

export function FeedbackHistoryList({ clientId, showFilters = true }: FeedbackHistoryListProps) {
  const { data: requests = [], isLoading, refetch } = useFeedbackRequests(clientId);
  const sendEmail = useSendFeedbackEmail();
  const cancelRequest = useCancelFeedbackRequest();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequests = requests.filter(req => 
    statusFilter === 'all' || req.status === statusFilter
  );

  const handleResend = async (request: FeedbackRequest) => {
    await sendEmail.mutateAsync(request);
  };

  const handleCancel = async (requestId: string) => {
    await cancelRequest.mutateAsync(requestId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trends Chart - only show if clientId is provided */}
      {clientId && <FeedbackTrendsChart clientId={clientId} />}

      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Feedback historie
          </h3>
          
          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">Zatím žádné odeslané požadavky na feedback</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(request => (
              <FeedbackRequestCard
                key={request.id}
                request={request}
                onResend={handleResend}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
