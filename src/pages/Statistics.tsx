import { useState } from 'react';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, DollarSign, Users, Activity, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceStatsSection } from '@/components/statistics/FinanceStatsSection';
import { ClientStatsSection } from '@/components/statistics/ClientStatsSection';
import { TrainingStatsSection } from '@/components/statistics/TrainingStatsSection';
import { CareerStatsSection } from '@/components/statistics/CareerStatsSection';
import { StatsPeriodSelector, StatsPeriodRange, getDefaultPeriodRange } from '@/components/statistics/StatsPeriodSelector';

export default function Statistics() {
  usePageTracking('statistics');
  
  const [periodRange, setPeriodRange] = useState<StatsPeriodRange>(getDefaultPeriodRange('1y'));

  return (
    <div className="min-h-screen animate-fade-in px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <span className="truncate">Statistiky</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Kompletní přehled vaší práce
          </p>
        </div>
      </div>

      {/* Period Selector - Global for all tabs */}
      <div className="mb-4">
        <StatsPeriodSelector value={periodRange} onChange={setPeriodRange} />
      </div>

      {/* Category Tabs - 4 categories only */}
      <Tabs defaultValue="career" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto p-1 mb-6">
          <TabsTrigger value="career" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Trophy className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Kariéra</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="trainings" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tréninky</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Klienti</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="career" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <CareerStatsSection periodRange={periodRange} />
        </TabsContent>

        <TabsContent value="finance" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <FinanceStatsSection periodRange={periodRange} />
        </TabsContent>

        <TabsContent value="trainings" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <TrainingStatsSection periodRange={periodRange} />
        </TabsContent>

        <TabsContent value="clients" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <ClientStatsSection periodRange={periodRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
