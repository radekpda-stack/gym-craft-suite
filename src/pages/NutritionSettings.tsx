import { useState } from 'react';
import { 
  Settings, 
  Utensils, 
  Clock, 
  Languages, 
  Save,
  RotateCcw,
  Coffee,
  Droplets,
  ListChecks
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

export default function NutritionSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = <K extends keyof typeof defaultSettings>(
    key: K, 
    value: typeof defaultSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    toast.success('Nastavení uloženo');
    setHasChanges(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(false);
    toast.info('Nastavení obnoveno na výchozí hodnoty');
  };

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
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Obnovit výchozí
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
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
            <div className="flex flex-wrap gap-2">
              {settings.mealCategories.map((category, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                  {category}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Pro úpravu kategorií kontaktujte podporu
            </p>
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
            <div className="flex flex-wrap gap-2">
              {settings.drinkCategories.map((category, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                  {category}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Pro úpravu kategorií kontaktujte podporu
            </p>
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
            <div className="flex flex-wrap gap-2">
              {settings.coffeeTypes.map((type, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                  {type}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Pro úpravu typů kontaktujte podporu
            </p>
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
            <div className="flex flex-wrap gap-2">
              {settings.qualityOptions.map((option, index) => (
                <Badge key={index} variant="outline" className="text-sm py-1.5 px-3">
                  {option}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
