/**
 * ClientDetailTabs Component
 * 
 * Main tabbed navigation for client detail page.
 * Consolidates all sections into organized tabs:
 * - Tréninky (Trainings + History)
 * - Výkon (Performance, PRs, Load)
 * - Zdraví (Health, Diagnostics, Pain)
 * - Komunikace (Chat, Notes)
 * - Nastavení (Settings, Portal, Admin)
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Trophy, 
  Heart, 
  MessageSquare, 
  Settings,
  Activity,
  User,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AsymmetryCard } from '@/components/client-portal/progress/AsymmetryCard';

// Tab content components
import { ClientTrainingFinanceCard } from './ClientTrainingFinanceCard';
import { ClientPeriodizationCard } from './ClientPeriodizationCard';
import { ClientFeedbackAnalysisSection } from './ClientFeedbackAnalysisSection';
import { ClientTrainingLoadCard } from './ClientTrainingLoadCard';
import { ClientPRsCard } from './ClientPRsCard';
import { ClientTagAnalyticsCard } from './ClientTagAnalyticsCard';
import { ClientFeedbackRecovery } from './ClientFeedbackRecovery';

import { ClientDiagnosticsSection } from './ClientDiagnosticsSection';
import { ClientPainMapPreview } from './ClientPainMapPreview';
import { ClientInjuryHistory } from './ClientInjuryHistory';
import { ClientChatSection } from './ClientChatSection';
import { ClientNotesSection } from './ClientNotesSection';
import { ClientCommunicationLog } from './ClientCommunicationLog';
import { ClientFollowupHistory } from './ClientFollowupHistory';
import { ClientAdminBlock } from './ClientAdminBlock';
import { ClientPortalAccessSection } from '@/components/client-portal/ClientPortalAccessSection';
import { ClientProfileTab } from './ClientProfileTab';
import { useCommunicationMetrics, useHealthMetrics } from '@/hooks/useClientDashboardMetrics';
import { useFeedbackEvaluation } from '@/hooks/useFeedbackEvaluation';
import { Client } from '@/hooks/useClients';
import { ClientFormValues } from '@/lib/validations/client';

interface ClientDetailTabsProps {
  client: Client;
  sessions: any[];
  transactions: any[];
  isSharedBudget: boolean;
  budgetGroupId?: string;
  budgetGroupName?: string | null;
  onAddNote: (note: string) => Promise<void>;
  onArchive: () => Promise<void>;
  onUpdateClient?: (data: Partial<ClientFormValues>) => Promise<void>;
}

export function ClientDetailTabs({
  client,
  sessions,
  transactions,
  isSharedBudget,
  budgetGroupId,
  budgetGroupName,
  onAddNote,
  onArchive,
  onUpdateClient,
}: ClientDetailTabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    // Map URL tab param to internal tab id
    if (tabFromUrl === 'chat') return 'communication';
    return tabFromUrl || 'trainings';
  });

  // Sync URL when tab changes
  useEffect(() => {
    if (tabFromUrl === 'chat' && activeTab === 'communication') {
      // Clear URL param after navigating to chat
      setSearchParams({}, { replace: true });
    }
  }, [activeTab, tabFromUrl, setSearchParams]);
  
  // Metrics for badges
  const { unreadCount } = useCommunicationMetrics(client.id);
  const { activePains, hasHighSeverity } = useHealthMetrics(client.id);
  const { evaluation } = useFeedbackEvaluation(client.id);
  const redFlagCount = evaluation?.redFlagCount ?? 0;

  const tabs = [
    {
      id: 'profile',
      label: 'Profil',
      icon: User,
    },
    { 
      id: 'trainings', 
      label: 'Tréninky', 
      icon: Calendar,
      badge: sessions.filter(s => s.status === 'scheduled').length || undefined,
    },
    { 
      id: 'performance', 
      label: 'Výkon', 
      icon: Trophy,
      badge: redFlagCount > 0 ? redFlagCount : undefined,
      badgeVariant: 'warning' as const,
    },
    { 
      id: 'health', 
      label: 'Zdraví', 
      icon: Heart,
      badge: activePains > 0 ? activePains : undefined,
      badgeVariant: hasHighSeverity ? 'destructive' as const : 'warning' as const,
    },
    { 
      id: 'communication', 
      label: 'Zprávy', 
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeVariant: 'destructive' as const,
    },
    { 
      id: 'settings', 
      label: 'Nastavení', 
      icon: Settings,
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      {/* Tab Navigation - horizontal scroll on mobile */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <TabsList className="w-max sm:w-full h-auto flex justify-start gap-1 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-sm font-medium transition-all shrink-0",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                "data-[state=inactive]:bg-secondary/50 data-[state=inactive]:text-muted-foreground",
                "data-[state=inactive]:hover:bg-secondary"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-xs sm:text-sm">{tab.label}</span>
              {tab.badge && (
                <Badge 
                  variant={tab.badgeVariant === 'destructive' ? 'destructive' : 'secondary'}
                  className={cn(
                    "h-5 min-w-5 px-1 text-[10px]",
                    tab.badgeVariant === 'warning' && "bg-warning/20 text-warning border-warning/30"
                  )}
                >
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Tab: Profile */}
      <TabsContent value="profile" className="mt-0 space-y-4">
        <ClientProfileTab client={client} onUpdateClient={onUpdateClient} />
      </TabsContent>

      {/* Tab: Trainings */}
      <TabsContent value="trainings" className="mt-0 space-y-4">
        {/* Periodization */}
        <ClientPeriodizationCard clientId={client.id} defaultOpen={false} />
        
        {/* Training & Finance History */}
        <ClientTrainingFinanceCard
          clientId={client.id}
          sessions={sessions}
          transactions={transactions}
          isSharedBudget={isSharedBudget}
          budgetGroupName={budgetGroupName}
        />
      </TabsContent>

      {/* Tab: Performance */}
      <TabsContent value="performance" className="mt-0 space-y-4">
        {/* Training Load & RPE */}
        <ClientTrainingLoadCard clientId={client.id} />
        
        {/* Feedback Analysis */}
        <ClientFeedbackAnalysisSection clientId={client.id} defaultOpen={true} />
        
        {/* Asymmetry L vs R */}
        <AsymmetryCard clientId={client.id} />
        
        {/* PRs */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Osobní rekordy
          </h3>
          <ClientPRsCard clientId={client.id} />
        </div>
        
        {/* Tag Analytics */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Analytika tréninků
          </h3>
          <ClientTagAnalyticsCard clientId={client.id} />
        </div>
        
        {/* Recovery */}
        <ClientFeedbackRecovery clientId={client.id} />
      </TabsContent>

      {/* Tab: Health */}
      <TabsContent value="health" className="mt-0 space-y-4">
        {/* Diagnostics (without pre-diagnostic - it's in Profile tab) */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Diagnostika
          </h3>
          <ClientDiagnosticsSection clientId={client.id} clientName={client.name} />
        </div>
        
        {/* Pain Map */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Mapa bolesti</h3>
          <ClientPainMapPreview clientId={client.id} />
        </div>
        
        {/* Injury History */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Historie zranění</h3>
          <ClientInjuryHistory clientId={client.id} />
        </div>
      </TabsContent>

      {/* Tab: Communication */}
      <TabsContent value="communication" className="mt-0 space-y-4">
        {/* Followup History */}
        <ClientFollowupHistory clientId={client.id} />
        
        {/* Chat */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Chat s klientem
          </h3>
          <ClientChatSection clientId={client.id} clientName={client.name} />
        </div>
        
        {/* Notes */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Poznámky</h3>
          <ClientNotesSection notes={client.notes} onAddNote={onAddNote} />
        </div>
        
        {/* Call Log */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Log hovorů</h3>
          <ClientCommunicationLog clientId={client.id} />
        </div>
      </TabsContent>

      {/* Tab: Settings */}
      <TabsContent value="settings" className="mt-0 space-y-4">
        {/* Portal Access */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Klientský portál
          </h3>
          <ClientPortalAccessSection
            clientId={client.id}
            clientName={client.name}
            clientEmail={client.email}
            showSettings={true}
          />
        </div>
        
        {/* Admin Settings */}
        <ClientAdminBlock
          client={client}
          isSharedBudget={isSharedBudget}
          budgetGroupId={budgetGroupId}
          onArchive={onArchive}
          defaultExpanded={true}
        />
      </TabsContent>
    </Tabs>
  );
}
