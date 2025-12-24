import { usePageTracking } from '@/hooks/useFeatureTracking';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, DollarSign, Dumbbell, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinanceStatsSection } from '@/components/statistics/FinanceStatsSection';
import { ExerciseStatsSection } from '@/components/statistics/ExerciseStatsSection';
import { ClientStatsSection } from '@/components/statistics/ClientStatsSection';

export default function Statistics() {
  usePageTracking('statistics');

  return (
    <div className="min-h-screen animate-fade-in px-4 sm:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6">
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

      {/* Category Tabs */}
      <Tabs defaultValue="finance" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1 mb-6">
          <TabsTrigger value="finance" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Dumbbell className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Cviky</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center justify-center gap-1.5 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Klienti</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <FinanceStatsSection />
        </TabsContent>

        <TabsContent value="exercises" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <ExerciseStatsSection />
        </TabsContent>

        <TabsContent value="clients" className="mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <ClientStatsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
