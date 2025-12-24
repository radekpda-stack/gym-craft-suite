import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { useClient, useUpdateClient } from '@/hooks/useClients';
import { useUnpaidTrainings } from '@/hooks/useUnpaidTrainings';
import { useSharedBudgetBalance } from '@/hooks/useSharedBudgetBalance';
import { ClientFormValues } from '@/lib/validations/client';
import { PageBreadcrumbs } from '@/components/ui/page-breadcrumbs';
import { ClientDetailSkeleton } from '@/components/skeletons';
import { CreateTrainingDialog } from '@/components/trainings/CreateTrainingDialog';
import { UnifiedCreditModal } from '@/components/credit/UnifiedCreditModal';
import { ClientDetailView } from '@/components/clients/ClientDetailView';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { STATUS_CONFIG, getCreditStatus } from '@/lib/statusUtils';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { toast } from '@/hooks/use-toast';

// Client card components
import { ClientStatusBlock } from '@/components/clients/ClientStatusBlock';
import { ClientActionHub } from '@/components/clients/ClientActionHub';
import { ClientHistoryCollapsed } from '@/components/clients/ClientHistoryCollapsed';
import { ClientActionsSheet } from '@/components/clients/ClientActionsSheet';
import { ClientAdminBlock } from '@/components/clients/ClientAdminBlock';
import { ClientPersonalInfo } from '@/components/clients/ClientPersonalInfo';
import { ClientDiagnosticsSection } from '@/components/clients/ClientDiagnosticsSection';
import { ClientMeasurementsCard } from '@/components/clients/ClientMeasurementsCard';
import { ClientNutritionCard } from '@/components/clients/ClientNutritionCard';
import { ClientNotesSection } from '@/components/clients/ClientNotesSection';
import { ClientMediaGallery } from '@/components/clients/ClientMediaGallery';
import { ClientFinanceCard } from '@/components/clients/ClientFinanceCard';
import { ClientFeedbackCard } from '@/components/clients/ClientFeedbackCard';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';

export default function ClientDetail() {
  usePageTracking('client_detail');
  const { id } = useParams();
  const { data: client, isLoading: clientLoading } = useClient(id);
  const { data: unpaidTrainings = [] } = useUnpaidTrainings(id);
  const { data: sharedBudgetInfo } = useSharedBudgetBalance(id);
  const { data: sessions = [] } = useTrainingSessions(id);
  const updateClient = useUpdateClient();
  const isMobile = useIsMobile();
  
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);

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

  // Credit status for mobile header
  const creditStatus = getCreditStatus(creditBalance, unpaidCount > 0);
  const statusConfig = STATUS_CONFIG[creditStatus];

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

  return (
    <div className="space-y-4 animate-fade-in pb-24 sm:pb-4">
      {/* Mobile compact header */}
      {isMobile && (
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
            {client.payment_mode !== 'cash_only' && (
              <div className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold shrink-0',
                statusConfig.bgClass,
                statusConfig.textClass
              )}>
                {formatCurrency(creditBalance)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Breadcrumbs */}
      {!isMobile && (
        <PageBreadcrumbs
          items={[
            { label: 'Klienti', href: '/clients' },
            { label: client.name },
          ]}
        />
      )}

      {/* 🔴 Section 1: Immediate Status Block with contact info */}
      <ClientStatusBlock client={client} creditBalance={creditBalance} />

      {/* 🔵 Section 2: Dominant CTA + Quick Actions */}
      <ClientActionHub
        client={client}
        creditBalance={creditBalance}
        onAddNote={handleAddNote}
        onAddTraining={() => setIsTrainingDialogOpen(true)}
        onAddCredit={() => setIsCreditModalOpen(true)}
      />

      {/* 👤 Section 3: Personal Info */}
      <ClientPersonalInfo client={client} />

      {/* 🩺 Section 4: Health & Diagnostics */}
      <ClientDiagnosticsSection clientId={client.id} clientName={client.name} />
      <ClientMeasurementsCard clientId={client.id} />

      {/* 📆 Section 5: Training History & Feedback */}
      <ClientHistoryCollapsed clientId={client.id} notes={client.notes} />
      <div data-section="feedback">
        <ClientFeedbackCard 
          clientId={client.id} 
          clientName={client.name}
          lastCompletedTrainingId={sessions.find((s: any) => s.status === 'completed')?.id}
        />
      </div>
      <ClientNutritionCard clientId={client.id} clientName={client.name} />

      {/* 📝 Section 6: Notes & Media */}
      <ClientNotesSection notes={client.notes} onAddNote={handleAddNote} />
      <ClientMediaGallery clientId={client.id} />

      {/* 💰 Section 7: Finance */}
      <ClientFinanceCard
        clientId={client.id}
        creditBalance={creditBalance}
        isSharedBudget={isSharedBudget}
        budgetGroupName={sharedBudgetInfo?.groupName}
      />

      {/* ⚙️ Admin/Settings Section */}
      <ClientAdminBlock
        client={client}
        isSharedBudget={isSharedBudget}
        budgetGroupId={sharedBudgetInfo?.groupId}
        onArchive={handleArchive}
        defaultExpanded={false}
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
      />
    </div>
  );
}
