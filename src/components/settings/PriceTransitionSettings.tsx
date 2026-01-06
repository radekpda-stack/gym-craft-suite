import { useState, useEffect } from 'react';
import { Calendar, Users, AlertTriangle, CheckCircle2, Loader2, Play, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SettingsSection } from './SettingsSection';
import { useAppSettings, useUpdateSetting, TrainingPrices } from '@/hooks/useAppSettings';
import { usePriceTransition } from '@/hooks/usePriceTransition';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LegacyPrices {
  "1": number;
  "2": number;
  "3": number;
}

export function PriceTransitionSettings() {
  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  const { 
    clientsOnLegacyPricing, 
    clientsTransitioned,
    totalLegacyCredit,
    activateTransition,
    isActivating 
  } = usePriceTransition();

  const [isEnabled, setIsEnabled] = useState(false);
  const [legacyPrices, setLegacyPrices] = useState<LegacyPrices>({ "1": 800, "2": 1000, "3": 1200 });
  const [transitionDate, setTransitionDate] = useState<string>('');

  // Load settings
  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.price_transition_enabled || false);
      setLegacyPrices(settings.legacy_training_prices || { "1": 800, "2": 1000, "3": 1200 });
      setTransitionDate(settings.price_transition_date || '');
    }
  }, [settings]);

  const handleToggleEnabled = async (enabled: boolean) => {
    setIsEnabled(enabled);
    await updateSetting.mutateAsync({ 
      key: 'price_transition_enabled', 
      value: enabled 
    });
  };

  const handleLegacyPriceChange = (key: keyof LegacyPrices, value: string) => {
    const numValue = parseInt(value) || 0;
    setLegacyPrices(prev => ({ ...prev, [key]: numValue }));
  };

  const handleLegacyPriceBlur = async () => {
    await updateSetting.mutateAsync({ 
      key: 'legacy_training_prices', 
      value: legacyPrices 
    });
  };

  const handleActivateTransition = async () => {
    const confirmed = window.confirm(
      'Tím se zaznamená aktuální kredit všech klientů jako "předplacený za starou cenu". ' +
      'Klienti budou platit staré ceny, dokud tento kredit nevyčerpají. Pokračovat?'
    );
    
    if (!confirmed) return;

    try {
      await activateTransition();
      setTransitionDate(new Date().toISOString());
      await updateSetting.mutateAsync({ 
        key: 'price_transition_date', 
        value: new Date().toISOString() 
      });
      toast({
        title: "Přechod aktivován",
        description: `Kredit ${clientsOnLegacyPricing?.length || 0} klientů byl zaznamenán. Budou platit staré ceny do vyčerpání.`,
      });
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktivovat přechod cen.",
        variant: "destructive",
      });
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPrices = settings?.training_prices as TrainingPrices;

  return (
    <SettingsSection
      title="Přechodové období cen"
      description="Nastavení pro plynulý přechod na nový ceník. Klienti s předplaceným kreditem budou platit staré ceny do jeho vyčerpání."
      icon={Calendar}
      impact={isEnabled && transitionDate ? {
        type: 'info',
        message: `Přechod aktivován ${format(new Date(transitionDate), 'd. MMMM yyyy', { locale: cs })}`
      } : undefined}
    >
      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Aktivovat přechodové období</Label>
            <p className="text-sm text-muted-foreground">
              Povolí systém starých a nových cen
            </p>
          </div>
          <Switch 
            checked={isEnabled} 
            onCheckedChange={handleToggleEnabled}
          />
        </div>

        {isEnabled && (
          <>
            <Separator />

            {/* Price comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Legacy prices */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                    Staré ceny
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">1 osoba</Label>
                    <Input
                      type="number"
                      value={legacyPrices["1"]}
                      onChange={(e) => handleLegacyPriceChange("1", e.target.value)}
                      onBlur={handleLegacyPriceBlur}
                      className="w-24 h-8"
                    />
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">2 osoby</Label>
                    <Input
                      type="number"
                      value={legacyPrices["2"]}
                      onChange={(e) => handleLegacyPriceChange("2", e.target.value)}
                      onBlur={handleLegacyPriceBlur}
                      className="w-24 h-8"
                    />
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">3+ osob</Label>
                    <Input
                      type="number"
                      value={legacyPrices["3"]}
                      onChange={(e) => handleLegacyPriceChange("3", e.target.value)}
                      onBlur={handleLegacyPriceBlur}
                      className="w-24 h-8"
                    />
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                </div>
              </div>

              {/* New prices (read-only, from training_prices) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    Nové ceny
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">1 osoba</Label>
                    <div className="w-24 h-8 flex items-center px-3 bg-muted/50 rounded-md text-sm">
                      {currentPrices?.["1"] || 900}
                    </div>
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">2 osoby</Label>
                    <div className="w-24 h-8 flex items-center px-3 bg-muted/50 rounded-md text-sm">
                      {currentPrices?.["2"] || 1100}
                    </div>
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-24 text-sm text-muted-foreground">3+ osob</Label>
                    <div className="w-24 h-8 flex items-center px-3 bg-muted/50 rounded-md text-sm">
                      {currentPrices?.["3"] || 1300}
                    </div>
                    <span className="text-sm text-muted-foreground">Kč</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Transition status */}
            {transitionDate ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Nové ceny nastavíte v sekci "Ceny tréninků" výše
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-500">Staré ceny</span>
                    </div>
                    <div className="text-2xl font-bold">{clientsOnLegacyPricing?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">klientů</div>
                    {totalLegacyCredit > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Zbývá: {totalLegacyCredit.toLocaleString('cs-CZ')} Kč
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-emerald-500">Nové ceny</span>
                    </div>
                    <div className="text-2xl font-bold">{clientsTransitioned?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">klientů přešlo</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-warning">Přechod není aktivován</p>
                      <p className="text-sm text-muted-foreground">
                        Kliknutím na tlačítko níže se zaznamená aktuální kredit všech klientů. 
                        Do vyčerpání tohoto kreditu budou platit staré ceny.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleActivateTransition}
                  disabled={isActivating}
                  className="w-full"
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aktivuji...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Spustit přechod na nové ceny
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </SettingsSection>
  );
}
