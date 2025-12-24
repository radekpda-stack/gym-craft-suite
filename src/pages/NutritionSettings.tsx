import { useState, useEffect } from 'react';
import { 
  Settings, 
  Utensils, 
  Clock, 
  Languages, 
  Save,
  RotateCcw,
  Coffee,
  Droplets,
  ListChecks,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { useAuth } from '@/hooks/useAuth';

// Default settings
const defaultSettings = {
  logDuration: 7,
  defaultLanguage: 'cs',
  autoComplete: true,
  reminderEnabled: false,
  mealCategories: ['Snídaně', 'Svačina', 'Oběd', 'Odpolední svačina', 'Večeře', 'Druhá večeře'],
  drinkCategories: ['Voda', 'Čaj', 'Džus', 'Limonáda', 'Energetický nápoj', 'Jiné'],
  coffeeTypes: ['Espresso', 'Americano', 'Cappuccino', 'Latte', 'Filter', 'Jiná'],
  qualityOptions: ['Výborná', 'Dobrá', 'Průměrná', 'Špatná'],
  introMessage: 'Vítejte ve stravovacím dotazníku. Zaznamenávejte vše, co jíte a pijete po dobu 7 dní.',
  thankYouMessage: 'Děkujeme za vyplnění dotazníku! Vaše odpovědi nám pomohou lépe pochopit vaše stravovací návyky.',
};

type NutritionSettingsType = typeof defaultSettings;

export default function NutritionSettings() {
  const { user } = useAuth();
  const { data: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const updateSettingMutation = useUpdateSetting();
  
  const [settings, setSettings] = useState<NutritionSettingsType>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingField, setEditingField] = useState<keyof NutritionSettingsType | null>(null);

  // Load settings from database
  useEffect(() => {
    if (appSettings?.nutrition_settings) {
      setSettings({ ...defaultSettings, ...appSettings.nutrition_settings });
    }
  }, [appSettings]);

  const updateSetting = <K extends keyof NutritionSettingsType>(
    key: K, 
    value: NutritionSettingsType[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addCategory = (field: 'mealCategories' | 'drinkCategories' | 'coffeeTypes' | 'qualityOptions') => {
    if (!newCategory.trim()) return;
    if (settings[field].includes(newCategory.trim())) {
      toast.error('Tato kategorie již existuje');
      return;
    }
    updateSetting(field, [...settings[field], newCategory.trim()]);
    setNewCategory('');
    setEditingField(null);
  };

  const removeCategory = (field: 'mealCategories' | 'drinkCategories' | 'coffeeTypes' | 'qualityOptions', index: number) => {
    const newCategories = [...settings[field]];
    newCategories.splice(index, 1);
    updateSetting(field, newCategories);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Musíte být přihlášeni');
      return;
    }
    
    try {
      await updateSettingMutation.mutateAsync({
        key: 'nutrition_settings',
        value: settings
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.info('Nastavení obnoveno na výchozí hodnoty - uložte pro potvrzení');
  };

  if (isLoadingSettings) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderEditableCategories = (
    field: 'mealCategories' | 'drinkCategories' | 'coffeeTypes' | 'qualityOptions',
    variant: 'secondary' | 'outline' = 'secondary'
  ) => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {settings[field].map((category, index) => (
          <Badge 
            key={index} 
            variant={variant} 
            className="text-sm py-1.5 px-3 pr-1.5 flex items-center gap-1.5 group"
          >
            {category}
            <button
              onClick={() => removeCategory(field, index)}
              className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {editingField === field ? (
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nová kategorie..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCategory(field);
              }
              if (e.key === 'Escape') {
                setEditingField(null);
                setNewCategory('');
              }
            }}
            autoFocus
          />
          <Button size="sm" onClick={() => addCategory(field)}>
            Přidat
          </Button>
          <Button size="sm" variant="ghost" onClick={() => {
            setEditingField(null);
            setNewCategory('');
          }}>
            Zrušit
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setEditingField(field)}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-1" />
          Přidat kategorii
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Nastavení stravovacího dotazníku
          </h1>
          <p className="text-muted-foreground mt-1">
            Přizpůsobte stravovací dotazníky pro vaše klienty
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || updateSettingMutation.isPending}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Obnovit výchozí
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateSettingMutation.isPending}>
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Uložit změny
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Obecné nastavení
            </CardTitle>
            <CardDescription>
              Základní parametry dotazníku
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="duration">Délka dotazníku (dny)</Label>
              <Select 
                value={settings.logDuration.toString()} 
                onValueChange={(v) => updateSetting('logDuration', parseInt(v))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 dny</SelectItem>
                  <SelectItem value="5">5 dní</SelectItem>
                  <SelectItem value="7">7 dní (doporučeno)</SelectItem>
                  <SelectItem value="14">14 dní</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Výchozí jazyk</Label>
              <Select 
                value={settings.defaultLanguage} 
                onValueChange={(v) => updateSetting('defaultLanguage', v)}
              >
                <SelectTrigger id="language">
                  <Languages className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">Čeština</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Automatické dokončení</Label>
                <p className="text-sm text-muted-foreground">
                  Automaticky označit jako dokončený po uplynutí
                </p>
              </div>
              <Switch
                checked={settings.autoComplete}
                onCheckedChange={(v) => updateSetting('autoComplete', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Připomínky</Label>
                <p className="text-sm text-muted-foreground">
                  Upozornit klienta na vyplnění (vyžaduje email)
                </p>
              </div>
              <Switch
                checked={settings.reminderEnabled}
                onCheckedChange={(v) => updateSetting('reminderEnabled', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Texty zpráv
            </CardTitle>
            <CardDescription>
              Přizpůsobte uvítací a závěrečnou zprávu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="intro">Úvodní zpráva</Label>
              <Textarea
                id="intro"
                value={settings.introMessage}
                onChange={(e) => updateSetting('introMessage', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thanks">Závěrečná zpráva</Label>
              <Textarea
                id="thanks"
                value={settings.thankYouMessage}
                onChange={(e) => updateSetting('thankYouMessage', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Meal Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Kategorie jídel
            </CardTitle>
            <CardDescription>
              Typy jídel, které může klient zaznamenat
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderEditableCategories('mealCategories')}
          </CardContent>
        </Card>

        {/* Drink Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Kategorie nápojů
            </CardTitle>
            <CardDescription>
              Typy nápojů pro zaznamenání pitného režimu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderEditableCategories('drinkCategories')}
          </CardContent>
        </Card>

        {/* Coffee Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Typy kávy
            </CardTitle>
            <CardDescription>
              Druhy kávy pro sledování konzumace kofeinu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderEditableCategories('coffeeTypes')}
          </CardContent>
        </Card>

        {/* Quality Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Hodnocení kvality
            </CardTitle>
            <CardDescription>
              Možnosti hodnocení kvality jídla
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderEditableCategories('qualityOptions', 'outline')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
