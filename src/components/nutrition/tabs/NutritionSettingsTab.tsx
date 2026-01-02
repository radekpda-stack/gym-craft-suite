import { useState, useEffect } from 'react';
import { 
  Save,
  RotateCcw,
  Coffee,
  Droplets,
  Utensils,
  ListChecks,
  Plus,
  X,
  Loader2,
  Languages,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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

const defaultTemplate = {
  logDuration: 7,
  expectedEntriesPerDay: 3,
  defaultLanguage: 'cs',
  autoComplete: true,
  reminderEnabled: false,
  mealCategories: ['Snídaně', 'Svačina', 'Oběd', 'Odpolední svačina', 'Večeře', 'Druhá večeře'],
  drinkCategories: ['Voda', 'Čaj', 'Džus', 'Limonáda', 'Energetický nápoj', 'Jiné'],
  coffeeTypes: ['Espresso', 'Americano', 'Cappuccino', 'Latte', 'Filter', 'Jiná'],
  qualityOptions: ['Výborná', 'Dobrá', 'Průměrná', 'Špatná'],
  introMessage: 'Vítejte ve stravovacím dotazníku. Zaznamenávejte vše, co jíte a pijete po dobu 7 dní.',
  thankYouMessage: 'Děkujeme za vyplnění dotazníku!',
};

type TemplateType = typeof defaultTemplate;
type EditableListKey = 'mealCategories' | 'drinkCategories' | 'coffeeTypes' | 'qualityOptions';

export default function NutritionSettingsTab() {
  const { user } = useAuth();
  const { data: appSettings, isLoading: isLoadingSettings } = useAppSettings();
  const updateSettingMutation = useUpdateSetting();
  
  const [template, setTemplate] = useState<TemplateType>(defaultTemplate);
  const [hasChanges, setHasChanges] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingField, setEditingField] = useState<EditableListKey | null>(null);

  useEffect(() => {
    if (appSettings?.nutrition_settings) {
      setTemplate({ ...defaultTemplate, ...appSettings.nutrition_settings });
    }
  }, [appSettings]);

  const updateTemplate = <K extends keyof TemplateType>(key: K, value: TemplateType[K]) => {
    setTemplate(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addCategory = (field: EditableListKey) => {
    if (!newCategory.trim()) return;
    if (template[field].includes(newCategory.trim())) {
      toast.error('Tato kategorie již existuje');
      return;
    }
    updateTemplate(field, [...template[field], newCategory.trim()]);
    setNewCategory('');
    setEditingField(null);
  };

  const removeCategory = (field: EditableListKey, index: number) => {
    const newCategories = [...template[field]];
    newCategories.splice(index, 1);
    updateTemplate(field, newCategories);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Musíte být přihlášeni');
      return;
    }
    
    try {
      await updateSettingMutation.mutateAsync({
        key: 'nutrition_settings',
        value: template
      });
      setHasChanges(false);
      toast.success('Nastavení uloženo');
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    }
  };

  const handleReset = () => {
    setTemplate(defaultTemplate);
    setHasChanges(true);
    toast.info('Obnoveno na výchozí hodnoty');
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderEditableCategories = (field: EditableListKey, variant: 'secondary' | 'outline' = 'secondary') => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {template[field].map((category, index) => (
          <Badge key={index} variant={variant} className="text-sm py-1.5 px-3 pr-1.5 flex items-center gap-1.5">
            {category}
            <button
              onClick={() => removeCategory(field, index)}
              className="opacity-50 hover:opacity-100 p-0.5 rounded hover:bg-destructive/20"
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
              if (e.key === 'Enter') { e.preventDefault(); addCategory(field); }
              if (e.key === 'Escape') { setEditingField(null); setNewCategory(''); }
            }}
            autoFocus
          />
          <Button size="sm" onClick={() => addCategory(field)}>Přidat</Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditingField(null); setNewCategory(''); }}>Zrušit</Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setEditingField(field)}>
          <Plus className="h-4 w-4 mr-1" />
          Přidat
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Obecné nastavení
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Výchozí délka kampaně</Label>
              <Select 
                value={template.logDuration.toString()} 
                onValueChange={(v) => updateTemplate('logDuration', parseInt(v))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 dny</SelectItem>
                  <SelectItem value="5">5 dní</SelectItem>
                  <SelectItem value="7">7 dní</SelectItem>
                  <SelectItem value="14">14 dní</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Jazyk</Label>
              <Select 
                value={template.defaultLanguage} 
                onValueChange={(v) => updateTemplate('defaultLanguage', v)}
              >
                <SelectTrigger>
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
              <div>
                <Label>Automatické dokončení</Label>
                <p className="text-sm text-muted-foreground">Po uplynutí období</p>
              </div>
              <Switch checked={template.autoComplete} onCheckedChange={(v) => updateTemplate('autoComplete', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Texty pro klienta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Úvodní zpráva</Label>
              <Textarea
                value={template.introMessage}
                onChange={(e) => updateTemplate('introMessage', e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Závěrečná zpráva</Label>
              <Textarea
                value={template.thankYouMessage}
                onChange={(e) => updateTemplate('thankYouMessage', e.target.value)}
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
          </CardHeader>
          <CardContent>
            {renderEditableCategories('qualityOptions', 'outline')}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
