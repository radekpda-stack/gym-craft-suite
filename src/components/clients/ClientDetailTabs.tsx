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
import { useState } from 'react';
import { 
  Calendar, 
  Trophy, 
  Heart, 
  MessageSquare, 
  Settings,
  Activity,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Tab content components
import { ClientTrainingFinanceCard } from './ClientTrainingFinanceCard';
import { ClientPeriodizationCard } from './ClientPeriodizationCard';
import { ClientFeedbackAnalysisSection } from './ClientFeedbackAnalysisSection';
import { ClientTrainingLoadCard } from './ClientTrainingLoadCard';
import { ClientPRsCard } from './ClientPRsCard';
import { ClientTagAnalyticsCard } from './ClientTagAnalyticsCard';
import { ClientFeedbackRecovery } from './ClientFeedbackRecovery';
import { ClientPreDiagnosticSection } from './ClientPreDiagnosticSection';
import { ClientDiagnosticsSection } from './ClientDiagnosticsSection';
import { ClientPainMapPreview } from './ClientPainMapPreview';
import { ClientInjuryHistory } from './ClientInjuryHistory';
import { ClientChatSection } from './ClientChatSection';
import { ClientNotesSection } from './ClientNotesSection';
import { ClientCommunicationLog } from './ClientCommunicationLog';
import { ClientAdminBlock } from './ClientAdminBlock';
import { ClientPortalAccessSection } from '@/components/client-portal/ClientPortalAccessSection';
import { useCommunicationMetrics, useHealthMetrics } from '@/hooks/useClientDashboardMetrics';
import { useFeedbackEvaluation } from '@/hooks/useFeedbackEvaluation';
import { Client } from '@/hooks/useClients';

interface ClientDetailTabsProps {
  client: Client;
  sessions: any[];
  transactions: any[];
  isSharedBudget: boolean;
  budgetGroupId?: string;
  budgetGroupName?: string | null;
  onAddNote: (note: string) => Promise<void>;
  onArchive: () => Promise<void>;
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
}: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('trainings');
  
  // Metrics for badges
  const { unreadCount } = useCommunicationMetrics(client.id);
  const { activePains, hasHighSeverity } = useHealthMetrics(client.id);
  const { evaluation } = useFeedbackEvaluation(client.id);
  const redFlagCount = evaluation?.redFlagCount ?? 0;

  const tabs = [
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
                    tab.badgeVariant === 'warning' && "bg-amber-500/20 text-amber-600 border-amber-500/30"
                  )}
                >
                  {tab.badge}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

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
        {/* Pre-diagnostics */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Diagnostika
          </h3>
          <ClientPreDiagnosticSection clientId={client.id} clientName={client.name} />
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
