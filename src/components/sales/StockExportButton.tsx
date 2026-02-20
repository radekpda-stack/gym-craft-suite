import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProducts } from '@/hooks/useProducts';
import { useStockVelocity } from '@/hooks/useStockVelocity';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function StockExportButton() {
  const { data: products = [] } = useProducts();
  const { data: velocityMap } = useStockVelocity();

  const handleExport = () => {
    const inventoryProducts = products.filter(p => p.kind === 'inventory');
    
    if (inventoryProducts.length === 0) {
      toast({ title: 'Žádné skladové položky k exportu', variant: 'destructive' });
      return;
    }

    const rows = inventoryProducts.map(p => {
      const margin = p.purchase_price > 0 ? Math.round((1 - p.purchase_price / p.price) * 100) : 0;
      const velocity = velocityMap?.[p.id];
      return {
        'Název': p.name,
        'Kategorie': p.category,
        'Skladem (ks)': p.stock_quantity,
        'Nákupní cena (Kč)': p.purchase_price,
        'Prodejní cena (Kč)': p.price,
        'Marže (%)': margin,
        'Hodnota skladu (Kč)': Math.round(p.stock_quantity * p.purchase_price * 100) / 100,
        'Průměrný denní prodej': velocity?.avgDailySales ? Math.round(velocity.avgDailySales * 10) / 10 : 0,
        'Zbývá dní': velocity?.daysRemaining ?? '-',
        'Aktivní': p.is_active ? 'Ano' : 'Ne',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sklad');
    
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `sklad-export-${dateStr}.xlsx`);

    toast({ title: 'Export dokončen', description: `Exportováno ${rows.length} položek.` });
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}
