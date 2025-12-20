import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { useClient, useUpdateClient, useUpdateClientFeedback } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { useCreditTransactions } from '@/hooks/useCreditTransactions';
import { ClientFormValues } from '@/lib/validations/client';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { ClientDetailSkeleton } from '@/components/skeletons';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { ClientDetailView } from '@/components/clients/ClientDetailView';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { STATUS_CONFIG, getCreditStatus } from '@/lib/statusUtils';

// Block Components
import { ClientStatusBar } from '@/components/clients/ClientStatusBar';
import { ClientActionsBar } from '@/components/clients/ClientActionsBar';
import { ClientActionsSheet } from '@/components/clients/ClientActionsSheet';
import { ClientEvaluationBlock } from '@/components/clients/ClientEvaluationBlock';
import { ClientHistoryBlock } from '@/components/clients/ClientHistoryBlock';
import { ClientAdminBlock } from '@/components/clients/ClientAdminBlock';
import { ClientAttendanceStats } from '@/components/clients/ClientAttendanceStats';
import { ClientTrainingCountCard } from '@/components/clients/ClientTrainingCountCard';
import { ClientLTVCard } from '@/components/clients/ClientLTVCard';
import { ClientHeroCard } from '@/components/clients/ClientHeroCard';
import { CollapsibleSection } from '@/components/dashboard/CollapsibleSection';

import { toast } from '@/hooks/use-toast';

