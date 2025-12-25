import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalUsageStats } from '@/components/client-portal/PortalUsageStats';
import { PortalRecentActivity } from '@/components/client-portal/PortalRecentActivity';
import { ClientAccessList } from '@/components/client-portal/ClientAccessList';
import { PortalVisibilitySettings } from '@/components/client-portal/PortalVisibilitySettings';
import { PortalPreviewButton } from '@/components/client-portal/PortalPreviewButton';
import { LayoutDashboard, Users, Settings, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function ClientPortalAdmin() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Klientský portál</h1>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Klientský portál umožňuje vašim klientům sledovat jejich pokrok, 
                  docházku a kredit. Pozvěte klienty a nastavte, co mohou vidět.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground">
            Spravujte přístup klientů a sledujte jejich aktivitu
          </p>
        </div>
        
        <PortalPreviewButton />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Přehled</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Klienti</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Nastavení</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <PortalUsageStats />
          <div className="grid lg:grid-cols-2 gap-6">
            <PortalRecentActivity />
            <ClientAccessList />
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientAccessList />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="max-w-2xl">
            <PortalVisibilitySettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
