import { useState, useMemo } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TaxCalculatorProps {
  yearlyIncome: number;
  yearlyExpenses: number;
}

// Czech tax calculation for 2024
// - Tax rate: 15% up to 1,935,552 CZK, 23% above
// - Social insurance: 29.2% (self-employed pay from 50% of profit)
// - Health insurance: 13.5% (self-employed pay from 50% of profit)
// - Basic tax deduction: 30,840 CZK

export function TaxCalculator({ yearlyIncome, yearlyExpenses }: TaxCalculatorProps) {
  const [additionalExpenses, setAdditionalExpenses] = useState('');
  const [useFlatRate, setUseFlatRate] = useState(false);

  const calculations = useMemo(() => {
    const extraExpenses = parseFloat(additionalExpenses) || 0;
    const totalExpenses = yearlyExpenses + extraExpenses;
    
    // Flat rate expense deduction (60% for services, up to 1.2M CZK)
    const flatRateExpenses = Math.min(yearlyIncome * 0.6, 1200000);
    
    const effectiveExpenses = useFlatRate ? flatRateExpenses : totalExpenses;
    const profit = Math.max(0, yearlyIncome - effectiveExpenses);
    
    // Tax base
    const taxBase = Math.floor(profit / 100) * 100; // Round down to hundreds
    
    // Income tax calculation (15% up to threshold, 23% above)
    const taxThreshold = 1935552;
    let incomeTax = 0;
    if (taxBase <= taxThreshold) {
      incomeTax = taxBase * 0.15;
    } else {
      incomeTax = taxThreshold * 0.15 + (taxBase - taxThreshold) * 0.23;
    }
    
    // Apply basic tax deduction
    const basicDeduction = 30840;
    incomeTax = Math.max(0, incomeTax - basicDeduction);
    
    // Social and health insurance base (50% of profit for OSVČ)
    const insuranceBase = profit * 0.5;
    
    // Minimum bases for 2024
    const minSocialBase = 11136 * 12; // Monthly minimum * 12
    const minHealthBase = 20195; // Annual minimum
    
    const socialBase = Math.max(insuranceBase, minSocialBase);
    const healthBase = Math.max(insuranceBase, minHealthBase);
    
    // Insurance rates
    const socialInsurance = socialBase * 0.292;
    const healthInsurance = healthBase * 0.135;
    
    const totalTaxBurden = incomeTax + socialInsurance + healthInsurance;
    const netIncome = yearlyIncome - totalExpenses - totalTaxBurden;
    const effectiveTaxRate = yearlyIncome > 0 ? (totalTaxBurden / yearlyIncome) * 100 : 0;
    
    return {
      profit,
      taxBase,
      incomeTax,
      socialInsurance,
      healthInsurance,
      totalTaxBurden,
      netIncome,
      effectiveTaxRate,
      flatRateExpenses,
    };
  }, [yearlyIncome, yearlyExpenses, additionalExpenses, useFlatRate]);

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Kalkulátor daně z příjmů
            </h3>
            <p className="text-sm text-muted-foreground">
              Odhad pro OSVČ v ČR (2024)
            </p>
          </div>
        </div>
      </div>

      {/* Income Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground">Roční příjmy</p>
          <p className="text-xl font-bold text-foreground">
            {yearlyIncome.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground">Výdaje</p>
          <p className="text-xl font-bold text-foreground">
            {(yearlyExpenses + (parseFloat(additionalExpenses) || 0)).toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground">Základ daně</p>
          <p className="text-xl font-bold text-foreground">
            {calculations.taxBase.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
        <div className="p-4 rounded-xl bg-success/10">
          <p className="text-sm text-muted-foreground">Čistý zisk</p>
          <p className="text-xl font-bold text-success">
            {calculations.profit.toLocaleString('cs-CZ')} Kč
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label>Další výdaje (nájem, vybavení, ...)</Label>
          <Input
            type="number"
            value={additionalExpenses}
            onChange={(e) => setAdditionalExpenses(e.target.value)}
            placeholder="0"
            className="mt-2"
          />
        </div>
        <div className="flex-1 flex items-end">
          <button
            onClick={() => setUseFlatRate(!useFlatRate)}
            className={cn(
              "w-full p-3 rounded-xl border transition-all text-left",
              useFlatRate 
                ? "border-primary bg-primary/10 text-foreground" 
                : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
            )}
          >
            <p className="font-medium">Paušální výdaje (60%)</p>
            <p className="text-sm opacity-70">
              {calculations.flatRateExpenses.toLocaleString('cs-CZ')} Kč
            </p>
          </button>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="space-y-3">
        <h4 className="font-medium text-foreground flex items-center gap-2">
          Rozpad odvodů
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Odhad zahrnuje daň z příjmů (15%/23%), sociální pojištění (29.2%) a zdravotní pojištění (13.5%). Skutečná částka se může lišit.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h4>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-muted-foreground">Daň z příjmů (po slevě 30 840 Kč)</span>
            <span className="font-medium text-foreground">
              {Math.round(calculations.incomeTax).toLocaleString('cs-CZ')} Kč
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-muted-foreground">Sociální pojištění (29.2%)</span>
            <span className="font-medium text-foreground">
              {Math.round(calculations.socialInsurance).toLocaleString('cs-CZ')} Kč
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <span className="text-muted-foreground">Zdravotní pojištění (13.5%)</span>
            <span className="font-medium text-foreground">
              {Math.round(calculations.healthInsurance).toLocaleString('cs-CZ')} Kč
            </span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="font-medium text-foreground">Celkové odvody</span>
            <span className="font-bold text-destructive text-lg">
              {Math.round(calculations.totalTaxBurden).toLocaleString('cs-CZ')} Kč
            </span>
          </div>
        </div>
      </div>

      {/* Final Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <p className="text-sm text-muted-foreground">Čistý příjem po odvodech</p>
          <p className="text-2xl font-bold text-success">
            {Math.round(calculations.netIncome).toLocaleString('cs-CZ')} Kč
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ~{Math.round(calculations.netIncome / 12).toLocaleString('cs-CZ')} Kč/měsíc
          </p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm text-muted-foreground">Efektivní daňová sazba</p>
          <p className="text-2xl font-bold text-foreground">
            {calculations.effectiveTaxRate.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            z celkových příjmů
          </p>
        </div>
      </div>
    </div>
  );
}