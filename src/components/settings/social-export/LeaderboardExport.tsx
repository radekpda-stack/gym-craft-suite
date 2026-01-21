import { useState, useRef } from 'react';
import { Download, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { 
  useExercisesForExport, 
  useExerciseLeaderboardExport,
  type AgeFilter 
} from '@/hooks/useExerciseLeaderboardExport';
import { LeaderboardCardPreview } from './LeaderboardCardPreview';
import { ExportSettingsForm } from './ExportSettingsForm';
import { exportCardAsImage } from '@/lib/socialCardExport';
import type { ExportSettings } from '@/types/socialExport';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function LeaderboardExport() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const isCs = language === 'cs';

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExerciseType, setSelectedExerciseType] = useState<'strength' | 'cardio'>('strength');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [displayMode, setDisplayMode] = useState<'both' | 'male' | 'female'>('both');

  const [settings, setSettings] = useState<ExportSettings>({
    period: 'all',
    format: 'instagram-post',
    theme: 'dark',
    showLogo: true,
    showTrainerName: true,
    showSocialHandle: false,
    trainerName: '',
    socialHandle: '',
  });

  const { data: exercises, isLoading: loadingExercises } = useExercisesForExport();
  const { data: leaderboardData, isLoading: loadingLeaderboard } = useExerciseLeaderboardExport(
    selectedExerciseId,
    selectedExerciseType,
    ageFilter
  );

  const handleExerciseChange = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    // Determine exercise type
    const exercise = exercises?.find(e => e.id === exerciseId);
    if (exercise) {
      setSelectedExerciseType(exercise.exerciseType);
    }
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    
    try {
      await exportCardAsImage(cardRef, {
        format: settings.format,
        filename: `zebricek-${leaderboardData?.exerciseName || 'cvik'}-${Date.now()}.png`,
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

  const ageFilterOptions = [
    { value: 'all', label: isCs ? 'Všechny věky' : 'All ages' },
    { value: 'under30', label: isCs ? 'Do 30 let' : 'Under 30' },
    { value: '30-40', label: '30-40 let' },
    { value: '40-50', label: '40-50 let' },
    { value: 'over50', label: isCs ? 'Nad 50 let' : 'Over 50' },
  ];

  const hasData = leaderboardData && (leaderboardData.maleEntries.length > 0 || leaderboardData.femaleEntries.length > 0);

  return (
    <div className="space-y-6">
      {/* Exercise Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          {isCs ? 'Vyberte cvik' : 'Select exercise'}
        </Label>
        <Select
          value={selectedExerciseId || ''}
          onValueChange={handleExerciseChange}
        >
          <SelectTrigger className="bg-secondary">
            <SelectValue placeholder={isCs ? 'Vybrat cvik...' : 'Select exercise...'} />
          </SelectTrigger>
          <SelectContent>
            {loadingExercises ? (
              <SelectItem value="loading" disabled>
                {isCs ? 'Načítání...' : 'Loading...'}
              </SelectItem>
            ) : exercises?.length === 0 ? (
              <SelectItem value="empty" disabled>
                {isCs ? 'Žádné cviky' : 'No exercises'}
              </SelectItem>
            ) : (
              exercises?.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                  {exercise.exerciseType === 'cardio' && (
                    <span className="ml-2 text-xs text-muted-foreground">(cardio)</span>
                  )}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      {selectedExerciseId && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isCs ? 'Filtr podle věku' : 'Age filter'}
            </Label>
            <Select value={ageFilter} onValueChange={(v) => setAgeFilter(v as AgeFilter)}>
              <SelectTrigger className="bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ageFilterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isCs ? 'Zobrazení' : 'Display'}
            </Label>
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setDisplayMode('both')}
                className={cn(
                  "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                  displayMode === 'both' 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                {isCs ? 'Oba' : 'Both'}
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('male')}
                className={cn(
                  "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                  displayMode === 'male' 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                {isCs ? 'Muži' : 'Men'}
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('female')}
                className={cn(
                  "flex-1 px-3 py-1.5 text-sm rounded-md transition-colors",
                  displayMode === 'female' 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                {isCs ? 'Ženy' : 'Women'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Settings */}
      {selectedExerciseId && (
        <ExportSettingsForm
          settings={settings}
          onSettingsChange={setSettings}
          language={language}
        />
      )}

      {/* Preview */}
      {selectedExerciseId && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            {isCs ? 'Náhled' : 'Preview'}
          </p>
          <div className="bg-muted/30 rounded-xl p-4 overflow-auto">
            <LeaderboardCardPreview
              ref={cardRef}
              data={leaderboardData}
              displayMode={displayMode}
              settings={settings}
              isLoading={loadingLeaderboard}
              ageFilter={ageFilter}
            />
          </div>
        </div>
      )}

      {/* Export Button */}
      {selectedExerciseId && hasData && (
        <Button 
          onClick={handleExport} 
          disabled={loadingLeaderboard}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          {isCs ? 'Stáhnout PNG' : 'Download PNG'}
        </Button>
      )}

      {/* Empty state */}
      {!selectedExerciseId && (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{isCs ? 'Vyberte cvik pro vytvoření žebříčku' : 'Select an exercise to create a leaderboard'}</p>
        </div>
      )}

      {selectedExerciseId && !loadingLeaderboard && !hasData && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{isCs ? 'Pro tento cvik nejsou žádná data' : 'No data for this exercise'}</p>
        </div>
      )}
    </div>
  );
}
