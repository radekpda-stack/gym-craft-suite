import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppSettings, useUpdateSetting } from '@/hooks/useAppSettings';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Ban } from 'lucide-react';

export function CreditThresholdSettings() {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const [lowThreshold, setLowThreshold] = useState<number>(800);
  const [criticalThreshold, setCriticalThreshold] = useState<number>(0);
  
  useEffect(() => {
    if (settings) {
      setLowThreshold((settings.low_credit_threshold as number) || 800);
      setCriticalThreshold((settings.critical_credit_threshold as number) || 0);
    }
  }, [settings]);
  
  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'low_credit_threshold',
        value: lowThreshold,
      });
      await updateSetting.mutateAsync({
        key: 'critical_credit_threshold',
        value: criticalThreshold,
      });
      toast.success('Prahy kreditu byly uloženy');
    } catch (error) {
      toast.error('Chyba při ukládání');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="low-threshold">Práh nízkého kreditu (Kč)</Label>
        <Input
          id="low-threshold"
          type="number"
          value={lowThreshold}
          onChange={(e) => setLowThreshold(Number(e.target.value))}
          min={0}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="critical-threshold">Kritický práh (Kč)</Label>
        <Input
          id="critical-threshold"
          type="number"
          value={criticalThreshold}
          onChange={(e) => setCriticalThreshold(Number(e.target.value))}
        />
      </div>

      {/* Threshold visualization */}
      <div className="p-4 rounded-xl bg-secondary/30 space-y-3">
        <p className="text-sm font-medium text-foreground">Jak to funguje:</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <div className="p-1.5 rounded-lg bg-warning/20">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <span className="text-muted-foreground">
              Kredit &lt; <span className="font-semibold text-foreground">{lowThreshold} Kč</span> → Nízký kredit
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="p-1.5 rounded-lg bg-destructive/20">
              <Ban className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-muted-foreground">
              Kredit ≤ <span className="font-semibold text-foreground">{criticalThreshold} Kč</span> → Bez kreditu
            </span>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleSave} 
        disabled={updateSetting.isPending}
        className="w-full"
      >
        {updateSetting.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Uložit prahy
      </Button>
    </div>
  );
}
