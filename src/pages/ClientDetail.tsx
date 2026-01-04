import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
import { ClientSecondaryAccordions, SECTION_ICONS } from '@/components/clients/ClientSecondaryAccordions';

// Audit components
import { ClientHealthAlert } from '@/components/clients/ClientHealthAlert';
import { ClientPeriodizationCard } from '@/components/clients/ClientPeriodizationCard';
import { ClientPainMapPreview } from '@/components/clients/ClientPainMapPreview';
import { ClientCommunicationLog } from '@/components/clients/ClientCommunicationLog';
import { ClientInjuryHistory } from '@/components/clients/ClientInjuryHistory';

// Accordion section components
import { ClientActionsSheet } from '@/components/clients/ClientActionsSheet';
import { ClientDiagnosticsSection } from '@/components/clients/ClientDiagnosticsSection';
import { ClientPreDiagnosticSection } from '@/components/clients/ClientPreDiagnosticSection';
import { ClientMeasurementsCard } from '@/components/clients/ClientMeasurementsCard';
import { ClientNutritionCard } from '@/components/clients/ClientNutritionCard';
import { ClientNotesSection } from '@/components/clients/ClientNotesSection';
import { ClientMediaGallery } from '@/components/clients/ClientMediaGallery';
import { ClientFeedbackCard } from '@/components/clients/ClientFeedbackCard';
import { ClientFeedbackRecovery } from '@/components/clients/ClientFeedbackRecovery';
import { ClientTimeline } from '@/components/clients/ClientTimeline';
import { ClientAdminBlock } from '@/components/clients/ClientAdminBlock';
import { ClientPRsCard } from '@/components/clients/ClientPRsCard';
import { ClientChatSection } from '@/components/clients/ClientChatSection';
import { ClientTagAnalyticsCard } from '@/components/clients/ClientTagAnalyticsCard';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { useFeedbackEvaluation } from '@/hooks/useFeedbackEvaluation';
import { useUnreadMessageCount } from '@/hooks/useChatMessages';

