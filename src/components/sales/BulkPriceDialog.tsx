import { useState } from 'react';
import { Percent } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';

interface BulkPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: Product[];
  onApply: (changes: { id: string; price: number }[]) => void;
}

export function BulkPriceDialog({ open, onOpenChange, selectedProducts, onApply }: BulkPriceDialogProps) {
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [percent, setPercent] = useState('10');

  const pctValue = parseFloat(percent) || 0;
  const multiplier = direction === 'increase' ? 1 + pctValue / 100 : 1 - pctValue / 100;

  const previews = selectedProducts.map(p => ({
    id: p.id,
    name: p.name,
    oldPrice: p.price,
    newPrice: Math.round(p.price * multiplier),
  }));

  const handleApply = () => {
    onApply(previews.map(p => ({ id: p.id, price: p.newPrice })));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-primary" />
            Hromadná změna ceny ({selectedProducts.length} položek)
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Select value={direction} onValueChange={v => setDirection(v as 'increase' | 'decrease')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="increase">Navýšit</SelectItem>
              <SelectItem value="decrease">Snížit</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={percent}
            onChange={e => setPercent(e.target.value)}
            className="w-20"
            min={0}
            max={100}
          />
          <Label className="text-sm">%</Label>
        </div>

        <div className="space-y-1 max-h-[40vh] overflow-y-auto mt-2">
          {previews.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-secondary/30">
              <span className="truncate flex-1 mr-2">{p.name}</span>
              <span className="text-muted-foreground line-through mr-2 tabular-nums">{formatCurrency(p.oldPrice)}</span>
              <span className="font-bold tabular-nums">{formatCurrency(p.newPrice)}</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={handleApply} disabled={pctValue <= 0}>Aplikovat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
