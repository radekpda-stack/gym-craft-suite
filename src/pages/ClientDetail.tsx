import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { startOfMonth, isAfter } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useClient, useUpdateClient, useArchiveClient } from '@/hooks/useClients';
import { useSharedBudgetBalance, useCreditTransactions, useSharedBudgetTransactions } from '@/hooks/useCreditOperations';
import { ClientFormValues } from '@/lib/validations/client';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { ClientDetailSkeleton } from '@/components/skeletons';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { toast } from '@/hooks/use-toast';
import { useClientPortalAccess } from '@/hooks/useClientPortalAccess';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';

// Components
import { ClientHeaderCompact } from '@/components/clients/ClientHeaderCompact';
import { ClientSummaryStrip } from '@/components/clients/ClientSummaryStrip';
import { ClientDetailTabs } from '@/components/clients/ClientDetailTabs';
import { ClientHealthAlert } from '@/components/clients/ClientHealthAlert';
import { ClientActionsSheet } from '@/components/clients/ClientActionsSheet';
import { useFeedbackEvaluation } from '@/hooks/useFeedbackEvaluation';


export default function ClientDetail() {
  usePageTracking('client_detail');
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const { data: creditTransactions = [] } = useCreditTransactions(id);
  const { data: sharedTransactions = [] } = useSharedBudgetTransactions(sharedBudgetInfo?.groupId);
  const { data: portalAccess } = useClientPortalAccess(id);
  const { evaluation: feedbackEval } = useFeedbackEvaluation(id);
  const redFlagCount = feedbackEval?.redFlagCount ?? 0;
  
  const updateClient = useUpdateClient();
  const archiveClient = useArchiveClient();
  const isMobile = useIsMobile();
  
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  // Derived data
  const isSharedBudget = sharedBudgetInfo?.isShared ?? false;
  const sharedBalance = sharedBudgetInfo?.sharedBalance ?? 0;
  const creditBalance = isSharedBudget ? sharedBalance : (client?.credit_balance || 0);

  // Sessions this month
  const sessionsThisMonth = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    return sessions.filter((s: any) => 
      s.status === 'completed' && isAfter(new Date(s.date), monthStart)
    ).length;
  }, [sessions]);

  // All transactions (personal + group if shared, deduplicated)
  const allTransactions = useMemo(() => {
    if (!isSharedBudget) return creditTransactions;
    
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

  const handleAddNote = async (note: string) => {
    const currentNotes = client.notes || '';
    const newNotes = currentNotes 
      ? `${currentNotes}\n\n[${format(new Date(), 'd.M.yyyy HH:mm')}]\n${note}`
      : `[${format(new Date(), 'd.M.yyyy HH:mm')}]\n${note}`;
    
    await updateClient.mutateAsync({ 
      id: client.id, 
      values: { notes: newNotes }
    });
    toast({ title: 'Poznámka uložena' });
  };

  const handleArchive = async () => {
    await archiveClient.mutateAsync({ 
      id: client.id, 
      is_archived: !client.is_archived
    });
  };

  const handleUpdateTrainingStartDate = async (date: string | null) => {
    const updated = await updateClient.mutateAsync({
      id: client.id,
      values: { training_start_date: date },
    });

    queryClient.setQueryData(["clients", client.id], updated);

    const saved = (updated as any)?.training_start_date ?? null;
    if (saved !== date) {
      toast({
        title: 'Datum se neuložilo',
        description: 'Zkuste to prosím ještě jednou.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Datum aktualizováno' });
  };

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

      {/* SECTION 1: Sticky Header */}
      <ClientHeaderCompact 
        client={client} 
        onUpdateTrainingStartDate={handleUpdateTrainingStartDate}
        redFlagCount={redFlagCount}
        lastPortalLogin={portalAccess?.last_portal_login}
      />

      {/* SECTION 2: Health Alert (if any) */}
      <ClientHealthAlert 
        clientId={client.id} 
        healthRestrictions={client.health_restrictions} 
      />

      {/* SECTION 3: Summary Strip - Credit + Stats */}
      <ClientSummaryStrip
        clientId={client.id}
        creditBalance={creditBalance}
        isSharedBudget={isSharedBudget}
        budgetGroupName={sharedBudgetInfo?.groupName}
        sessionsThisMonth={sessionsThisMonth}
        onAddCredit={() => setIsCreditModalOpen(true)}
        onAddTraining={() => setIsTrainingDialogOpen(true)}
      />

      {/* SECTION 4: Main Tabs */}
      <ClientDetailTabs
        client={client}
        sessions={sessions}
        transactions={allTransactions as any}
        isSharedBudget={isSharedBudget}
        budgetGroupId={sharedBudgetInfo?.groupId}
        budgetGroupName={sharedBudgetInfo?.groupName}
        onAddNote={handleAddNote}
        onArchive={handleArchive}
      />

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
