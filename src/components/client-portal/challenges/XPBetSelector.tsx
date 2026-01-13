import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Zap, AlertTriangle, Loader2 } from 'lucide-react';
import { useClientXP, useSetXPBet } from '@/hooks/usePeerChallengeXPStats';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface XPBetSelectorProps {
  challengeId: string;
  currentBet?: number;
  minBet?: number;
  maxBet?: number;
  isCreator?: boolean;
  onBetChange?: (bet: number) => void;
  disabled?: boolean;
}

const QUICK_BETS = [10, 25, 50, 100, 200];

export function XPBetSelector({
  challengeId,
  currentBet = 0,
  minBet = 10,
  maxBet = 500,
  isCreator = false,
  onBetChange,
  disabled = false,
}: XPBetSelectorProps) {
  const [betAmount, setBetAmount] = useState(currentBet);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingBet, setPendingBet] = useState(0);
  
  const { data: clientXP, isLoading: loadingXP } = useClientXP();
  const setXPBet = useSetXPBet();
  const { toast } = useToast();

  const totalXP = clientXP?.total_xp || 0;
  const effectiveMax = Math.min(maxBet, totalXP);

  useEffect(() => {
    setBetAmount(currentBet);
  }, [currentBet]);

  const handleBetChange = (value: number[]) => {
    setBetAmount(value[0]);
  };

  const handleQuickBet = (amount: number) => {
    const clampedAmount = Math.min(amount, effectiveMax);
    setBetAmount(clampedAmount);
  };

  const handleConfirmBet = async () => {
    try {
      await setXPBet.mutateAsync({
        challengeId,
        xpBet: pendingBet,
      });
      
      toast({ title: `Sázka ${pendingBet} XP potvrzena!` });
      onBetChange?.(pendingBet);
      setShowConfirm(false);
    } catch (error: any) {
      toast({ 
        title: 'Chyba při nastavení sázky', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const handleSetBet = () => {
    if (betAmount === currentBet) return;
    
    if (betAmount > 0) {
      setPendingBet(betAmount);
      setShowConfirm(true);
    } else {
      // Setting to 0 - no confirmation needed
      setXPBet.mutate({ challengeId, xpBet: 0 });
      onBetChange?.(0);
    }
  };

  if (loadingXP) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (totalXP < minBet) {
    return (
      <div className="p-4 rounded-lg bg-muted/50 text-center">
        <Zap className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Potřebuješ alespoň {minBet} XP pro sázku
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Máš: {totalXP} XP
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <Label className="font-medium">Vsadit XP</Label>
          </div>
          <Badge variant="outline" className="text-xs">
            Max: {effectiveMax} XP
          </Badge>
        </div>

        {/* Quick bet buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_BETS.filter(b => b <= effectiveMax).map((amount) => (
            <Button
              key={amount}
              variant={betAmount === amount ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickBet(amount)}
              disabled={disabled}
              className="flex-1 min-w-[60px]"
            >
              {amount}
            </Button>
          ))}
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <Slider
            value={[betAmount]}
            onValueChange={handleBetChange}
            min={0}
            max={effectiveMax}
            step={5}
            disabled={disabled}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0 XP</span>
            <span>{effectiveMax} XP</span>
          </div>
        </div>

        {/* Current bet display */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
          <span className="text-sm">Tvoje sázka:</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.min(Number(e.target.value), effectiveMax))}
              className="w-20 h-8 text-right"
              min={0}
              max={effectiveMax}
              disabled={disabled}
            />
            <span className="text-sm font-medium">XP</span>
          </div>
        </div>

        {/* Potential outcomes */}
        {betAmount > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded bg-green-500/10 text-center">
              <div className="text-green-600 font-bold">+{betAmount * 2} XP</div>
              <div className="text-xs text-muted-foreground">Při výhře</div>
            </div>
            <div className="p-2 rounded bg-red-500/10 text-center">
              <div className="text-red-600 font-bold">-{betAmount} XP</div>
              <div className="text-xs text-muted-foreground">Při prohře</div>
            </div>
          </div>
        )}

        {/* Confirm button */}
        {betAmount !== currentBet && (
          <Button 
            onClick={handleSetBet}
            disabled={disabled || setXPBet.isPending}
            className="w-full"
          >
            {setXPBet.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {betAmount === 0 ? 'Zrušit sázku' : `Vsadit ${betAmount} XP`}
          </Button>
        )}

        {currentBet > 0 && betAmount === currentBet && (
          <div className="text-center text-sm text-muted-foreground">
            ✓ Sázka {currentBet} XP je aktivní
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Potvrdit sázku
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Chceš vsadit <strong>{pendingBet} XP</strong> na tuto výzvu?
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-3 rounded bg-green-500/10 text-center">
                  <div className="text-green-600 font-bold text-lg">+{pendingBet * 2} XP</div>
                  <div className="text-muted-foreground">Pokud vyhraješ</div>
                </div>
                <div className="p-3 rounded bg-red-500/10 text-center">
                  <div className="text-red-600 font-bold text-lg">-{pendingBet} XP</div>
                  <div className="text-muted-foreground">Pokud prohraješ</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Sázka bude vyhodnocena po skončení výzvy. XP budou automaticky přičteny/odečteny.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmBet}
              disabled={setXPBet.isPending}
            >
              {setXPBet.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Potvrdit sázku
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
