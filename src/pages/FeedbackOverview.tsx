import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  MessageSquare,
  AlertTriangle,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  ChevronRight,
  Send,
  Copy,
  ExternalLink,
  XCircle,
  Mail,
  MailOpen,
  Settings2,
  Trash2,
  Bell,
  BellOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackDetailDialog } from '@/components/feedback/FeedbackDetailDialog';
import { DeleteFeedbackDialog } from '@/components/feedback/DeleteFeedbackDialog';
import type { TrainingFeedback } from '@/hooks/useTrainingFeedback';
import { useClients } from '@/hooks/useClients';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { usePendingFeedbackTrainings } from '@/hooks/usePendingFeedbackTrainings';
import { useCreateFeedbackRequest, useDeleteFeedbackRequest, useDeleteMultipleFeedbackRequests } from '@/hooks/useFeedbackRequests';
import { useToggleClientFeedback } from '@/hooks/useToggleClientFeedback';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { FeedbackTrendsOverview } from '@/components/feedback/FeedbackTrendsOverview';
import { FeedbackStatusCards } from '@/components/feedback/FeedbackStatusCards';
import { FeedbackActivityTimeline } from '@/components/feedback/FeedbackActivityTimeline';
import { FeedbackAttentionInbox } from '@/components/feedback/FeedbackAttentionInbox';
import { FeedbackSettings } from '@/components/settings/FeedbackSettings';
import { TrainingFeedbackCorrelationCard } from '@/components/feedback/TrainingFeedbackCorrelationCard';
import { FeedbackTagCorrelation } from '@/components/feedback/FeedbackTagCorrelation';
import { FeedbackPeriodComparison } from '@/components/feedback/FeedbackPeriodComparison';
import { usePageTracking } from '@/hooks/useFeatureTracking';

type PeriodOption = '7' | '30' | '90' | 'all';
type StatusFilter = 'all' | 'red_flags' | 'completed' | 'pending' | 'expired' | 'unfilled';
type TabValue = 'to_send' | 'analytics' | 'history' | 'settings';

