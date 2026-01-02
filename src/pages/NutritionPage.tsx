import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Utensils, 
  LayoutDashboard,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageTracking } from '@/hooks/useFeatureTracking';

// Import tab contents as components
import NutritionOverviewContent from '@/components/nutrition/tabs/NutritionOverviewTab';
import NutritionCampaignsContent from '@/components/nutrition/tabs/NutritionCampaignsTab';
import NutritionSettingsContent from '@/components/nutrition/tabs/NutritionSettingsTab';

const TABS = [
  { id: 'overview', label: 'Přehled', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Kampaně', icon: ClipboardList },
  { id: 'settings', label: 'Nastavení', icon: Settings },
] as const;

type TabId = typeof TABS[number]['id'];

export default function NutritionPage() {
  usePageTracking('nutrition');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get tab from URL or default to 'overview'
  const urlTab = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(t => t.id === urlTab) ? urlTab! : 'overview'
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId);
    setSearchParams({ tab });
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Strava
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Správa stravovacích kampaní
        </p>
      </div>

      {/* Main Card with Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b px-2 sm:px-4 overflow-x-auto scrollbar-hide">
              <TabsList className="h-11 sm:h-12 bg-transparent gap-1 sm:gap-2 w-max min-w-full sm:w-full">
                {TABS.map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="data-[state=active]:bg-muted gap-1.5 sm:gap-2 px-3 sm:px-4 shrink-0"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="p-3 sm:p-4 md:p-6">
              <TabsContent value="overview" className="mt-0">
                <NutritionOverviewContent />
              </TabsContent>
              
              <TabsContent value="campaigns" className="mt-0">
                <NutritionCampaignsContent />
              </TabsContent>
              
              <TabsContent value="settings" className="mt-0">
                <NutritionSettingsContent />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
