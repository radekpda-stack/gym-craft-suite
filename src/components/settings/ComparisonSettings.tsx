import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useComparisonSettings, useUpdateComparisonSettings } from '@/hooks/useChallenges';
import { Users, BarChart3, Trophy, Shield } from 'lucide-react';

export function ComparisonSettings() {
  const { data: settings, isLoading } = useComparisonSettings();
  const updateSettings = useUpdateComparisonSettings();

  const [displayMode, setDisplayMode] = useState<string>('both');
  const [minGroupSize, setMinGroupSize] = useState(8);
  const [genderEnabled, setGenderEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setDisplayMode(settings.display_mode);
      setMinGroupSize(settings.min_group_size);
      setGenderEnabled(settings.benchmark_groups_enabled?.includes('gender') || false);
    }
  }, [settings]);

  const handleSave = () => {
    const groups = ['all'];
    if (genderEnabled) groups.push('gender');

    updateSettings.mutate({
      display_mode: displayMode,
      min_group_size: minGroupSize,
      benchmark_groups_enabled: groups,
    });
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Zobrazení srovnání
          </CardTitle>
          <CardDescription>
            Vyberte, jaké srovnání uvidí klienti v portálu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={displayMode} onValueChange={setDisplayMode} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="percentile_only" id="percentile" />
              <div className="flex-1">
                <Label htmlFor="percentile" className="font-medium cursor-pointer">
                  Pouze percentil
                </Label>
                <p className="text-sm text-muted-foreground">
                  Klient vidí jen svoji pozici v procentech (např. "Top 25%")
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="leaderboard_only" id="leaderboard" />
              <div className="flex-1">
                <Label htmlFor="leaderboard" className="font-medium cursor-pointer">
                  Pouze leaderboard
                </Label>
                <p className="text-sm text-muted-foreground">
                  Anonymní žebříček s pseudonymy (Athlete #1, #2...)
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border">
              <RadioGroupItem value="both" id="both" />
              <div className="flex-1">
                <Label htmlFor="both" className="font-medium cursor-pointer">
                  Obojí
                </Label>
                <p className="text-sm text-muted-foreground">
                  Percentil i anonymní leaderboard
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            K-anonymita (ochrana soukromí)
          </CardTitle>
          <CardDescription>
            Minimální počet účastníků pro zobrazení srovnání
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="minGroupSize">Minimální velikost skupiny</Label>
            <Input
              id="minGroupSize"
              type="number"
              min={3}
              max={50}
              value={minGroupSize}
              onChange={(e) => setMinGroupSize(Number(e.target.value))}
              className="w-32 mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Pokud je méně účastníků, srovnání se nezobrazí
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Skupiny pro srovnání
          </CardTitle>
          <CardDescription>
            Které skupiny mohou klienti porovnávat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="font-medium">Všichni klienti</Label>
              <p className="text-sm text-muted-foreground">Vždy zapnuto</p>
            </div>
            <Switch checked disabled />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="font-medium">Podle pohlaví</Label>
              <p className="text-sm text-muted-foreground">Muži / Ženy (pokud klient uvedl)</p>
            </div>
            <Switch 
              checked={genderEnabled} 
              onCheckedChange={setGenderEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateSettings.isPending}>
        {updateSettings.isPending ? 'Ukládám...' : 'Uložit nastavení'}
      </Button>
    </div>
  );
}
