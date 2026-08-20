import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, FileText, ClipboardCheck, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStockMovements, MovementType } from '@/hooks/useStockMovements';
import { useProducts } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  SalesChipFilter,
  SalesEmptyState,
  SalesListSkeleton,
  SalesSummaryStrip,
  type ChipOption,
} from './ui/SalesUI';

const MOVEMENT_CONFIG: Record<MovementType, { label: string; icon: typeof Package; colorClass: string }> = {
  restock: { label: 'Naskladnění', icon: ArrowDownToLine, colorClass: 'text-success' },
  sale: { label: 'Prodej', icon: ArrowUpFromLine, colorClass: 'text-destructive' },
  adjustment: { label: 'Úprava', icon: RefreshCw, colorClass: 'text-warning' },
  invoice_import: { label: 'Faktura', icon: FileText, colorClass: 'text-primary' },
  inventura: { label: 'Inventura', icon: ClipboardCheck, colorClass: 'text-accent' },
};

const DIRECTION_FILTERS: ChipOption<string>[] = [
  { value: 'all', label: 'Vše' },
  { value: 'in', label: 'Naskladnění' },
  { value: 'out', label: 'Vyskladnění' },
  { value: 'inventura', label: 'Inventura' },
];

export function StockMovementsTimeline() {
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');

  const { data: movements = [], isLoading } = useStockMovements(
    filterProduct !== 'all' ? filterProduct : undefined
  );
  const { data: products = [] } = useProducts();

  const inventoryProducts = useMemo(() =>
    products.filter(p => p.kind === 'inventory').sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [products]
  );

  const filteredMovements = useMemo(() => {
    let result = movements;
    if (filterType !== 'all') {
      result = result.filter(m => m.movement_type === filterType);
    }
    if (directionFilter !== 'all') {
      switch (directionFilter) {
        case 'in':
          result = result.filter(m => m.quantity > 0);
          break;
        case 'out':
          result = result.filter(m => m.quantity < 0);
          break;
        case 'inventura':
          result = result.filter(m => m.movement_type === 'inventura');
          break;
      }
    }
    return result;
  }, [movements, filterType, directionFilter]);

  const kpi = useMemo(() => {
    const totalIn = filteredMovements.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
    const totalOut = filteredMovements.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);
    return { totalIn, totalOut, count: filteredMovements.length };
  }, [filteredMovements]);

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
      <div className="space-y-4">
        <SalesListSkeleton count={2} className="h-auto" />
        <SalesListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filtry */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger className="h-11 rounded-xl text-xs">
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
            <SelectTrigger className="h-11 rounded-xl text-xs">
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

        <SalesChipFilter
          options={DIRECTION_FILTERS}
          value={directionFilter}
          onChange={setDirectionFilter}
        />
      </div>

      {/* Souhrn */}
      {filteredMovements.length > 0 && (
        <SalesSummaryStrip
          items={[
            { label: 'Naskladněno', value: `+${kpi.totalIn} ks`, tone: 'success', icon: ArrowDownToLine },
            { label: 'Vyskladněno', value: `-${kpi.totalOut} ks`, tone: 'destructive', icon: ArrowUpFromLine },
            { label: 'Pohybů', value: String(kpi.count), icon: Package },
          ]}
        />
      )}

      {/* Timeline */}
      {groupedByDate.length === 0 ? (
        <div className="section-card">
          <SalesEmptyState
            icon={Package}
            title="Zatím žádné pohyby skladu"
            description="Pohyby se zaznamenají automaticky při prodeji, naskladnění nebo inventuře."
          />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {groupedByDate.map(([dateKey, dayMovements]) => (
            <div key={dateKey} className="space-y-2">
              <div className="sticky top-0 z-10 -mx-1 px-1 py-1.5 bg-background/85 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {format(new Date(dateKey), 'EEEE d. MMMM yyyy', { locale: cs })}
                </p>
              </div>

              <div className="section-card divide-y divide-border/40">
                {dayMovements.map(movement => {
                  const config = MOVEMENT_CONFIG[movement.movement_type];
                  const Icon = config.icon;
                  const qty = movement.quantity;

                  return (
                    <div key={movement.id} className="flex items-center gap-3 p-4 min-w-0">
                      <div className={cn('p-1.5 rounded-xl bg-muted/60 shrink-0', config.colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {movement.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {config.label}
                          {movement.note ? ` · ${movement.note}` : ''}
                          {movement.source_ref ? ` (${movement.source_ref})` : ''}
                          {' · '}
                          <span className="tabular-nums">
                            {format(new Date(movement.created_at), 'HH:mm')}
                          </span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn('text-base font-bold tabular-nums', config.colorClass)}>
                          {qty > 0 ? '+' : ''}{qty} ks
                        </p>
                        {movement.unit_price > 0 && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {formatCurrency(movement.unit_price)}/ks
                          </p>
                        )}
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
