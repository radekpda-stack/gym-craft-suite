import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Trash2, 
  Clock, 
  Route, 
  Heart, 
  Flame, 
  TrendingUp,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useTrainerDiaryEntries, useDeleteDiaryEntry, type TrainerDiaryEntry } from '@/hooks/useTrainerDiary';
import { formatDuration, formatPaceKmDisplay } from '@/lib/timeUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ACTIVITY_ICONS: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  strength: '🏋️',
  hiit: '⚡',
  walking: '🚶',
  hiking: '🥾',
  other: '🎯',
};

const ACTIVITY_LABELS: Record<string, string> = {
  running: 'Běh',
  cycling: 'Cyklistika',
  swimming: 'Plavání',
  strength: 'Síla',
  hiit: 'HIIT',
  walking: 'Chůze',
  hiking: 'Turistika',
  other: 'Jiné',
};

const formatPace = formatPaceKmDisplay;

// Calculate pace per km from time and distance if not stored
function calculatePacePerKm(entry: TrainerDiaryEntry): number | null {
  // If pace is already stored, return it
  if (entry.pace_per_km && entry.pace_per_km > 0) {
    return entry.pace_per_km;
  }
  
  // Calculate from time and distance
  if (entry.duration_seconds && entry.duration_seconds > 0 && 
      entry.distance_meters && entry.distance_meters > 0) {
    // pace = (time in seconds / distance in meters) * 1000
    return (entry.duration_seconds / entry.distance_meters) * 1000;
  }
  
  return null;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters} m`;
}

interface DiaryEntryCardProps {
  entry: TrainerDiaryEntry;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function DiaryEntryCard({ entry, onDelete, isDeleting }: DiaryEntryCardProps) {
  const icon = ACTIVITY_ICONS[entry.activity_type] || '🎯';
  const label = ACTIVITY_LABELS[entry.activity_type] || 'Aktivita';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <span className="text-lg">{icon}</span>
              {entry.title || label}
              {entry.source === 'garmin_ocr' && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Sparkles className="w-3 h-3" />
                  Garmin
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(entry.date), 'EEEE d. MMMM yyyy', { locale: cs })}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {entry.screenshot_url && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Screenshot tréninku</DialogTitle>
                  </DialogHeader>
                  <img 
                    src={entry.screenshot_url} 
                    alt="Screenshot tréninku" 
                    className="w-full rounded-lg"
                  />
                </DialogContent>
              </Dialog>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Záznam bude trvale odstraněn.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(entry.id)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Smazat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {entry.duration_seconds && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{formatDuration(entry.duration_seconds)}</span>
            </div>
          )}
          
          {entry.distance_meters && (
            <div className="flex items-center gap-2 text-sm">
              <Route className="w-4 h-4 text-muted-foreground" />
              <span>{formatDistance(Number(entry.distance_meters))}</span>
            </div>
          )}
          
          {(() => {
            const pace = calculatePacePerKm(entry);
            return pace ? (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span>{formatPace(pace)}</span>
              </div>
            ) : null;
          })()}
          
          {entry.speed_kmh && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span>{Number(entry.speed_kmh).toFixed(1)} km/h</span>
            </div>
          )}
          
          {entry.avg_heart_rate && (
            <div className="flex items-center gap-2 text-sm">
              <Heart className="w-4 h-4 text-red-500" />
              <span>{entry.avg_heart_rate} bpm</span>
              {entry.max_heart_rate && (
                <span className="text-muted-foreground text-xs">(max {entry.max_heart_rate})</span>
              )}
            </div>
          )}
          
          {entry.calories && (
            <div className="flex items-center gap-2 text-sm">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{entry.calories} kcal</span>
            </div>
          )}
          
          {entry.elevation_gain && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span>↗ {entry.elevation_gain} m</span>
            </div>
          )}
          
          {entry.cadence && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Kadence:</span>
              <span>{entry.cadence}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {entry.notes && (
          <p className="text-sm text-muted-foreground italic border-t pt-2">
            {entry.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TrainerDiaryList() {
  const { data: entries, isLoading } = useTrainerDiaryEntries();
  const deleteEntry = useDeleteDiaryEntry();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Zatím nemáte žádné záznamy v soukromém deníku.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nahrajte screenshot z Garmin Connect pro automatickou extrakci dat.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Moje tréninky ({entries.length})</h3>
      </div>
      
      {entries.map((entry) => (
        <DiaryEntryCard 
          key={entry.id} 
          entry={entry} 
          onDelete={(id) => deleteEntry.mutate(id)}
          isDeleting={deleteEntry.isPending}
        />
      ))}
    </div>
  );
}
