import { useState, useRef } from 'react';
import { Download, Image, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { useSocialMediaExportData } from '@/hooks/useSocialMediaExportData';
import { SocialCardPreview } from './social-export/SocialCardPreview';
import { MetricsSelector } from './social-export/MetricsSelector';
import { ExportSettingsForm } from './social-export/ExportSettingsForm';
import { TemplateSelector } from './social-export/TemplateSelector';
import { LeaderboardExport } from './social-export/LeaderboardExport';
import { exportCardAsImage } from '@/lib/socialCardExport';
import type { ExportSettings } from '@/types/socialExport';

export function SocialMediaExport() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const isCs = language === 'cs';

  const [activeTab, setActiveTab] = useState<'stats' | 'leaderboards'>('leaderboards');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'activeClients', 'trainingsThisMonth', 'hoursThisMonth', 'prsThisMonth'
  ]);

  const [settings, setSettings] = useState<ExportSettings>({
    period: 'month',
    format: 'instagram-post',
    theme: 'dark',
    showLogo: true,
    showTrainerName: true,
    showSocialHandle: false,
    trainerName: '',
    socialHandle: '',
  });

  const { data, isLoading } = useSocialMediaExportData({ period: settings.period });

  const handleExport = async () => {
    try {
      await exportCardAsImage(cardRef, {
        format: settings.format,
        filename: `statistiky-${settings.period}-${Date.now()}.png`,
      });
      toast({
        title: isCs ? 'Export úspěšný' : 'Export successful',
        description: isCs ? 'Obrázek byl stažen' : 'Image has been downloaded',
      });
    } catch (error) {
      toast({
        title: isCs ? 'Chyba exportu' : 'Export error',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const handleTemplateSelect = (metrics: string[]) => {
    setSelectedMetrics(metrics);
  };

  return (
    <div className="space-y-6">
      {/* Main mode selector */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'stats' | 'leaderboards')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leaderboards" className="gap-2">
            <Trophy className="w-4 h-4" />
            {isCs ? 'Žebříčky' : 'Leaderboards'}
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <Image className="w-4 h-4" />
            {isCs ? 'Statistiky' : 'Statistics'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboards" className="mt-6">
          <LeaderboardExport />
        </TabsContent>

        <TabsContent value="stats" className="mt-6 space-y-6">
          {/* Stats sub-tabs */}
          <Tabs defaultValue="custom" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
                {isCs ? 'Šablony' : 'Templates'}
              </TabsTrigger>
              <TabsTrigger value="custom">
                {isCs ? 'Vlastní' : 'Custom'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-4">
              <TemplateSelector 
                onSelectTemplate={handleTemplateSelect} 
                language={language} 
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-4 space-y-4">
              <MetricsSelector
                selectedMetrics={selectedMetrics}
                onMetricsChange={setSelectedMetrics}
                language={language}
              />
            </TabsContent>
          </Tabs>

          <ExportSettingsForm
            settings={settings}
            onSettingsChange={setSettings}
            language={language}
          />

          {/* Preview */}
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {isCs ? 'Náhled' : 'Preview'}
            </p>
            <div className="bg-muted/30 rounded-xl p-4">
              <SocialCardPreview
                ref={cardRef}
                data={data || null}
                selectedMetrics={selectedMetrics}
                settings={settings}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleExport} 
              disabled={isLoading || selectedMetrics.length === 0}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              {isCs ? 'Stáhnout PNG' : 'Download PNG'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
