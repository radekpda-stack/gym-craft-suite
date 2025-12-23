import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface NutritionSettings {
  sessionDurationDays: number;
  defaultLanguage: string;
  introMessage: string;
  introMessageEn: string;
  thankYouMessage: string;
  thankYouMessageEn: string;
  enablePhotos: boolean;
  enableDrinks: boolean;
  enableCoffee: boolean;
  mealCategories: { id: string; label: string; labelEn: string; enabled: boolean }[];
  drinkTypes: { id: string; label: string; labelEn: string; enabled: boolean }[];
  coffeeTypes: { id: string; label: string; labelEn: string; enabled: boolean }[];
}

const DEFAULT_SETTINGS: NutritionSettings = {
  sessionDurationDays: 3,
  defaultLanguage: 'cs',
  introMessage: 'Vítejte v jídelním deníku. Prosím zaznamenávejte vše, co jíte a pijete.',
  introMessageEn: 'Welcome to the food diary. Please record everything you eat and drink.',
  thankYouMessage: 'Děkujeme za vyplnění jídelního deníku!',
  thankYouMessageEn: 'Thank you for completing the food diary!',
  enablePhotos: true,
  enableDrinks: true,
  enableCoffee: true,
  mealCategories: [
    { id: 'breakfast', label: 'Snídaně', labelEn: 'Breakfast', enabled: true },
    { id: 'morning_snack', label: 'Dopolední svačina', labelEn: 'Morning snack', enabled: true },
    { id: 'lunch', label: 'Oběd', labelEn: 'Lunch', enabled: true },
    { id: 'afternoon_snack', label: 'Odpolední svačina', labelEn: 'Afternoon snack', enabled: true },
    { id: 'dinner', label: 'Večeře', labelEn: 'Dinner', enabled: true },
    { id: 'evening_snack', label: 'Večerní svačina', labelEn: 'Evening snack', enabled: true },
  ],
  drinkTypes: [
    { id: 'water', label: 'Voda', labelEn: 'Water', enabled: true },
    { id: 'tea', label: 'Čaj', labelEn: 'Tea', enabled: true },
    { id: 'juice', label: 'Džus', labelEn: 'Juice', enabled: true },
    { id: 'soda', label: 'Limonáda', labelEn: 'Soda', enabled: true },
    { id: 'alcohol', label: 'Alkohol', labelEn: 'Alcohol', enabled: true },
    { id: 'other', label: 'Jiné', labelEn: 'Other', enabled: true },
  ],
  coffeeTypes: [
    { id: 'espresso', label: 'Espresso', labelEn: 'Espresso', enabled: true },
    { id: 'lungo', label: 'Lungo', labelEn: 'Lungo', enabled: true },
    { id: 'cappuccino', label: 'Cappuccino', labelEn: 'Cappuccino', enabled: true },
    { id: 'latte', label: 'Latte', labelEn: 'Latte', enabled: true },
    { id: 'filter', label: 'Filtrovaná', labelEn: 'Filter coffee', enabled: true },
    { id: 'instant', label: 'Instantní', labelEn: 'Instant', enabled: true },
  ],
};

