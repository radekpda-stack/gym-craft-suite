import { useState, useEffect } from 'react';
import { Clock, Users, Dumbbell } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { useLanguage } from '@/lib/i18n';

interface DefaultValues {
  trainingDuration: number;
  trainingType: string;
  participantCount: number;
}

const DEFAULT_VALUES: DefaultValues = {
  trainingDuration: 60,
  trainingType: 'strength',
  participantCount: 1,
};

const TRAINING_TYPES = [
  { value: 'strength', labelCs: 'Silový trénink', labelEn: 'Strength training' },
  { value: 'cardio', labelCs: 'Kardio', labelEn: 'Cardio' },
  { value: 'hiit', labelCs: 'HIIT', labelEn: 'HIIT' },
  { value: 'mobility', labelCs: 'Mobilita', labelEn: 'Mobility' },
  { value: 'rehab', labelCs: 'Rehabilitace', labelEn: 'Rehabilitation' },
  { value: 'mixed', labelCs: 'Kombinovaný', labelEn: 'Mixed' },
];

const DURATIONS = [30, 45, 60, 75, 90, 120];
const PARTICIPANT_COUNTS = [1, 2, 3, 4, 5];

export function DefaultValuesSettings() {
  const { language } = useLanguage();
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const [values, setValues] = useState<DefaultValues>(DEFAULT_VALUES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.default_training_values) {
      setValues({ ...DEFAULT_VALUES, ...settings.default_training_values });
    }
  }, [settings]);

  const handleChange = (key: keyof DefaultValues, value: number | string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSetting.mutate(
      { key: 'default_training_values', value: values },
      { onSuccess: () => setHasChanges(false) }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {/* Training Duration */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {language === 'cs' ? 'Délka tréninku' : 'Training duration'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'cs' 
                  ? 'Výchozí délka při vytváření tréninku' 
                  : 'Default duration when creating training'}
              </p>
            </div>
          </div>
          <Select
            value={String(values.trainingDuration)}
            onValueChange={(val) => handleChange('trainingDuration', Number(val))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map(d => (
                <SelectItem key={d} value={String(d)}>
                  {d} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Training Type */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Dumbbell className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {language === 'cs' ? 'Typ tréninku' : 'Training type'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'cs' 
                  ? 'Výchozí typ tréninku' 
                  : 'Default training type'}
              </p>
            </div>
          </div>
          <Select
            value={values.trainingType}
            onValueChange={(val) => handleChange('trainingType', val)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRAINING_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {language === 'cs' ? t.labelCs : t.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Participant Count */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <Label className="text-sm font-medium">
                {language === 'cs' ? 'Počet účastníků' : 'Participant count'}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'cs' 
                  ? 'Výchozí počet účastníků tréninku' 
                  : 'Default number of training participants'}
              </p>
            </div>
          </div>
          <Select
            value={String(values.participantCount)}
            onValueChange={(val) => handleChange('participantCount', Number(val))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARTICIPANT_COUNTS.map(c => (
                <SelectItem key={c} value={String(c)}>
                  {c} {language === 'cs' ? (c === 1 ? 'osoba' : c < 5 ? 'osoby' : 'osob') : (c === 1 ? 'person' : 'people')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSave}
            disabled={updateSetting.isPending}
            size="sm"
          >
            {updateSetting.isPending 
              ? (language === 'cs' ? 'Ukládám...' : 'Saving...') 
              : (language === 'cs' ? 'Uložit změny' : 'Save changes')}
          </Button>
        </div>
      )}
    </div>
  );
}
