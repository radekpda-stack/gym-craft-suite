import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalUsageStats } from '@/components/client-portal/PortalUsageStats';
import { PortalRecentActivity } from '@/components/client-portal/PortalRecentActivity';
import { ClientAccessList } from '@/components/client-portal/ClientAccessList';
import { PortalVisibilitySettings } from '@/components/client-portal/PortalVisibilitySettings';
import { PortalPreviewButton } from '@/components/client-portal/PortalPreviewButton';
import { ClientPortalSettingsPage } from '@/components/client-portal/ClientPortalSettingsPage';
import { ClientWorkoutLogsOverview } from '@/components/client-portal/ClientWorkoutLogsOverview';
import { QRCodeDisplay } from '@/components/client-portal/QRCodeDisplay';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Settings, Info, BookOpen, Copy, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

export default function ClientPortalAdmin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const loginUrl = `${window.location.origin}/login?mode=client`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(loginUrl);
    setCopied(true);
    toast.success('Odkaz zkopírován');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container max-w-6xl py-4 sm:py-6 space-y-4 sm:space-y-6 px-4">
      {/* Quick copy link */}
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        <code className="text-sm flex-1 truncate text-muted-foreground">{loginUrl}</code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="shrink-0 gap-1.5"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="hidden sm:inline">Zkopírováno</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Kopírovat odkaz</span>
            </>
          )}
        </Button>
        <QRCodeDisplay url={loginUrl} />
      </div>

      {/* Header */}
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
        
        <PortalPreviewButton />
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

        <TabsContent value="overview" className="space-y-6 mt-6">
          <PortalUsageStats />
          {/* Stack vertically for better readability on all devices */}
          <div className="space-y-6">
            <ClientAccessList />
            <PortalRecentActivity />
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientAccessList />
        </TabsContent>

        <TabsContent value="diaries" className="mt-6">
          <ClientWorkoutLogsOverview />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          {/* Global visibility settings */}
          <div className="max-w-2xl">
            <PortalVisibilitySettings />
          </div>
          
          {/* Per-client settings */}
          <ClientPortalSettingsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
