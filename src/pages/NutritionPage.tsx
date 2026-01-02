import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Utensils, 
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageTracking } from '@/hooks/useFeatureTracking';

// Import tab contents as components
import NutritionOverviewContent from '@/components/nutrition/tabs/NutritionOverviewTab';
import NutritionCampaignsContent from '@/components/nutrition/tabs/NutritionCampaignsTab';
import NutritionAnalysisContent from '@/components/nutrition/tabs/NutritionAnalysisTab';
import NutritionSettingsContent from '@/components/nutrition/tabs/NutritionSettingsTab';

const TABS = [
  { id: 'overview', label: 'Přehled', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Kampaně', icon: ClipboardList },
  { id: 'analysis', label: 'Analýza', icon: BarChart3 },
  { id: 'settings', label: 'Nastavení', icon: Settings },
] as const;

type TabId = typeof TABS[number]['id'];

export default function NutritionPage() {
  usePageTracking('nutrition');
  const navigate = useNavigate();
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Utensils className="h-6 w-6 text-primary" />
          Strava
        </h1>
        <p className="text-muted-foreground mt-1">
          Správa stravovacích kampaní a analýza dat
        </p>
      </div>

      {/* Main Card with Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b px-4">
              <TabsList className="h-12 bg-transparent gap-2">
                {TABS.map(tab => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="data-[state=active]:bg-muted gap-2"
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <NutritionOverviewContent />
              </TabsContent>
              
              <TabsContent value="campaigns" className="mt-0">
                <NutritionCampaignsContent />
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-0">
                <NutritionAnalysisContent />
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
