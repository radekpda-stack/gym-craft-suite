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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

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
    <div className="space-y-4">
      {showFilters && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
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
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Obnovit
          </Button>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Zatím žádné odeslané požadavky na feedback</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const statusConfig = STATUS_CONFIG[request.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={request.id} className="glass">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn('flex items-center gap-1', statusConfig.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </Badge>
                        {request.training_sessions && (
                          <span className="text-sm text-muted-foreground">
                            Trénink: {format(new Date(request.training_sessions.date), 'd.M.yyyy', { locale: cs })}
                          </span>
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
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(request.status === 'pending' || request.status === 'sent') && (
                          <>
                            <DropdownMenuItem onClick={() => handleResend(request)}>
                              <Send className="w-4 h-4 mr-2" />
                              {request.status === 'pending' ? 'Odeslat' : 'Odeslat znovu'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleCancel(request.id)}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Zrušit
                            </DropdownMenuItem>
                          </>
                        )}
                        {request.status === 'expired' && (
                          <DropdownMenuItem onClick={() => handleResend(request)}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Vytvořit nový
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
