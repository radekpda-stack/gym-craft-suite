import { useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useClient, useUpdateClient, useArchiveClient } from '@/hooks/useClients';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useSharedBudgetBalance, useCreditTransactions, useSharedBudgetTransactions } from '@/hooks/useCreditOperations';
import { ClientFormValues } from '@/lib/validations/client';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { ClientDetailSkeleton } from '@/components/skeletons';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { ClientDetailView } from '@/components/clients/ClientDetailView';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { toast } from '@/hooks/use-toast';
import { useClientPortalAccess } from '@/hooks/useClientPortalAccess';

// Components
import { ClientHeaderCompact } from '@/components/clients/ClientHeaderCompact';
import { ClientQuickCards } from '@/components/clients/ClientQuickCards';
import { ClientTrainingFinanceCard } from '@/components/clients/ClientTrainingFinanceCard';
import { 
  ClientDashboardGrid,
  PerformanceCard,
  CommunicationCard,
  HealthCard,
  BodyCard,
  HistoryCard,
  SettingsCard,
} from '@/components/clients/dashboard';

// Audit components
import { ClientHealthAlert } from '@/components/clients/ClientHealthAlert';
import { ClientPeriodizationCard } from '@/components/clients/ClientPeriodizationCard';
import { ClientFeedbackAnalysisSection } from '@/components/clients/ClientFeedbackAnalysisSection';
import { ClientQuickInfoCard } from '@/components/clients/ClientQuickInfoCard';
import { ClientTrainingLoadCard } from '@/components/clients/ClientTrainingLoadCard';

// Action components
import { ClientActionsSheet } from '@/components/clients/ClientActionsSheet';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { useFeedbackEvaluation } from '@/hooks/useFeedbackEvaluation';