export function NutritionQuestionnaireSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<NutritionSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['nutrition-questionnaire-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('key', 'nutrition_questionnaire')
        .maybeSingle();
      if (error) throw error;
      return data?.value as unknown as NutritionSettings | null;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
    }
  }, [savedSettings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('app_settings').upsert(
        {
          user_id: user.id,
          key: 'nutrition_questionnaire',
          value: settings as any,
          description: 'Nastavení nutričního dotazníku',
        },
        { onConflict: 'user_id,key' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-questionnaire-settings'] });
      toast.success('Nastavení uloženo');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Chyba při ukládání');
    },
  });

  const handleChange = <K extends keyof NutritionSettings>(key: K, value: NutritionSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateCategoryEnabled = (
    type: 'mealCategories' | 'drinkTypes' | 'coffeeTypes',
    id: string,
    enabled: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [type]: prev[type].map((item) => (item.id === id ? { ...item, enabled } : item)),
    }));
    setHasChanges(true);
  };

  const updateCategoryLabel = (
    type: 'mealCategories' | 'drinkTypes' | 'coffeeTypes',
    id: string,
    label: string,
    lang: 'label' | 'labelEn'
  ) => {
    setSettings((prev) => ({
      ...prev,
      [type]: prev[type].map((item) => (item.id === id ? { ...item, [lang]: label } : item)),
    }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Upravte texty a nastavení jídelního deníku pro klienty.
      </p>

      {/* Basic Settings */}
      <Card className="glass-subtle border-0">
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Délka sledování (dny)</Label>
              <span className="text-sm font-medium">{settings.sessionDurationDays}</span>
            </div>
            <Slider
              value={[settings.sessionDurationDays]}
              onValueChange={([v]) => handleChange('sessionDurationDays', v)}
              min={1}
              max={14}
              step={1}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Povolit fotky jídla</Label>
              <p className="text-xs text-muted-foreground">Klient může přiložit fotografie</p>
            </div>
            <Switch
              checked={settings.enablePhotos}
              onCheckedChange={(v) => handleChange('enablePhotos', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Sledovat nápoje</Label>
              <p className="text-xs text-muted-foreground">Zahrnout pitný režim</p>
            </div>
            <Switch
              checked={settings.enableDrinks}
              onCheckedChange={(v) => handleChange('enableDrinks', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Sledovat kávu</Label>
              <p className="text-xs text-muted-foreground">Detailní sledování kávy</p>
            </div>
            <Switch
              checked={settings.enableCoffee}
              onCheckedChange={(v) => handleChange('enableCoffee', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="glass-subtle border-0">
        <CardContent className="pt-4 space-y-4">
          <Label className="text-foreground font-medium">Uvítací zpráva</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Česky</Label>
              <Textarea
                value={settings.introMessage}
                onChange={(e) => handleChange('introMessage', e.target.value)}
                className="glass-input min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anglicky</Label>
              <Textarea
                value={settings.introMessageEn}
                onChange={(e) => handleChange('introMessageEn', e.target.value)}
                className="glass-input min-h-[80px] resize-none"
              />
            </div>
          </div>

          <Label className="text-foreground font-medium">Děkovná zpráva</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Česky</Label>
              <Textarea
                value={settings.thankYouMessage}
                onChange={(e) => handleChange('thankYouMessage', e.target.value)}
                className="glass-input min-h-[60px] resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anglicky</Label>
              <Textarea
                value={settings.thankYouMessageEn}
                onChange={(e) => handleChange('thankYouMessageEn', e.target.value)}
                className="glass-input min-h-[60px] resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Categories */}
      <Card className="glass-subtle border-0">
        <CardContent className="pt-4 space-y-3">
          <Label className="text-foreground font-medium">Kategorie jídel</Label>
          {settings.mealCategories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <Switch
                checked={cat.enabled}
                onCheckedChange={(v) => updateCategoryEnabled('mealCategories', cat.id, v)}
              />
              <Input
                value={cat.label}
                onChange={(e) => updateCategoryLabel('mealCategories', cat.id, e.target.value, 'label')}
                className="glass-input h-9 flex-1"
                placeholder="Česky"
              />
              <Input
                value={cat.labelEn}
                onChange={(e) => updateCategoryLabel('mealCategories', cat.id, e.target.value, 'labelEn')}
                className="glass-input h-9 flex-1"
                placeholder="Anglicky"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Drink Types */}
      {settings.enableDrinks && (
        <Card className="glass-subtle border-0">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-foreground font-medium">Typy nápojů</Label>
            {settings.drinkTypes.map((drink) => (
              <div key={drink.id} className="flex items-center gap-3">
                <Switch
                  checked={drink.enabled}
                  onCheckedChange={(v) => updateCategoryEnabled('drinkTypes', drink.id, v)}
                />
                <Input
                  value={drink.label}
                  onChange={(e) => updateCategoryLabel('drinkTypes', drink.id, e.target.value, 'label')}
                  className="glass-input h-9 flex-1"
                  placeholder="Česky"
                />
                <Input
                  value={drink.labelEn}
                  onChange={(e) => updateCategoryLabel('drinkTypes', drink.id, e.target.value, 'labelEn')}
                  className="glass-input h-9 flex-1"
                  placeholder="Anglicky"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Coffee Types */}
      {settings.enableCoffee && (
        <Card className="glass-subtle border-0">
          <CardContent className="pt-4 space-y-3">
            <Label className="text-foreground font-medium">Typy kávy</Label>
            {settings.coffeeTypes.map((coffee) => (
              <div key={coffee.id} className="flex items-center gap-3">
                <Switch
                  checked={coffee.enabled}
                  onCheckedChange={(v) => updateCategoryEnabled('coffeeTypes', coffee.id, v)}
                />
                <Input
                  value={coffee.label}
                  onChange={(e) => updateCategoryLabel('coffeeTypes', coffee.id, e.target.value, 'label')}
                  className="glass-input h-9 flex-1"
                  placeholder="Česky"
                />
                <Input
                  value={coffee.labelEn}
                  onChange={(e) => updateCategoryLabel('coffeeTypes', coffee.id, e.target.value, 'labelEn')}
                  className="glass-input h-9 flex-1"
                  placeholder="Anglicky"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      {hasChanges && (
        <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending} className="w-full">
          {saveSettings.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ukládám...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Uložit nastavení
            </>
          )}
        </Button>
      )}
    </div>
  );
}
