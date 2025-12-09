import { useState } from 'react';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Stethoscope, TrendingUp, ClipboardList } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

// Import existing page content as components
import MeasurementsContent from '@/components/records/MeasurementsContent';
import DiagnosticsContent from '@/components/records/DiagnosticsContent';
import ProgressContent from '@/components/records/ProgressContent';

export default function Records() {
  usePageTracking('records');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'measurements';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-primary" />
            Záznamy klientů
          </h1>
          <p className="text-muted-foreground mt-1">
            Měření, diagnostika a tréninková progrese
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3 h-12">
          <TabsTrigger value="measurements" className="gap-2 data-[state=active]:bg-primary/10">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Měření</span>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2 data-[state=active]:bg-primary/10">
            <Stethoscope className="w-4 h-4" />
            <span className="hidden sm:inline">Diagnostika</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2 data-[state=active]:bg-primary/10">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Progres</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="measurements" className="mt-0">
          <MeasurementsContent />
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-0">
          <DiagnosticsContent />
        </TabsContent>

        <TabsContent value="progress" className="mt-0">
          <ProgressContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