export default function ClientDetail() {
  usePageTracking('client_detail');
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(id);
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const { data: feedbackData = [] } = useClientFeedback(id);
  const { data: creditTransactions = [] } = useCreditTransactions(id);
  const { data: sharedTransactions = [] } = useSharedBudgetTransactions(sharedBudgetInfo?.groupId);
  const { data: portalAccess } = useClientPortalAccess(id);
  // unreadChatCount now handled by CommunicationCard internally
  const updateClient = useUpdateClient();
  const archiveClient = useArchiveClient();
  const isMobile = useIsMobile();
  
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  
  // Ref for scrolling (kept for future use)
  const adminSectionRef = useRef<HTMLDivElement>(null);

  // Derived data
  const lastCompletedSession = sessions.find((s: any) => s.status === 'completed');
  const lastFeedback = feedbackData[0];
  const { evaluation: feedbackEval } = useFeedbackEvaluation(id);
  const redFlagCount = feedbackEval?.redFlagCount ?? 0;

  // All transactions (personal + group if shared, deduplicated) - MUST be before early returns
  const isSharedBudget = sharedBudgetInfo?.isShared ?? false;
  const allTransactions = useMemo(() => {
    if (!isSharedBudget) return creditTransactions;
    
    // Combine and deduplicate by transaction ID
    const combined = [...creditTransactions, ...sharedTransactions];
    const seen = new Set<string>();
    return combined.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [isSharedBudget, creditTransactions, sharedTransactions]);

  if (clientLoading) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Klient nenalezen</h2>
          <Link to="/clients" className="text-primary mt-2 inline-block">
            Zpět na seznam klientů
          </Link>
        </div>
      </div>
    );
  }

  // Shared budget info (isSharedBudget already computed above for useMemo)
  const sharedBalance = sharedBudgetInfo?.sharedBalance ?? 0;
  const creditBalance = isSharedBudget ? sharedBalance : (client.credit_balance || 0);
  
  // Unpaid stats
  const unpaidCount = unpaidTrainings.length;

  // Client zone info from portal access
  const clientZoneInfo = portalAccess ? {
    isActive: portalAccess.status === 'active' && !!portalAccess.auth_user_id,
    lastLogin: portalAccess.last_portal_login,
  } : null;

  const handleAddNote = async (note: string) => {
    const currentNotes = client.notes || '';
    const newNotes = currentNotes 
      ? `${currentNotes}\n\n[${format(new Date(), 'd.M.yyyy HH:mm')}]\n${note}`
      : `[${format(new Date(), 'd.M.yyyy HH:mm')}]\n${note}`;
    
    // Only send the notes field - prevents overwriting other fields like credit_balance
    await updateClient.mutateAsync({ 
      id: client.id, 
      values: { notes: newNotes }
    });
    toast({ title: 'Poznámka uložena' });
  };

  const handleArchive = async () => {
    // Use dedicated archive mutation - prevents overwriting other fields
    await archiveClient.mutateAsync({ 
      id: client.id, 
      is_archived: !client.is_archived
    });
  };

  const handleSaveClient = async (data: ClientFormValues) => {
    await updateClient.mutateAsync({ id: client.id, values: data });
  };

  const handleUpdateTrainingStartDate = async (date: string | null) => {
    // Only send training_start_date - prevents overwriting other fields like credit_balance
    const updated = await updateClient.mutateAsync({
      id: client.id,
      values: { training_start_date: date },
    });

    // Force UI to reflect the saved value immediately (even before refetch finishes)
    queryClient.setQueryData(["clients", client.id], updated);

    // If backend didn't persist the field, warn instead of showing a false-success state
    const saved = (updated as any)?.training_start_date ?? null;
    if (saved !== date) {
      toast({
        title: 'Datum se neuložilo',
        description: 'Zkuste to prosím ještě jednou (případně refresh stránky).',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Datum aktualizováno' });
  };


  // Dashboard cards for the new Smart Dashboard layout

  // Dashboard cards for the new Smart Dashboard layout
  const dashboardCards = [
    {
      id: 'performance',
      component: (
        <PerformanceCard
          clientId={client.id}
          clientName={client.name}
          lastCompletedTrainingId={lastCompletedSession?.id}
        />
      ),
    },
    {
      id: 'communication',
      component: (
        <CommunicationCard
          clientId={client.id}
          clientName={client.name}
          notes={client.notes}
          onAddNote={handleAddNote}
        />
      ),
    },
    {
      id: 'health',
      component: (
        <HealthCard
          clientId={client.id}
          clientName={client.name}
        />
      ),
    },
    {
      id: 'body',
      component: (
        <BodyCard
          clientId={client.id}
          clientName={client.name}
        />
      ),
    },
    {
      id: 'history',
      component: (
        <HistoryCard
          clientId={client.id}
        />
      ),
    },
    {
      id: 'settings',
      component: (
        <SettingsCard
          client={client}
          isSharedBudget={isSharedBudget}
          budgetGroupId={sharedBudgetInfo?.groupId}
          onArchive={handleArchive}
          portalAccess={portalAccess}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-24 sm:pb-4">
      {/* Desktop Breadcrumbs */}
      {!isMobile && (
        <PageBreadcrumbs
          items={[
            { label: 'Klienti', href: '/clients' },
            { label: client.name },
          ]}
        />
      )}

      {/* SECTION 1: Sticky Header with contact + birth year + chodí od + red flags */}
      <ClientHeaderCompact 
        client={client} 
        onUpdateTrainingStartDate={handleUpdateTrainingStartDate}
        redFlagCount={redFlagCount}
        lastPortalLogin={portalAccess?.last_portal_login}
      />

      {/* NEW: Quick Info Card - editable phone, email, gender, handedness */}
      <ClientQuickInfoCard
        client={client}
        onUpdate={handleSaveClient}
        isLoading={updateClient.isPending}
      />

      {/* NEW: Health Alert Banner */}
      <ClientHealthAlert 
        clientId={client.id} 
        healthRestrictions={client.health_restrictions} 
      />

      {/* SECTION: Feedback Analysis - Training → Response */}
      <ClientFeedbackAnalysisSection clientId={client.id} defaultOpen={false} />

      {/* SECTION: Training Load & RPE Stats */}
      <ClientTrainingLoadCard clientId={client.id} />

      {/* Periodization Card */}
      <ClientPeriodizationCard clientId={client.id} />

      {/* SECTION 2: 2 Quick Cards - Pace Trend, Credit + LTV */}
      <div id="section-trainings">
        <ClientQuickCards
          clientId={client.id}
          clientName={client.name}
          creditBalance={creditBalance}
          isSharedBudget={isSharedBudget}
          budgetGroupName={sharedBudgetInfo?.groupName}
          budgetMemberCount={sharedBudgetInfo?.members?.length}
          onAddCredit={() => setIsCreditModalOpen(true)}
        />
      </div>

      {/* SECTION 3: Training & Finance History */}
      <div id="section-history">
        <ClientTrainingFinanceCard
          clientId={client.id}
          sessions={sessions}
          transactions={allTransactions as any}
          isSharedBudget={isSharedBudget}
          budgetGroupName={sharedBudgetInfo?.groupName}
        />
      </div>

      {/* SECTION 5: Smart Dashboard with cards */}
      <ClientDashboardGrid
        clientId={client.id}
        cards={dashboardCards}
      />

      {/* Full Profile Dialog/Sheet */}
      {showClientDetails && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-x-0 bottom-0 top-0 sm:inset-4 sm:m-auto sm:max-w-3xl sm:max-h-[90vh] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Profil klienta</h2>
              <button
                onClick={() => setShowClientDetails(false)}
                className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ClientDetailView
                client={client}
                onSave={handleSaveClient}
                isLoading={updateClient.isPending}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB + Bottom Sheet */}
      {isMobile && (
        <ClientActionsSheet
          client={client}
          isSharedBudget={isSharedBudget}
          budgetGroupId={sharedBudgetInfo?.groupId}
          onAddTraining={() => setIsTrainingDialogOpen(true)}
          onAddNote={handleAddNote}
        />
      )}
      
      {/* Dialogs */}
      <CreateTrainingDialog
        open={isTrainingDialogOpen}
        onOpenChange={setIsTrainingDialogOpen}
        defaultClientId={client.id}
      />
      
      <UnifiedCreditModal
        open={isCreditModalOpen}
        onOpenChange={setIsCreditModalOpen}
        defaultClientId={client.id}
        showTrigger={false}
      />
    </div>
  );
}
