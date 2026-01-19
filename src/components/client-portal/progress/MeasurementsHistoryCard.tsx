import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Scale, ChevronRight, Calendar, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { MeasurementDetailCard } from './MeasurementDetailCard';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Measurement {
  id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  basal_metabolism: number | null;
  visceral_fat: number | null;
  bmi: number | null;
  water_percent: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  notes: string | null;
}

function MeasurementListItem({ 
  measurement, 
  previousMeasurement,
  onClick 
}: { 
  measurement: Measurement; 
  previousMeasurement?: Measurement | null;
  onClick: () => void;
}) {
  const measurementDate = parseISO(measurement.date);
  
  // Calculate weight trend
  const weightTrend = (() => {
    if (!previousMeasurement?.weight || !measurement.weight) return null;
    const diff = measurement.weight - previousMeasurement.weight;
    if (Math.abs(diff) < 0.1) return 'same';
    return diff > 0 ? 'up' : 'down';
  })();

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Scale className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">
            {format(measurementDate, 'd. MMMM yyyy', { locale: cs })}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {measurement.weight && (
              <span className="flex items-center gap-1">
                {measurement.weight} kg
                {weightTrend === 'up' && <TrendingUp className="w-3 h-3 text-orange-500" />}
                {weightTrend === 'down' && <TrendingDown className="w-3 h-3 text-green-500" />}
                {weightTrend === 'same' && <Minus className="w-3 h-3 text-muted-foreground" />}
              </span>
            )}
            {measurement.body_fat_percentage && (
              <span>• {measurement.body_fat_percentage}% tuku</span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

export function MeasurementsHistoryCard() {
  const { clientId } = useClientPortal();
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [selectedPrevious, setSelectedPrevious] = useState<Measurement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: measurements, isLoading } = useQuery({
    queryKey: ['client-measurements-history', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('measurements')
        .select('id, date, weight, body_fat_percentage, muscle_mass, basal_metabolism, visceral_fat, bmi, water_percent, chest, waist, hips, notes')
        .eq('client_id', clientId)
        .order('date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []) as Measurement[];
    },
    enabled: !!clientId,
  });

  const handleMeasurementClick = (measurement: Measurement, index: number) => {
    setSelectedMeasurement(measurement);
    // Previous measurement is the one after in the array (older date)
    setSelectedPrevious(measurements && measurements[index + 1] ? measurements[index + 1] : null);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-primary" />
            Historie měření
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!measurements || measurements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-primary" />
            Historie měření
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Scale className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Zatím nemáš žádná měření</p>
            <p className="text-xs mt-1">Trenér ti brzy přidá první měření</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="w-5 h-5 text-primary" />
              Historie měření
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {measurements.length} {measurements.length === 1 ? 'měření' : measurements.length < 5 ? 'měření' : 'měření'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Klikni na měření pro zobrazení detailu
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {measurements.map((measurement, index) => (
            <MeasurementListItem
              key={measurement.id}
              measurement={measurement}
              previousMeasurement={measurements[index + 1]}
              onClick={() => handleMeasurementClick(measurement, index)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>Detail měření</SheetTitle>
          </SheetHeader>
          {selectedMeasurement && (
            <div className="pt-4">
              <MeasurementDetailCard 
                measurement={selectedMeasurement} 
                previousMeasurement={selectedPrevious}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
