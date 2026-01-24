import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PortalVisibilitySettings } from './PortalVisibilitySettings';
import { ClientPortalSettingsPage } from './ClientPortalSettingsPage';
import { Globe, User, AlertCircle } from 'lucide-react';

export function PortalSettingsTabs() {
  const [activeTab, setActiveTab] = useState('global');

  return (
    <div className="space-y-4">
      {/* Explanation card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Jak nastavení funguje?</p>
              <p className="text-muted-foreground mt-1">
                <strong>Globální nastavení</strong> platí pro všechny klienty jako výchozí. 
                <strong> Individuální nastavení</strong> přepisuje globální pro konkrétního klienta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="global" className="gap-2">
            <Globe className="w-4 h-4" />
            Globální nastavení
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <User className="w-4 h-4" />
            Pro klienta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-6">
          <div className="max-w-2xl">
            <PortalVisibilitySettings />
          </div>
        </TabsContent>

        <TabsContent value="individual" className="mt-6">
          <ClientPortalSettingsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