export default function ClientDetail() {
  usePageTracking('client_detail');
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(id);
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const { data: feedbackData = [] } = useClientFeedback(id);
  const { data: creditTransactions = [] } = useCreditTransactions(id);
  const { data: sharedTransactions = [] } = useSharedBudgetTransactions(sharedBudgetInfo?.groupId);
  const { data: portalAccess } = useClientPortalAccess(id);
  const { data: unreadChatCount = 0 } = useUnreadMessageCount(undefined, id);
  const updateClient = useUpdateClient();
  const archiveClient = useArchiveClient();
  const isMobile = useIsMobile();
  
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  
  // Ref for scrolling to admin section
  const adminSectionRef = useRef<HTMLDivElement>(null);
  const chatSectionRef = useRef<HTMLDivElement>(null);

  // Check for tab URL param to auto-open sections
  const tabParam = searchParams.get('tab');
  const defaultOpenSections = tabParam ? [tabParam] : [];

  // Scroll to chat section when opened via URL param
  useEffect(() => {
    if (tabParam === 'chat' && chatSectionRef.current) {
      // Small delay to allow accordion to open first
      setTimeout(() => {
        chatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      // Clear the param after handling
      setSearchParams({});
    }
  }, [tabParam, setSearchParams]);

  // Derived data
  const lastCompletedSession = sessions.find((s: any) => s.status === 'completed');
  const lastFeedback = feedbackData[0];
  const { evaluation: feedbackEval } = useFeedbackEvaluation(id);
  const redFlagCount = feedbackEval?.redFlagCount ?? 0;

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

  // Shared budget info
  const isSharedBudget = sharedBudgetInfo?.isShared ?? false;
  const sharedBalance = sharedBudgetInfo?.sharedBalance ?? 0;
  const creditBalance = isSharedBudget ? sharedBalance : (client.credit_balance || 0);
  
  // Unpaid stats
  const unpaidCount = unpaidTrainings.length;

  // Client zone info from portal access
  const clientZoneInfo = portalAccess ? {
    isActive: portalAccess.status === 'active' && !!portalAccess.auth_user_id,
    lastLogin: portalAccess.last_portal_login,
  } : null;

  // All transactions (personal + group if shared)
  const allTransactions = isSharedBudget 
    ? [...creditTransactions, ...sharedTransactions]
    : creditTransactions;

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

  const scrollToAdminSection = () => {
    adminSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Calculate notes count
  const notesCount = client.notes ? client.notes.split('\n\n').filter(n => n.startsWith('[')).length : 0;

  // Build accordion sections - reorganized and consolidated
  const accordionSections = [
    {
      id: 'chat',
      icon: SECTION_ICONS.chat,
      title: 'Chat s klientem',
      badge: unreadChatCount || undefined,
      children: (
        <div id="section-chat" ref={chatSectionRef}>
          <ClientChatSection clientId={client.id} clientName={client.name} />
        </div>
      ),
    },
    {
      id: 'notes',
      icon: SECTION_ICONS.notes,
      title: 'Poznámky & Komunikace',
      badge: notesCount || undefined,
      children: (
        <div id="section-notes" className="space-y-4">
          <ClientNotesSection notes={client.notes} onAddNote={handleAddNote} />
          <ClientCommunicationLog clientId={client.id} />
        </div>
      ),
    },
    {
      id: 'measurements',
      icon: SECTION_ICONS.measurements,
      title: 'Měření',
      children: <div id="section-measurements"><ClientMeasurementsCard clientId={client.id} /></div>,
    },
    {
      id: 'diagnostics',
      icon: SECTION_ICONS.diagnostics,
      title: 'Diagnostika & Mapa bolesti',
      children: (
        <div id="section-diagnostics" className="space-y-4">
          <ClientPreDiagnosticSection clientId={client.id} clientName={client.name} />
          <ClientDiagnosticsSection clientId={client.id} clientName={client.name} />
          <ClientPainMapPreview clientId={client.id} />
        </div>
      ),
    },
    {
      id: 'feedback',
      icon: SECTION_ICONS.feedback,
      title: 'Feedback & Recovery',
      badge: feedbackData.length || undefined,
      children: (
        <div id="section-feedback" className="space-y-4">
          <ClientFeedbackRecovery clientId={client.id} />
          <ClientFeedbackCard 
            clientId={client.id} 
            clientName={client.name}
            lastCompletedTrainingId={lastCompletedSession?.id}
          />
        </div>
      ),
    },
    {
      id: 'prs',
      icon: SECTION_ICONS.measurements,
      title: 'Osobní rekordy',
      children: <div id="section-prs"><ClientPRsCard clientId={client.id} /></div>,
    },
    {
      id: 'training-analytics',
      icon: SECTION_ICONS.feedback,
      title: 'Analytika tréninků',
      children: <div id="section-training-analytics"><ClientTagAnalyticsCard clientId={client.id} /></div>,
    },
    {
      id: 'nutrition',
      icon: SECTION_ICONS.challenges,
      title: 'Výživa & Výzvy',
      children: <ClientNutritionCard clientId={client.id} clientName={client.name} />,
    },
    {
      id: 'media',
      icon: SECTION_ICONS.media,
      title: 'Média & Fotky',
      children: <div id="section-media"><ClientMediaGallery clientId={client.id} /></div>,
    },
    {
      id: 'injuries',
      icon: SECTION_ICONS.diagnostics,
      title: 'Historie zranění',
      children: <div id="section-injuries"><ClientInjuryHistory clientId={client.id} /></div>,
    },
    {
      id: 'timeline',
      icon: SECTION_ICONS.timeline,
      title: 'Časová osa',
      children: <div id="section-timeline"><ClientTimeline clientId={client.id} defaultLimit={20} /></div>,
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

      {/* NEW: Health Alert Banner */}
      <ClientHealthAlert 
        clientId={client.id} 
        healthRestrictions={client.health_restrictions} 
      />

      {/* Periodization Card */}
      <ClientPeriodizationCard clientId={client.id} />

      {/* SECTION 2: 2 Quick Cards - Trainings, Credit + LTV */}
      <div id="section-trainings">
        <ClientQuickCards
          clientId={client.id}
          clientName={client.name}
          sessions={sessions}
          creditBalance={creditBalance}
          isSharedBudget={isSharedBudget}
          budgetGroupName={sharedBudgetInfo?.groupName}
          budgetMemberCount={sharedBudgetInfo?.members?.length}
          onAddTraining={() => setIsTrainingDialogOpen(true)}
          onAddCredit={() => setIsCreditModalOpen(true)}
        />
      </div>

      {/* SECTION 3: Unified Training & Finance History */}
      <div id="section-history">
        <ClientTrainingFinanceCard
          clientId={client.id}
          sessions={sessions}
          transactions={allTransactions as any}
          isSharedBudget={isSharedBudget}
          budgetGroupName={sharedBudgetInfo?.groupName}
        />
      </div>

      {/* SECTION 5: Secondary sections in Accordions */}
      <ClientSecondaryAccordions 
        sections={accordionSections} 
        defaultOpenSections={defaultOpenSections}
      />

      {/* SECTION 6: Admin Section (Klientská zóna) */}
      <div ref={adminSectionRef}>
        <ClientAdminBlock
          client={client}
          isSharedBudget={isSharedBudget}
          budgetGroupId={sharedBudgetInfo?.groupId}
          onArchive={handleArchive}
          defaultExpanded={false}
          portalAccess={portalAccess}
        />
      </div>

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
