import { useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { PORTION_GRAMS } from '@/components/client-portal/nutrition/constants';

interface ChatGPTExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  periodStart: Date;
  periodEnd: Date;
  entriesByDate: Map<string, { food: any[]; drinks: any[]; coffee: any[] }>;
  periodDates: Date[];
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Snídaně',
  lunch: 'Oběd',
  dinner: 'Večeře',
  snack: 'Svačina',
};

const portionLabels: Record<string, string> = {
  small: 'malá porce',
  medium: 'střední porce',
  large: 'velká porce',
};

const drinkTypeLabels: Record<string, string> = {
  water: 'Voda',
  sugary: 'Slazený nápoj',
  sports: 'Sportovní nápoj',
  alcohol: 'Alkohol',
  other: 'Ostatní',
};

const coffeeTypeLabels: Record<string, string> = {
  espresso: 'Espresso',
  cappuccino: 'Cappuccino',
  tea: 'Čaj',
  energy: 'Energy drink',
  other: 'Jiný kofein',
};

const getEntryTime = (entry: any): string => {
  if (entry.occurred_at) {
    try {
      return format(parseISO(entry.occurred_at), 'HH:mm');
    } catch {}
  }
  if (entry.entry_time) {
    return entry.entry_time.slice(0, 5);
  }
  return '--:--';
};

export function ChatGPTExportDialog({
  open,
  onOpenChange,
  clientName,
  periodStart,
  periodEnd,
  entriesByDate,
  periodDates,
}: ChatGPTExportDialogProps) {
  const [copied, setCopied] = useState(false);

  const generateExportText = (): string => {
    const lines: string[] = [];
    
    lines.push(`Nutriční deník: ${clientName}`);
    lines.push(`Období: ${format(periodStart, 'd.M.', { locale: cs })} - ${format(periodEnd, 'd.M.yyyy', { locale: cs })}`);
    lines.push('');

    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];

    periodDates.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entriesByDate.get(dateStr);
      
      if (!dayEntries) return;
      
      const hasAnyEntries = dayEntries.food.length > 0 || dayEntries.drinks.length > 0 || dayEntries.coffee.length > 0;
      
      if (!hasAnyEntries) return;

      lines.push(`=== ${dayNames[day.getDay()]} ${format(day, 'd.M.yyyy', { locale: cs })} ===`);
      lines.push('');

      // Food entries
      if (dayEntries.food.length > 0) {
        lines.push('JÍDLO:');
        dayEntries.food.forEach(f => {
          const time = getEntryTime(f);
          const mealType = mealTypeLabels[f.meal_type] || f.meal_type;
          const portion = portionLabels[f.portion_size] || f.portion_size || '';
          const grams = PORTION_GRAMS[f.portion_size] || '';
          
          let line = `• ${time} - ${mealType}: ${f.description}`;
          if (portion) {
            line += `, ${portion}`;
            if (grams) line += ` (${grams})`;
          }
          if (f.client_note) {
            line += ` [${f.client_note}]`;
          }
          lines.push(line);
        });
        lines.push('');
      }

      // Drink entries
      if (dayEntries.drinks.length > 0) {
        lines.push('NÁPOJE:');
        dayEntries.drinks.forEach(d => {
          const time = getEntryTime(d);
          const drinkType = drinkTypeLabels[d.drink_type] || d.drink_type;
          const amount = d.amount_ml ? `${d.amount_ml}ml` : '';
          
          let line = `• ${time} - ${drinkType}`;
          if (amount) line += ` ${amount}`;
          if (d.drink_name) line += ` (${d.drink_name})`;
          lines.push(line);
        });
        lines.push('');
      }

      // Coffee entries
      if (dayEntries.coffee.length > 0) {
        lines.push('KOFEIN:');
        dayEntries.coffee.forEach(c => {
          const time = getEntryTime(c);
          const coffeeType = coffeeTypeLabels[c.coffee_type] || c.coffee_type;
          const count = c.count > 1 ? `(${c.count}×)` : '(1×)';
          const decaf = c.is_caffeinated === false ? ' [bez kofeinu]' : '';
          
          lines.push(`• ${time} - ${coffeeType} ${count}${decaf}`);
        });
        lines.push('');
      }
    });

    return lines.join('\n');
  };

  const exportText = generateExportText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      toast.success('Text zkopírován do schránky');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Nepodařilo se zkopírovat');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `denik-navyku_${clientName.replace(/\s+/g, '_')}_${format(periodStart, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Soubor stažen');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Export pro ChatGPT
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {exportText}
            </pre>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Stáhnout .txt
            </Button>
            <Button onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Zkopírováno
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Kopírovat
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