export default function FeedbackOverview() {
  usePageTracking('feedback_overview');
  const [activeTab, setActiveTab] = useState<TabValue>('to_send');
  const [period, setPeriod] = useState<PeriodOption>('30');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<TrainingFeedback | null>(null);
  const [selectedFeedbackMeta, setSelectedFeedbackMeta] = useState<{
    clientName?: string;
    trainingDate?: string;
  }>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{
    id: string;
    clientName: string;
    isCompleted: boolean;
  } | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);

  const { data: clients = [] } = useClients();
  const { data: pendingTrainings = [], isLoading: pendingLoading } = usePendingFeedbackTrainings();
  const createFeedbackRequest = useCreateFeedbackRequest();
  const deleteFeedbackRequest = useDeleteFeedbackRequest();
  const deleteMultipleFeedbackRequests = useDeleteMultipleFeedbackRequests();
  const toggleClientFeedback = useToggleClientFeedback();
  
  // Toggle feedback confirmation dialog
  const [feedbackToggleDialog, setFeedbackToggleDialog] = useState<{
    open: boolean;
    clientId: string;
    clientName: string;
    newValue: boolean;
  }>({ open: false, clientId: '', clientName: '', newValue: false });

  const handleFeedbackToggle = (clientId: string, clientName: string, currentValue: boolean) => {
    setFeedbackToggleDialog({
      open: true,
      clientId,
      clientName,
      newValue: !currentValue,
    });
  };

  const confirmFeedbackToggle = () => {
    toggleClientFeedback.mutate({
      clientId: feedbackToggleDialog.clientId,
      enabled: feedbackToggleDialog.newValue,
    });
    setFeedbackToggleDialog({ open: false, clientId: '', clientName: '', newValue: false });
  };

  // Handle status card click
  const handleStatusClick = (status: 'to_send' | 'pending' | 'completed' | 'expired' | 'red_flags') => {
    if (status === 'to_send') {
      setActiveTab('to_send');
    } else {
      setActiveTab('history');
      if (status === 'pending') {
        setStatusFilter('pending');
      } else if (status === 'completed') {
        setStatusFilter('completed');
      } else if (status === 'expired') {
        setStatusFilter('expired');
      } else if (status === 'red_flags') {
        setStatusFilter('red_flags');
      }
    }
  };

  // Fetch feedback requests with their feedback data
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['feedback-overview', period, statusFilter, selectedClientId],
    queryFn: async () => {
      const now = new Date();
      
      // First, get feedback requests
      let requestQuery = supabase
        .from('feedback_requests')
        .select(`
          id,
          client_id,
          training_session_id,
          status,
          created_at,
          completed_at,
          expires_at
        `)
        .order('created_at', { ascending: false });

      // Apply date filter
      if (period !== 'all') {
        const startDate = subDays(new Date(), parseInt(period));
        requestQuery = requestQuery.gte('created_at', startOfDay(startDate).toISOString());
      }

      // Apply client filter
      if (selectedClientId !== 'all') {
        requestQuery = requestQuery.eq('client_id', selectedClientId);
      }

      // Apply status filter for requests
      if (statusFilter === 'completed') {
        requestQuery = requestQuery.eq('status', 'completed');
      } else if (statusFilter === 'pending' || statusFilter === 'unfilled') {
        requestQuery = requestQuery.eq('status', 'pending');
      } else if (statusFilter === 'expired') {
        requestQuery = requestQuery.eq('status', 'pending');
      }

      const { data: requests, error: requestError } = await requestQuery;
      if (requestError) throw requestError;

      // Filter expired on client side
      let filteredRequests = requests || [];
      if (statusFilter === 'expired') {
        filteredRequests = filteredRequests.filter(r => new Date(r.expires_at) <= now);
      } else if (statusFilter === 'pending') {
        filteredRequests = filteredRequests.filter(r => new Date(r.expires_at) > now);
      } else if (statusFilter === 'unfilled') {
        // Show all pending (both expired and not)
        filteredRequests = filteredRequests.filter(r => r.status === 'pending');
      }

      // Get feedback details for completed requests
      const completedRequestIds = filteredRequests
        .filter(r => r.status === 'completed')
        .map(r => r.id);

      let feedbackRecords: TrainingFeedback[] = [];
      if (completedRequestIds.length > 0) {
        const { data: feedbacks, error: feedbackError } = await supabase
          .from('training_feedback')
          .select('*')
          .in('feedback_request_id', completedRequestIds);
        
        if (feedbackError) throw feedbackError;
        feedbackRecords = (feedbacks || []) as TrainingFeedback[];
      }

      // Get training dates
      const trainingIds = filteredRequests
        .map(r => r.training_session_id)
        .filter((id): id is string => id !== null);

      let trainingDates: Record<string, string> = {};
      if (trainingIds.length > 0) {
        const { data: trainings } = await supabase
          .from('training_sessions')
          .select('id, date')
          .in('id', trainingIds);
        
        trainingDates = (trainings || []).reduce((acc, t) => {
          acc[t.id] = t.date;
          return acc;
        }, {} as Record<string, string>);
      }

      // Combine data
      const combined = filteredRequests.map(request => {
        const feedback = feedbackRecords.find(f => f.feedback_request_id === request.id);
        const client = clients.find(c => c.id === request.client_id);
        const trainingDate = request.training_session_id 
          ? trainingDates[request.training_session_id] 
          : undefined;
        const isExpired = request.status === 'pending' && new Date(request.expires_at) <= now;

        return {
          request,
          feedback,
          clientName: client?.name || 'Neznámý klient',
          trainingDate,
          isExpired,
        };
      });

      // Filter red flags if needed
      if (statusFilter === 'red_flags') {
        return combined.filter(item => item.feedback?.is_red_flag);
      }

      return combined;
    },
  });

  const openFeedbackDetail = (item: typeof feedbackData extends (infer T)[] ? T : never) => {
    if (item.feedback) {
      setSelectedFeedback(item.feedback);
      setSelectedFeedbackMeta({
        clientName: item.clientName,
        trainingDate: item.trainingDate,
      });
      setDialogOpen(true);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const isAllSelected = feedbackData && feedbackData.length > 0 && selectedIds.size === feedbackData.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(feedbackData?.map(item => item.request.id) || []));
    }
  };

  // Delete handlers
  const handleDeleteClick = (item: NonNullable<typeof feedbackData>[number]) => {
    setFeedbackToDelete({
      id: item.request.id,
      clientName: item.clientName,
      isCompleted: item.request.status === 'completed',
    });
    setIsBulkDelete(false);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) {
      toast.error('Vyberte feedbacky k smazání');
      return;
    }
    setFeedbackToDelete(null);
    setIsBulkDelete(true);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (isBulkDelete) {
        await deleteMultipleFeedbackRequests.mutateAsync(Array.from(selectedIds));
        toast.success(`Smazáno ${selectedIds.size} feedbacků`);
        setSelectedIds(new Set());
      } else if (feedbackToDelete) {
        await deleteFeedbackRequest.mutateAsync(feedbackToDelete.id);
        toast.success('Feedback smazán');
      }
      setDeleteDialogOpen(false);
    } catch {
      toast.error('Nepodařilo se smazat feedback');
    }
  };

  // Helper to get status color based on hours since training
  const getTimeBadge = (hours: number) => {
    if (hours < 24) {
      return { color: 'bg-success/20 text-success', label: 'Čerstvé', icon: '🟢' };
    } else if (hours < 48) {
      return { color: 'bg-warning/20 text-warning', label: 'Je čas', icon: '🟠' };
    } else {
      return { color: 'bg-destructive/20 text-destructive', label: 'Zpožděné', icon: '🔴' };
    }
  };

  // Helper to get feedback status badge
  const getFeedbackStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'completed':
        return { 
          color: 'bg-success/20 text-success', 
          label: 'Vyplněn', 
          Icon: CheckCircle2 
        };
      case 'sent_pending':
        return { 
          color: 'bg-accent/20 text-accent', 
          label: 'Odesláno e-mailem', 
          Icon: Mail 
        };
      case 'link_copied':
        return { 
          color: 'bg-warning/20 text-warning', 
          label: 'Odkaz zkopírován', 
          Icon: Copy 
        };
      default:
        return { 
          color: 'bg-muted text-muted-foreground', 
          label: 'Čeká na odeslání', 
          Icon: MailOpen 
        };
    }
  };

  // Copy feedback link to clipboard - one click action
  const copyFeedbackLink = async (trainingId: string, clientId: string) => {
    try {
      // Create or reuse feedback request
      // Always use production URL for public feedback links
      const PRODUCTION_FEEDBACK_URL = 'https://justmoveasistent.lovable.app';
      
      const result = await createFeedbackRequest.mutateAsync({
        client_id: clientId,
        training_session_id: trainingId,
      });

      const feedbackUrl = `${PRODUCTION_FEEDBACK_URL}/feedback/${result.token}`.trim();
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      const copyToClipboard = async (text: string): Promise<boolean> => {
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch {
            // fall through
          }
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          return document.execCommand('copy');
        } catch {
          return false;
        } finally {
          document.body.removeChild(textArea);
        }
      };

      const success = await copyToClipboard(feedbackUrl);
      if (success) {
        toast.success('Odkaz zkopírován do schránky');
        // iOS/Android někdy "zkrátí" vložený text – pro jistotu nabídneme plný odkaz i v okně.
        if (isMobile) window.prompt('Pro jistotu zkopírujte celý odkaz:', feedbackUrl);
        return;
      }

      window.prompt('Zkopírujte odkaz:', feedbackUrl);
      toast.info('Zkopírujte odkaz z okna výše');
    } catch (error: any) {
      console.error('Error creating/copying feedback link:', error);
      toast.error(error?.message || 'Nepodařilo se vytvořit odkaz');
    }
  };

  // Get status icon for history list
  const getStatusIcon = (item: NonNullable<typeof feedbackData>[number]) => {
    if (item.request.status === 'completed') {
      if (item.feedback?.is_red_flag) {
        return { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/20' };
      }
      return { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/20' };
    }
    if (item.isExpired) {
      return { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
    return { icon: Clock, color: 'text-warning', bg: 'bg-warning/20' };
  };

  // Count unfilled for filter badge
  const unfilledCount = useMemo(() => {
    if (!feedbackData) return 0;
    return feedbackData.filter(item => 
      item.request.status === 'pending' || item.isExpired
    ).length;
  }, [feedbackData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageBreadcrumbs
        items={[
          { label: 'Přehled zpětné vazby' },
        ]}
      />

      {/* Hero Section - Status Cards */}
      <FeedbackStatusCards 
        onStatusClick={handleStatusClick}
        pendingCount={pendingTrainings.length}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attention Inbox - Side panel */}
        <div className="lg:col-span-1 order-2 lg:order-1 space-y-4">
          <FeedbackAttentionInbox limit={8} />
          <FeedbackActivityTimeline />
        </div>

        {/* Tabs - Main content */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="to_send" className="gap-2">
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">K odeslání</span>
                {pendingTrainings.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{pendingTrainings.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Statistiky</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Historie</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Nastavení</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab: Analytics */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Period Comparison */}
              <FeedbackPeriodComparison />
              
              {/* Existing trends */}
              <FeedbackTrendsOverview days={parseInt(period) || 30} />
              
              {/* Training-Feedback Correlation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TrainingFeedbackCorrelationCard days={90} />
                <FeedbackTagCorrelation days={90} />
              </div>
            </TabsContent>

            {/* Tab: To Send */}
            <TabsContent value="to_send" className="space-y-4">
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tréninky čekající na odeslání zpětné vazby</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-16 rounded-xl" />
                      ))}
                    </div>
                  ) : pendingTrainings.length > 0 ? (
                    <div className="space-y-2">
                      {pendingTrainings.map((training) => {
                        const timeBadge = getTimeBadge(training.hours_since_training);
                        const feedbackStatus = getFeedbackStatusBadge(training.feedback_status);
                        const FeedbackIcon = feedbackStatus.Icon;
                        const isGroupTraining = training.total_participants > 1;
                        return (
                          <div
                            key={training.participant_id}
                            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                          >
                            {/* Time indicator */}
                            <Badge className={cn('shrink-0', timeBadge.color)}>
                              {timeBadge.icon} {Math.round(training.hours_since_training)}h
                            </Badge>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link 
                                  to={`/clients/${training.client_id}`}
                                  className="font-medium hover:underline"
                                >
                                  {training.client_name}
                                </Link>
                                {/* Group training badge */}
                                {isGroupTraining && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Users className="w-3 h-3" />
                                    {training.participant_index}/{training.total_participants}
                                  </Badge>
                                )}
                                {/* Feedback status badge */}
                                <Badge variant="outline" className={cn('text-xs gap-1', feedbackStatus.color)}>
                                  <FeedbackIcon className="w-3 h-3" />
                                  {feedbackStatus.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(training.date), 'd.M.yyyy HH:mm', { locale: cs })}
                              </p>
                            </div>

                            {/* Actions - different for completed vs pending */}
                            <div className="flex items-center gap-2 shrink-0">
                              {training.feedback_status === 'completed' ? (
                                // Completed feedback - show green success indicator
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/20 text-success">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">Vyplněno</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                  >
                                    <Link to={`/trainings/${training.id}`}>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  </Button>
                                </div>
                              ) : (
                                // Pending feedback - show actions
                                <>
                                  {/* Feedback toggle */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center">
                                        <Switch
                                          checked={true}
                                          onCheckedChange={() => handleFeedbackToggle(training.client_id, training.client_name, true)}
                                          disabled={toggleClientFeedback.isPending}
                                          className="scale-75"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Vypnout feedback pro {training.client_name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => copyFeedbackLink(training.id, training.client_id)}
                                    disabled={createFeedbackRequest.isPending}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Kopírovat</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                  >
                                    <Link to={`/trainings/${training.id}`}>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
                      <p className="text-muted-foreground">Všechny feedbacky odeslány!</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Žádné tréninky nečekají na odeslání dotazníku
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: History */}
            <TabsContent value="history" className="space-y-4">
              {/* Filters */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
                      <SelectTrigger className="w-[140px]">
                        <Calendar className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dní</SelectItem>
                        <SelectItem value="30">30 dní</SelectItem>
                        <SelectItem value="90">90 dní</SelectItem>
                        <SelectItem value="all">Vše</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Všechny stavy
                          </span>
                        </SelectItem>
                        <SelectItem value="completed">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Vyplněné
                          </span>
                        </SelectItem>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Čekající
                          </span>
                        </SelectItem>
                        <SelectItem value="expired">
                          <span className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                            Expirované
                          </span>
                        </SelectItem>
                        <SelectItem value="unfilled">
                          <span className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-destructive" />
                            Nevyplněné (testovací)
                          </span>
                        </SelectItem>
                        <SelectItem value="red_flags">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            Jen Red Flags
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <ClientSearchSelect
                      clients={clients.filter(c => !c.is_archived)}
                      value={selectedClientId === 'all' ? '' : selectedClientId}
                      onValueChange={(v) => setSelectedClientId(v || 'all')}
                      placeholder="Všichni klienti"
                      allowAll
                      allLabel="Všichni klienti"
                      className="w-[180px]"
                    />

                    {/* Bulk delete button */}
                    {selectedIds.size > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={handleBulkDeleteClick}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Smazat vybrané ({selectedIds.size})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Feedback List */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Seznam feedbacků</CardTitle>
                    {feedbackData && feedbackData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Vybrat vše"
                        />
                        <span className="text-sm text-muted-foreground">Vybrat vše</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                      ))}
                    </div>
                  ) : feedbackData && feedbackData.length > 0 ? (
                    <div className="space-y-2">
                      {feedbackData.map((item) => {
                        const statusConfig = getStatusIcon(item);
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                          <div
                            key={item.request.id}
                            className={cn(
                              'flex items-center gap-4 p-4 rounded-xl text-left transition-colors',
                              selectedIds.has(item.request.id) && 'ring-2 ring-primary',
                              item.feedback?.is_red_flag && 'bg-destructive/5 border border-destructive/20',
                              !item.feedback?.is_red_flag && 'bg-secondary/30'
                            )}
                          >
                            {/* Checkbox */}
                            <Checkbox
                              checked={selectedIds.has(item.request.id)}
                              onCheckedChange={() => toggleSelect(item.request.id)}
                              aria-label={`Vybrat feedback od ${item.clientName}`}
                              className="shrink-0"
                            />

                            {/* Clickable area */}
                            <button
                              onClick={() => item.feedback && openFeedbackDetail(item)}
                              disabled={!item.feedback}
                              className={cn(
                                'flex-1 flex items-center gap-4 text-left',
                                item.feedback ? 'cursor-pointer' : 'cursor-default opacity-70'
                              )}
                            >
                              {/* Status Icon */}
                              <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                statusConfig.bg
                              )}>
                                <StatusIcon className={cn('w-5 h-5', statusConfig.color)} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium truncate">{item.clientName}</p>
                                  {item.feedback?.is_red_flag && (
                                    <Badge className="bg-destructive/20 text-destructive text-xs">
                                      Red Flag
                                    </Badge>
                                  )}
                                  {item.isExpired && (
                                    <Badge variant="secondary" className="text-xs">
                                      Expirováno
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>
                                    {item.trainingDate 
                                      ? format(new Date(item.trainingDate), 'd.M.yyyy', { locale: cs })
                                      : 'Bez tréninku'}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {item.request.status === 'completed' 
                                      ? 'Vyplněno ' + format(new Date(item.request.completed_at!), 'd.M.', { locale: cs })
                                      : item.isExpired
                                      ? 'Odkaz vypršel'
                                      : 'Čeká na vyplnění'}
                                  </span>
                                </div>

                                {/* Quick metrics for completed */}
                                {item.feedback && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {item.feedback.soreness !== null && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-secondary">
                                        Svalovka: {item.feedback.soreness}/10
                                      </span>
                                    )}
                                    {item.feedback.body_feel !== null && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-secondary">
                                        Pocit: {item.feedback.body_feel}/10
                                      </span>
                                    )}
                                    {item.feedback.pain !== null && item.feedback.pain >= 4 && (
                                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                        Bolest: {item.feedback.pain}/10
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Arrow */}
                              {item.feedback && (
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                              )}
                            </button>

                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(item);
                              }}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Žádné zpětné vazby pro vybrané období</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Settings */}
            <TabsContent value="settings" className="space-y-4">
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Nastavení dotazníku</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeedbackSettings />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedFeedback(null);
            setSelectedFeedbackMeta({});
          }
        }}
        clientName={selectedFeedbackMeta.clientName}
        trainingDate={selectedFeedbackMeta.trainingDate}
      />

      {/* Delete confirmation dialog */}
      <DeleteFeedbackDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteFeedbackRequest.isPending || deleteMultipleFeedbackRequests.isPending}
        feedbackInfo={feedbackToDelete ? {
          clientName: feedbackToDelete.clientName,
          isCompleted: feedbackToDelete.isCompleted,
        } : undefined}
        bulkCount={isBulkDelete ? selectedIds.size : undefined}
      />

      {/* Feedback toggle confirmation dialog */}
      <AlertDialog 
        open={feedbackToggleDialog.open} 
        onOpenChange={(open) => !open && setFeedbackToggleDialog(prev => ({ ...prev, open: false }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {feedbackToggleDialog.newValue ? (
                <Bell className="w-5 h-5 text-emerald-500" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              {feedbackToggleDialog.newValue ? 'Zapnout feedback?' : 'Vypnout feedback?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {feedbackToggleDialog.newValue ? (
                <>
                  Klient <strong>{feedbackToggleDialog.clientName}</strong> se bude zobrazovat v přehledu feedbacků 
                  po každém tréninku.
                </>
              ) : (
                <>
                  Klient <strong>{feedbackToggleDialog.clientName}</strong> se už nebude zobrazovat v přehledu feedbacků 
                  a nebudete vyzváni k odeslání dotazníku. Můžete to kdykoliv změnit v Nastavení.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFeedbackToggle}>
              {feedbackToggleDialog.newValue ? 'Zapnout' : 'Vypnout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
