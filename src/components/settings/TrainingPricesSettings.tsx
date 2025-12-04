import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { Loader2 } from 'lucide-react';

export function TrainingPricesSettings() {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();

  const [price1, setPrice1] = useState('');
  const [price2, setPrice2] = useState('');
  const [price3, setPrice3] = useState('');
  const [lowCreditThreshold, setLowCreditThreshold] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentPrices = settings?.training_prices || { "1": 800, "2": 1000, "3": 1200 };
  const currentThreshold = settings?.low_credit_threshold || 500;

  const startEditing = () => {
    setPrice1(currentPrices["1"].toString());
    setPrice2(currentPrices["2"].toString());
    setPrice3(currentPrices["3"].toString());
    setLowCreditThreshold(currentThreshold.toString());
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateSetting.mutateAsync({
      key: 'training_prices',
      value: {
        "1": parseInt(price1) || 800,
        "2": parseInt(price2) || 1000,
        "3": parseInt(price3) || 1200,
      },
    });

    await updateSetting.mutateAsync({
      key: 'low_credit_threshold',
      value: parseInt(lowCreditThreshold) || 500,
    });

    setIsEditing(false);
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
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Ceny tréninků</h3>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>1 osoba</Label>
                <Input
                  type="number"
                  value={price1}
                  onChange={(e) => setPrice1(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>2 osoby</Label>
                <Input
                  type="number"
                  value={price2}
                  onChange={(e) => setPrice2(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>3+ osoby</Label>
                <Input
                  type="number"
                  value={price3}
                  onChange={(e) => setPrice3(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={updateSetting.isPending}>
                Uložit
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Zrušit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground">1 osoba</p>
                <p className="text-xl font-bold text-foreground">{currentPrices["1"]} Kč</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground">2 osoby</p>
                <p className="text-xl font-bold text-foreground">{currentPrices["2"]} Kč</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground">3+ osoby</p>
                <p className="text-xl font-bold text-foreground">{currentPrices["3"]} Kč</p>
              </div>
            </div>
            <Button variant="outline" onClick={startEditing}>
              Upravit ceny
            </Button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Limit pro nízký kredit</h3>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label>Upozornit při kreditu pod (Kč)</Label>
              <Input
                type="number"
                value={lowCreditThreshold}
                onChange={(e) => setLowCreditThreshold(e.target.value)}
                className="mt-2 w-48"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-secondary/50 inline-block">
            <p className="text-sm text-muted-foreground">Upozornit při kreditu pod</p>
            <p className="text-xl font-bold text-foreground">{currentThreshold} Kč</p>
          </div>
        )}
      </div>
    </div>
  );
}
