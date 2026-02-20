import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, FileText, ClipboardCheck, Package, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStockMovements, MovementType } from '@/hooks/useStockMovements';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const MOVEMENT_CONFIG: Record<MovementType, { label: string; icon: typeof Package; colorClass: string; sign: string }> = {
  restock: { label: 'Naskladnění', icon: ArrowDownToLine, colorClass: 'text-success', sign: '+' },
  sale: { label: 'Prodej', icon: ArrowUpFromLine, colorClass: 'text-destructive', sign: '' },
  adjustment: { label: 'Úprava', icon: RefreshCw, colorClass: 'text-warning', sign: '' },
  invoice_import: { label: 'Faktura', icon: FileText, colorClass: 'text-primary', sign: '+' },
  inventura: { label: 'Inventura', icon: ClipboardCheck, colorClass: 'text-accent', sign: '' },
};

export function StockMovementsTimeline() {
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
  const { data: movements = [], isLoading } = useStockMovements(
    filterProduct !== 'all' ? filterProduct : undefined
  );
  const { data: products = [] } = useProducts();

  const inventoryProducts = useMemo(() => 
    products.filter(p => p.kind === 'inventory').sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [products]
  );

  const filteredMovements = useMemo(() => {
    if (filterType === 'all') return movements;
    return movements.filter(m => m.movement_type === filterType);
  }, [movements, filterType]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredMovements> = {};
    filteredMovements.forEach(m => {
      const dateKey = format(new Date(m.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredMovements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Package className="w-6 h-6 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Všechny produkty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny produkty</SelectItem>
            {inventoryProducts.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Všechny typy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            {Object.entries(MOVEMENT_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {groupedByDate.length === 0 ? (
        <div className="card-floating rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Zatím žádné pohyby skladu</p>
          <p className="text-xs text-muted-foreground mt-1">Pohyby se zaznamenají automaticky při prodeji, naskladnění nebo inventuře.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([dateKey, dayMovements]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border/50" />
                <span className="text-xs font-medium text-muted-foreground px-2">
                  {format(new Date(dateKey), 'd. MMMM yyyy', { locale: cs })}
                </span>
                <div className="h-px flex-1 bg-border/50" />
              </div>
              <div className="space-y-1.5">
                {dayMovements.map(movement => {
                  const config = MOVEMENT_CONFIG[movement.movement_type];
                  const Icon = config.icon;
                  const qty = movement.quantity;
                  const displaySign = qty > 0 ? '+' : '';

                  return (
                    <div
                      key={movement.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-card/60 border border-border/30 hover:bg-card/80 transition-colors"
                    >
                      <div className={cn("p-1.5 rounded-lg bg-secondary/50 shrink-0", config.colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-bold tabular-nums text-sm", config.colorClass)}>
                            {displaySign}{qty} ks
                          </span>
                          <span className="font-medium text-sm text-foreground truncate">
                            {movement.product_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 h-5">
                            {config.label}
                          </Badge>
                        </div>
                        {(movement.note || movement.source_ref) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {movement.note}
                            {movement.source_ref && ` (${movement.source_ref})`}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {movement.unit_price > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(movement.unit_price)}/ks
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60">
                          {format(new Date(movement.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
