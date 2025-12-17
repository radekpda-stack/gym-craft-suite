import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

interface NutritionSettingsValues {
  default_glass_ml: number;
  default_mug_ml: number;
  default_bottle_ml: number;
  default_can_ml: number;
}

const DEFAULT_VALUES: NutritionSettingsValues = {
  default_glass_ml: 250,
  default_mug_ml: 300,
  default_bottle_ml: 500,
  default_can_ml: 330,
};

export function NutritionSettings() {
  const { user } = useAuth();
  const [values, setValues] = useState<NutritionSettingsValues>(DEFAULT_VALUES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', 'nutrition_settings')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        const savedValues = data.value as unknown as NutritionSettingsValues;
        setValues({
          default_glass_ml: savedValues.default_glass_ml ?? DEFAULT_VALUES.default_glass_ml,
          default_mug_ml: savedValues.default_mug_ml ?? DEFAULT_VALUES.default_mug_ml,
          default_bottle_ml: savedValues.default_bottle_ml ?? DEFAULT_VALUES.default_bottle_ml,
          default_can_ml: savedValues.default_can_ml ?? DEFAULT_VALUES.default_can_ml,
        });
      }
    } catch (error) {
      console.error('Error loading nutrition settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('key', 'nutrition_settings')
        .maybeSingle();

      const jsonValue = values as unknown as Json;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('app_settings')
          .update({ 
            value: jsonValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('app_settings')
          .insert({
            user_id: user.id,
            key: 'nutrition_settings',
            value: jsonValue,
            description: 'Nastavení pro 7denní jídelní log',
          });

        if (error) throw error;
      }

      toast({ title: 'Nastavení uloženo' });
    } catch (error) {
      console.error('Error saving nutrition settings:', error);
      toast({ 
        title: 'Chyba při ukládání', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setValues(DEFAULT_VALUES);
  };

  const handleChange = (key: keyof NutritionSettingsValues, value: string) => {
    const numValue = parseInt(value) || 0;
    setValues(prev => ({ ...prev, [key]: numValue }));
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
      {/* Container sizes */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">
          Výchozí velikosti nádob (ml)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="glass" className="text-muted-foreground text-sm">
              Sklenice
            </Label>
            <Input
              id="glass"
              type="number"
              min={50}
              max={1000}
              value={values.default_glass_ml}
              onChange={(e) => handleChange('default_glass_ml', e.target.value)}
              className="glass-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mug" className="text-muted-foreground text-sm">
              Hrnek
            </Label>
            <Input
              id="mug"
              type="number"
              min={50}
              max={1000}
              value={values.default_mug_ml}
              onChange={(e) => handleChange('default_mug_ml', e.target.value)}
              className="glass-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bottle" className="text-muted-foreground text-sm">
              Láhev
            </Label>
            <Input
              id="bottle"
              type="number"
              min={100}
              max={2000}
              value={values.default_bottle_ml}
              onChange={(e) => handleChange('default_bottle_ml', e.target.value)}
              className="glass-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="can" className="text-muted-foreground text-sm">
              Plechovka
            </Label>
            <Input
              id="can"
              type="number"
              min={100}
              max={1000}
              value={values.default_can_ml}
              onChange={(e) => handleChange('default_can_ml', e.target.value)}
              className="glass-input"
            />
          </div>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground">
        Tyto hodnoty se použijí pro automatický přepočet množství tekutin, 
        když klient zadá počet nádob místo přesného objemu v ml.
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Ukládám...' : 'Uložit'}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Obnovit výchozí
        </Button>
      </div>
    </div>
  );
}
