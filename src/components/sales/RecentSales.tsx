import { Clock, RefreshCw, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useRecentSales, RecentSale } from '@/hooks/useRecentSales';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface RecentSalesProps {
  onRepeatSale: (sale: RecentSale) => void;
  className?: string;
}

export function RecentSales({ onRepeatSale, className }: RecentSalesProps) {
  const { data: recentSales = [], isLoading } = useRecentSales(3);

  if (isLoading) {
    return (
      <div className={cn("card-floating rounded-xl p-4", className)}>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-secondary/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold">Poslední prodeje</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (recentSales.length === 0) {
    return null; // Don't show section if no recent sales
  }

  return (
    <div className={cn("card-floating rounded-xl p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-secondary/50">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-semibold">Poslední prodeje</span>
        <span className="text-xs text-muted-foreground">
          (klikněte pro zopakování)
        </span>
      </div>
      
      <div className="space-y-2">
        {recentSales.map(sale => {
          const itemsPreview = sale.items
            .slice(0, 3)
            .map(i => i.quantity > 1 ? `${i.name_snapshot} (${i.quantity}×)` : i.name_snapshot)
            .join(', ');
          const moreItems = sale.items.length > 3 ? ` +${sale.items.length - 3}` : '';
          
          return (
            <button
              key={sale.id}
              onClick={() => onRepeatSale(sale)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl text-left group transition-all duration-200",
                "bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm",
                "hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  {sale.client_name ? (
                    <>
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{sale.client_name}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">Bez klienta</span>
                  )}
                  <span className="text-muted-foreground">•</span>
                  <span className="font-bold text-primary whitespace-nowrap tabular-nums">
                    {formatCurrency(sale.total_amount)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {itemsPreview}{moreItems}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    • {format(new Date(sale.created_at), 'd.M. HH:mm', { locale: cs })}
                  </span>
                </div>
              </div>
              
              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:rotate-180">
                <RefreshCw className="w-4 h-4 text-primary" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