export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: allSessions = [] } = useTrainingSessions(id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(id);
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(id);
  const { data: transactions = [] } = useCreditTransactions(id);
  const updateClient = useUpdateClient();
  const updateFeedback = useUpdateClientFeedback();
  const isMobile = useIsMobile();
  
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);

  // Cast sessions to proper type
  const clientSessions = allSessions.map(s => ({
    ...s,
    status: s.status as 'scheduled' | 'completed' | 'canceled'
  }));

  if (clientLoading) {
    return <ClientDetailSkeleton />;
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Klient nenalezen
          </h2>
          <Link to="/clients" className="text-primary mt-2 inline-block">
            Zpět na seznam klientů
          </Link>
        </div>
      </div>
    );
  }

  const completedSessions = clientSessions.filter(s => s.status === 'completed');
  const scheduledSessions = clientSessions.filter(s => s.status === 'scheduled');
  
  // Shared budget info
  const isSharedBudget = sharedBudgetInfo?.isShared ?? false;
  const sharedBalance = sharedBudgetInfo?.sharedBalance ?? 0;
  const sharedBudgetName = sharedBudgetInfo?.groupName ?? undefined;
  const creditBalance = isSharedBudget ? sharedBalance : (client.credit_balance || 0);
  
  // Unpaid stats
  const unpaidCount = unpaidTrainings.length;
  
  // Last training date
  const lastCompletedSession = completedSessions[0];
  const lastTrainingDate = lastCompletedSession 
    ? format(new Date(lastCompletedSession.date), 'd.M.yyyy', { locale: cs })
    : undefined;
  
  // Check feedback and nutrition status (simplified)
  const hasFeedback = true; // Would need to check actual feedback status
  const hasNutrition = true; // Would need to check actual nutrition status

  // Credit status for mobile header
  const creditStatus = getCreditStatus(creditBalance, unpaidCount > 0);
  const statusConfig = STATUS_CONFIG[creditStatus];

  /** Handle client data save */
  const handleSaveClient = async (data: ClientFormValues) => {
    await updateClient.mutateAsync({ id: client.id, values: data });
  };
  
  const handleAddNote = async (note: string) => {
    // Append note to client notes
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

  return (
    <div className="space-y-4 animate-fade-in pb-24 sm:pb-4">
      {/* Mobile compact header */}
      {isMobile ? (
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-lg border-b border-border/50">
          <div className="flex items-center gap-3">
            <Link to="/clients" className="p-2 -ml-2 rounded-full hover:bg-secondary/50">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-foreground truncate flex-1">{client.name}</span>
            <div className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold shrink-0',
              statusConfig.bgClass,
              statusConfig.textClass
            )}>
              {formatCurrency(creditBalance)}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Breadcrumbs */}
          <PageBreadcrumbs
            items={[
              { label: 'Klienti', href: '/clients' },
              { label: client.name },
            ]}
          />

          {/* Desktop Status Bar */}
          <ClientStatusBar
            client={client}
            creditBalance={creditBalance}
            isSharedBudget={isSharedBudget}
            sharedBudgetName={sharedBudgetName}
            lastTrainingDate={lastTrainingDate}
            hasFeedback={hasFeedback}
            hasNutrition={hasNutrition}
            unpaidCount={unpaidCount}
          />
        </>
      )}

      {/* Mobile Hero Card */}
      {isMobile && (
        <ClientHeroCard
          client={client}
          creditBalance={creditBalance}
          unpaidCount={unpaidCount}
          lastTrainingDate={lastTrainingDate}
          isSharedBudget={isSharedBudget}
          sharedBudgetName={sharedBudgetName}
        />
      )}

      {/* Desktop Quick Actions (hidden on mobile - replaced by FAB) */}
      {!isMobile && (
        <ClientActionsBar
          client={client}
          lastCompletedTrainingId={lastCompletedSession?.id}
          isSharedBudget={isSharedBudget}
          budgetGroupId={sharedBudgetInfo?.groupId}
          onAddTraining={() => setIsTrainingDialogOpen(true)}
          onAddNote={handleAddNote}
        />
      )}

      {/* Evaluation Block - desktop only (mobile shows in hero) */}
      {!isMobile && (
        <ClientEvaluationBlock
          clientId={client.id}
          onViewFeedback={() => {
            const root = document.querySelector('[data-client-history-root]');
            const trigger = document.querySelector('[data-history-tab="feedback"]');
            if (root) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (trigger) setTimeout(() => (trigger as HTMLButtonElement).click(), 150);
          }}
          onViewNutrition={() => {
            const root = document.querySelector('[data-client-history-root]');
            const trigger = document.querySelector('[data-history-tab="nutrition"]');
            if (root) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (trigger) setTimeout(() => (trigger as HTMLButtonElement).click(), 150);
          }}
        />
      )}

      {/* History Block - Main content */}
      <ClientHistoryBlock clientId={client.id} notes={client.notes} />

      {/* Statistics Section - collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Statistiky">
          <ClientTrainingCountCard clientId={client.id} />
          <ClientLTVCard clientId={client.id} />
          <ClientAttendanceStats clientId={client.id} />
        </CollapsibleSection>
      ) : (
        <>
          <ClientTrainingCountCard clientId={client.id} />
          <ClientLTVCard clientId={client.id} />
          <ClientAttendanceStats clientId={client.id} />
        </>
      )}

      {/* Administration Section - collapsible on mobile */}
      {isMobile ? (
        <CollapsibleSection title="Administrativa">
          <ClientAdminBlock
            client={client}
            creditBalance={creditBalance}
            isSharedBudget={isSharedBudget}
            budgetGroupId={sharedBudgetInfo?.groupId}
            onArchive={handleArchive}
          />
          <div className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setShowClientDetails(!showClientDetails)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            >
              <span className="font-medium text-sm">Profil klienta</span>
              <span className="text-xs text-muted-foreground">
                {showClientDetails ? 'Skrýt' : 'Zobrazit'}
              </span>
            </button>
            {showClientDetails && (
              <div className="p-4 pt-0">
                <ClientDetailView
                  client={client}
                  onSave={handleSaveClient}
                  isLoading={updateClient.isPending}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>
      ) : (
        <>
          <ClientAdminBlock
            client={client}
            creditBalance={creditBalance}
            isSharedBudget={isSharedBudget}
            budgetGroupId={sharedBudgetInfo?.groupId}
            onArchive={handleArchive}
          />
          <div className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setShowClientDetails(!showClientDetails)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
            >
              <span className="font-medium text-sm">Profil klienta</span>
              <span className="text-xs text-muted-foreground">
                {showClientDetails ? 'Skrýt' : 'Zobrazit'}
              </span>
            </button>
            {showClientDetails && (
              <div className="p-4 pt-0">
                <ClientDetailView
                  client={client}
                  onSave={handleSaveClient}
                  isLoading={updateClient.isPending}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Mobile FAB + Bottom Sheet */}
      {isMobile && (
        <ClientActionsSheet
          client={client}
          lastCompletedTrainingId={lastCompletedSession?.id}
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
      />
    </div>
  );
}
