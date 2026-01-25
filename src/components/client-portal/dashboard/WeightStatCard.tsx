/**
 * WeightStatCard Component
 * 
 * Displays current weight with trend arrow in the QuickStats grid.
 * Opens a Sheet with weight and body fat charts when clicked.
 * If no data, shows instructions to get measured or add manually.
 */
import { useState } from 'react';
import { Scale, TrendingUp, TrendingDown, Minus, Plus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientWeightProgress, useClientBodyFatProgress } from '@/hooks/useClientProgressData';
import { WeightChart } from '@/components/client-portal/progress/WeightChart';
import { BodyFatChart } from '@/components/client-portal/progress/BodyFatChart';
import { AddMeasurementDialog } from '@/components/client-portal/progress/AddMeasurementDialog';

export function WeightStatCard() {
  const { clientId } = useClientPortal();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  const { data: weightData, isLoading: weightLoading } = useClientWeightProgress(clientId);
  const { data: bodyFatData, isLoading: bodyFatLoading } = useClientBodyFatProgress(clientId);
  
  const isLoading = weightLoading;
  const hasData = weightData && weightData.length > 0;
  
  // Get latest and previous weight for trend calculation
  const latestWeight = hasData ? weightData[weightData.length - 1] : null;
  const previousWeight = hasData && weightData.length > 1 ? weightData[weightData.length - 2] : null;
  
  // Calculate trend (difference between last two measurements)
  const weightTrend = latestWeight && previousWeight 
    ? latestWeight.value - previousWeight.value 
    : undefined;
  
  // Determine trend icon and color
  // Weight decrease = green (positive), increase = red (warning)
  const TrendIcon = weightTrend !== undefined 
    ? weightTrend < 0 
      ? TrendingDown 
      : weightTrend > 0 
        ? TrendingUp 
        : Minus
    : null;
  
  const trendColor = weightTrend !== undefined
    ? weightTrend < 0
      ? 'text-success'
      : weightTrend > 0
        ? 'text-destructive'
        : 'text-muted-foreground'
    : '';

  return (
    <>
      <Card 
        className="bg-card/50 border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
        onClick={() => setSheetOpen(true)}
      >
        <CardContent className="p-3 flex flex-col items-center justify-center gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/50">
            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-12" />
          ) : hasData && latestWeight ? (
            <div className="flex items-center gap-1">
              <p className="text-lg font-bold leading-tight">
                {latestWeight.value.toFixed(1)}
              </p>
              {TrendIcon && (
                <TrendIcon className={cn("w-3 h-3", trendColor)} />
              )}
            </div>
          ) : (
            <p className="text-lg font-bold leading-tight text-muted-foreground">–</p>
          )}
          <p className="text-[10px] text-muted-foreground text-center leading-tight">Váha</p>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              {hasData ? 'Váha a Tělesný tuk' : 'Váha'}
            </SheetTitle>
            {!hasData && (
              <SheetDescription>
                Sleduj svůj pokrok pravidelným měřením
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {!hasData ? (
              // Empty state - no data yet
              <div className="space-y-6 py-4">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                    <Scale className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Zatím nemáš žádná měření.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-sm">Požádej trenéra o zvážení</p>
                    <p className="text-xs text-muted-foreground">
                      Nejpřesnější výsledky získáš na segmentální váze při tréninku.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">nebo</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <AddMeasurementDialog
                  defaultType="weight"
                  open={addDialogOpen}
                  onOpenChange={setAddDialogOpen}
                  trigger={
                    <Button className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Zadej váhu ručně
                    </Button>
                  }
                />
              </div>
            ) : (
              // Has data - show charts
              <div className="space-y-4">
                <WeightChart data={weightData || []} isLoading={weightLoading} />
                <BodyFatChart data={bodyFatData || []} isLoading={bodyFatLoading} />
                
                <AddMeasurementDialog
                  defaultType="weight"
                  open={addDialogOpen}
                  onOpenChange={setAddDialogOpen}
                  trigger={
                    <Button variant="outline" className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Přidat měření
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
