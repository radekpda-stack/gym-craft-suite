import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TrainingPricesSettings() {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();

  const [prices, setPrices] = useState({
    "1": 800,
    "2": 1000,
    "3": 1200,
    "first_training": 1000,
  });
  
  const [monthlyGoal, setMonthlyGoal] = useState(100000);

  useEffect(() => {
    if (settings?.training_prices) {
      setPrices(settings.training_prices);
    }
    if (settings?.monthly_income_goal) {
      setMonthlyGoal(settings.monthly_income_goal);
    }
  }, [settings]);

  const handleBlur = useCallback(async (key: string, value: number) => {
    const currentPrices = settings?.training_prices || { "1": 800, "2": 1000, "3": 1200, "first_training": 1000 };
    
    // Only save if value actually changed
    if (currentPrices[key] === value) return;

    try {
      await updateSetting.mutateAsync({
        key: 'training_prices',
        value: {
          ...currentPrices,
          [key]: value,
        },
      });
      toast.success('Cena uložena');
    } catch {
      toast.error('Chyba při ukládání');
    }
  }, [settings, updateSetting]);

  const handleChange = (key: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [key]: parseInt(value) || 0,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">1 osoba</Label>
          <div className="relative">
            <Input
              type="number"
              value={prices["1"]}
              onChange={(e) => handleChange("1", e.target.value)}
              onBlur={(e) => handleBlur("1", parseInt(e.target.value) || 800)}
              className="pr-10 text-lg font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              Kč
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">2 osoby</Label>
          <div className="relative">
            <Input
              type="number"
              value={prices["2"]}
              onChange={(e) => handleChange("2", e.target.value)}
              onBlur={(e) => handleBlur("2", parseInt(e.target.value) || 1000)}
              className="pr-10 text-lg font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              Kč
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">3+ osoby</Label>
          <div className="relative">
            <Input
              type="number"
              value={prices["3"]}
              onChange={(e) => handleChange("3", e.target.value)}
              onBlur={(e) => handleBlur("3", parseInt(e.target.value) || 1200)}
              className="pr-10 text-lg font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              Kč
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">1. trénink</Label>
          <div className="relative">
            <Input
              type="number"
              value={prices["first_training"]}
              onChange={(e) => handleChange("first_training", e.target.value)}
              onBlur={(e) => handleBlur("first_training", parseInt(e.target.value) || 1000)}
              className="pr-10 text-lg font-semibold"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              Kč
            </span>
          </div>
        </div>
      </div>
      
      {/* Separator */}
      <div className="border-t my-6" />
      
      {/* Monthly Goal */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-sm">Měsíční cíl příjmu</Label>
        <div className="relative max-w-xs">
          <Input
            type="number"
            value={monthlyGoal}
            onChange={(e) => setMonthlyGoal(parseInt(e.target.value) || 0)}
            onBlur={async (e) => {
              const value = parseInt(e.target.value) || 100000;
              if (settings?.monthly_income_goal === value) return;
              try {
                await updateSetting.mutateAsync({ key: 'monthly_income_goal', value });
                toast.success('Měsíční cíl uložen');
              } catch {
                toast.error('Chyba při ukládání');
              }
            }}
            className="pr-10 text-lg font-semibold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            Kč
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Zobrazuje se jako gauge na statistikách
        </p>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Změny se automaticky ukládají při opuštění pole
      </p>
    </div>
  );
}
