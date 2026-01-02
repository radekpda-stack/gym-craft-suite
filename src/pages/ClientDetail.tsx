import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { useClient, useUpdateClient } from '@/hooks/useClients';
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

// New components
import { ClientHeaderCompact } from '@/components/clients/ClientHeaderCompact';
import { ClientQuickCards } from '@/components/clients/ClientQuickCards';
import { ClientTrainingHistory } from '@/components/clients/ClientTrainingHistory';
import { ClientCreditHistory } from '@/components/clients/ClientCreditHistory';
import { ClientSecondaryAccordions, SECTION_ICONS } from '@/components/clients/ClientSecondaryAccordions';

// Existing components for accordion sections
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
import { ClientWorkoutDiary } from '@/components/clients/ClientWorkoutDiary';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';

export default function ClientDetail() {
  usePageTracking('client_detail');
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(id);
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const { data: feedbackData = [] } = useClientFeedback(id);
  const { data: creditTransactions = [] } = useCreditTransactions(id);
  const { data: sharedTransactions = [] } = useSharedBudgetTransactions(sharedBudgetInfo?.groupId);
  const { data: portalAccess } = useClientPortalAccess(id);
  const updateClient = useUpdateClient();
  const isMobile = useIsMobile();
  
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  
  // Ref for scrolling to admin section
  const adminSectionRef = useRef<HTMLDivElement>(null);

  // Derived data
  const lastCompletedSession = sessions.find((s: any) => s.status === 'completed');
  const lastFeedback = feedbackData[0];
  const hasRedFlag = feedbackData.some(f => f.is_red_flag);

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
    
    await updateClient.mutateAsync({ 
      id: client.id, 
      values: { notes: newNotes } as ClientFormValues 
    });
    toast({ title: 'Poznámka uložena' });
  };

  const handleArchive = async () => {
    await updateClient.mutateAsync({ 
      id: client.id, 
      values: { is_archived: !client.is_archived } as ClientFormValues 
    });
    toast({ title: client.is_archived ? 'Klient obnoven' : 'Klient archivován' });
  };

  const handleSaveClient = async (data: ClientFormValues) => {
    await updateClient.mutateAsync({ id: client.id, values: data });
  };

  const handleUpdateTrainingStartDate = async (date: string | null) => {
    await updateClient.mutateAsync({ 
      id: client.id, 
      values: { training_start_date: date } as any 
    });
    toast({ title: 'Datum aktualizováno' });
  };

  const scrollToAdminSection = () => {
    adminSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Build accordion sections
  const accordionSections = [
    {
      id: 'notes',
      icon: SECTION_ICONS.notes,
      title: 'Poznámka trenéra',
      children: <ClientNotesSection notes={client.notes} onAddNote={handleAddNote} />,
    },
    {
      id: 'measurements',
      icon: SECTION_ICONS.measurements,
      title: 'Měření',
      children: <ClientMeasurementsCard clientId={client.id} />,
    },
    {
      id: 'diagnostics',
      icon: SECTION_ICONS.diagnostics,
      title: 'Diagnostika',
      children: (
        <>
          <ClientPreDiagnosticSection clientId={client.id} clientName={client.name} />
          <ClientDiagnosticsSection clientId={client.id} clientName={client.name} />
        </>
      ),
    },
    {
      id: 'feedback',
      icon: SECTION_ICONS.feedback,
      title: 'Feedback & Recovery',
      badge: feedbackData.length || undefined,
      children: (
        <div className="space-y-4">
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
      id: 'nutrition',
      icon: SECTION_ICONS.challenges,
      title: 'Výživa & Výzvy',
      children: <ClientNutritionCard clientId={client.id} clientName={client.name} />,
    },
    {
      id: 'media',
      icon: SECTION_ICONS.media,
      title: 'Média & Fotky',
      children: <ClientMediaGallery clientId={client.id} />,
    },
    {
      id: 'timeline',
      icon: SECTION_ICONS.timeline,
      title: 'Časová osa',
      children: <ClientTimeline clientId={client.id} defaultLimit={20} />,
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

      {/* SECTION 1: Sticky Header with contact + birth year + chodí od */}
      <ClientHeaderCompact 
        client={client} 
        onUpdateTrainingStartDate={handleUpdateTrainingStartDate}
      />

      {/* SECTION 2: 2 Quick Cards - Trainings, Credit */}
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

      {/* SECTION 2.5: Personal Records */}
      <ClientPRsCard clientId={client.id} />

      {/* SECTION 2.6: Workout Diary */}
      <ClientWorkoutDiary clientId={client.id} clientName={client.name} />

      {/* SECTION 3: Training History (Primary) */}
      <ClientTrainingHistory
        clientId={client.id}
        sessions={sessions}
        isSharedBudget={isSharedBudget}
        budgetGroupName={sharedBudgetInfo?.groupName}
      />

      {/* SECTION 4: Credit History (Primary) */}
      <ClientCreditHistory
        clientId={client.id}
        transactions={allTransactions as any}
        isSharedBudget={isSharedBudget}
        budgetGroupName={sharedBudgetInfo?.groupName}
      />

      {/* SECTION 5: Secondary sections in Accordions */}
      <ClientSecondaryAccordions sections={accordionSections} />

      {/* SECTION 6: Admin Section (Klientská zóna) */}
      <div ref={adminSectionRef}>
        <ClientAdminBlock
          client={client}
          isSharedBudget={isSharedBudget}
          budgetGroupId={sharedBudgetInfo?.groupId}
          onArchive={handleArchive}
          defaultExpanded={false}
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
