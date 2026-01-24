import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalUsageStats } from '@/components/client-portal/PortalUsageStats';
import { PortalRecentActivity } from '@/components/client-portal/PortalRecentActivity';
import { ClientAccessList } from '@/components/client-portal/ClientAccessList';
import { ClientPortalQuickSearch } from '@/components/client-portal/ClientPortalQuickSearch';
import { PortalPreviewButton } from '@/components/client-portal/PortalPreviewButton';
import { ClientWorkoutLogsOverview } from '@/components/client-portal/ClientWorkoutLogsOverview';
import { PortalLinkDropdown } from '@/components/client-portal/PortalLinkDropdown';
import { PortalActionRequired } from '@/components/client-portal/PortalActionRequired';
import { PortalSettingsTabs } from '@/components/client-portal/PortalSettingsTabs';
import { LayoutDashboard, Users, Settings, Info, BookOpen } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ClientPortalAdmin() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container max-w-6xl py-4 sm:py-6 space-y-4 sm:space-y-6 px-4">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg h-auto">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <Users className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Klienti</span>
          </TabsTrigger>
          <TabsTrigger value="diaries" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Deníky</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-3">
            <Settings className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline text-sm">Nastavení</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5 mt-6">
          {/* KPI Stats - 5 cards */}
          <PortalUsageStats />
          
          {/* Action Required */}
          <PortalActionRequired />
          
          {/* Two-column layout: Search + Activity */}
          <div className="grid lg:grid-cols-2 gap-5">
            <ClientPortalQuickSearch />
            <PortalRecentActivity />
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientAccessList />
        </TabsContent>

        <TabsContent value="diaries" className="mt-6">
          <ClientWorkoutLogsOverview />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <PortalSettingsTabs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
