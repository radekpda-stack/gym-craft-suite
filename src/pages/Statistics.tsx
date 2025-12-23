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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Statistiky
          </h1>
          <p className="text-sm text-muted-foreground">
            Kompletní přehled vaší práce v číslech a grafech
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="finance" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          <TabsTrigger value="finance" className="flex items-center gap-2 py-3">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Finance</span>
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center gap-2 py-3">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Cviky</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2 py-3">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Klienti</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="mt-6">
          <FinanceStatsSection />
        </TabsContent>

        <TabsContent value="exercises" className="mt-6">
          <ExerciseStatsSection />
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientStatsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
