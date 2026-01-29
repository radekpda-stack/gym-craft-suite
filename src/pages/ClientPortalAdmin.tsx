import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientAccessList } from '@/components/client-portal/ClientAccessList';
import { ClientPortalQuickSearch } from '@/components/client-portal/ClientPortalQuickSearch';
import { PortalPreviewButton } from '@/components/client-portal/PortalPreviewButton';
import { ClientWorkoutLogsOverview } from '@/components/client-portal/ClientWorkoutLogsOverview';
import { PortalLinkDropdown } from '@/components/client-portal/PortalLinkDropdown';
import { PortalActionRequired } from '@/components/client-portal/PortalActionRequired';
import { PortalSettingsTabs } from '@/components/client-portal/PortalSettingsTabs';
import { PortalRecentActivity } from '@/components/client-portal/PortalRecentActivity';
import { LayoutDashboard, Users, Settings, Info, BookOpen, UserCheck, Calendar, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePortalStats, usePortalClients } from '@/hooks/useClientPortalAdmin';
import { differenceInDays } from 'date-fns';
import { UnifiedKPICards } from '@/components/shared';
import type { KPICardConfig } from '@/components/shared';

export default function ClientPortalAdmin() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: stats, isLoading: statsLoading } = usePortalStats();
  const { data: clients, isLoading: clientsLoading } = usePortalClients();

  const isLoading = statsLoading || clientsLoading;

  // Calculate clients needing attention (inactive 7+ days)
  const now = new Date();
  const needsAttentionCount = clients?.filter((client) => {
    if (!client.is_active || !client.auth_user_id) return false;
    if (!client.last_portal_login) return true;
    return differenceInDays(now, new Date(client.last_portal_login)) >= 7;
  }).length || 0;

  // Calculate active percentage
  const activePercent = stats?.totalClients 
    ? Math.round((stats.activeThisWeek / stats.totalClients) * 100)
    : 0;

  // KPI Cards configuration - unified design
  const kpiCards: KPICardConfig[] = [
    {
      id: 'total',
      label: 'Celkem klientů',
      value: stats?.totalClients || 0,
      icon: Users,
      variant: 'accent',
    },
    {
      id: 'today',
      label: 'Aktivní dnes',
      value: stats?.activeToday || 0,
      icon: UserCheck,
      variant: 'success',
    },
    {
      id: 'week',
      label: 'Aktivní tento týden',
      value: `${activePercent}%`,
      subLabel: `${stats?.activeThisWeek || 0} z ${stats?.totalClients || 0}`,
      icon: Calendar,
      variant: 'warning',
    },
    {
      id: 'attention',
      label: 'Vyžaduje pozornost',
      value: needsAttentionCount,
      subLabel: 'neaktivní 7+ dní',
      icon: AlertTriangle,
      variant: needsAttentionCount > 0 ? 'destructive' : 'muted',
    },
  ];

  return (
    <div className="container max-w-6xl py-4 sm:py-6 space-y-4 sm:space-y-5 px-4">
      {/* Header - Compact with dropdown for link */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Klientský portál</h1>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Klientský portál umožňuje vašim klientům sledovat jejich pokrok, 
                  docházku a kredit. Pozvěte klienty a nastavte, co mohou vidět.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground text-sm">
            Spravujte přístup klientů a sledujte jejich aktivitu
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <PortalLinkDropdown />
          <PortalPreviewButton />
        </div>
      </div>

      {/* KPI Cards - Unified */}
      <UnifiedKPICards 
        cards={kpiCards}
        isLoading={isLoading}
      />

      {/* Tabs - Simplified (removed Deníky tab, integrated into overview) */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <Users className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Klienti</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <Settings className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Nastavení</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 mt-6">
          {/* Action Required */}
          <PortalActionRequired />
          
          {/* Two-column layout: Main content + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main content - 2/3 */}
            <div className="lg:col-span-2 space-y-5">
              <ClientPortalQuickSearch />
              
              {/* Workout Logs - Moved from separate tab */}
              <ClientWorkoutLogsOverview />
            </div>
            
            {/* Sidebar - 1/3 */}
            <div className="space-y-5">
              <PortalRecentActivity />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientAccessList />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <PortalSettingsTabs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
