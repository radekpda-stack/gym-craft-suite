import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
/** Kompatibilní typ ikony (lucide i vlastní SVG komponenty). */
export type SalesIcon = React.ComponentType<{ className?: string }>;

/* ============================================================
   Sdílené prezentační primitivy pro sekci Prodej.
   Pouze UI — žádná business logika.
   ============================================================ */

/** Nadpis sekce s ikonou, popiskem a volitelnou akcí vpravo. */
export function SalesSectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: {
  icon?: SalesIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 min-w-0', className)}>
      {Icon && (
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm sm:text-base font-bold text-foreground truncate">{title}</h2>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Prázdný stav: ikona + text + primární akce. */
export function SalesEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: SalesIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-10', className)}>
      <div className="p-3.5 rounded-2xl bg-muted/50 mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-[26rem]">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4 press-feedback">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  icon?: SalesIcon;
  count?: number;
}

/** Horizontálně scrollovatelné filtrovací chipy. */
export function SalesChipFilter<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: any) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5',
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
              'transition-colors duration-150 press-feedback whitespace-nowrap',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-bold',
                  active ? 'bg-primary-foreground/20' : 'bg-background/60'
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Segmentovaný ikonový přepínač (např. způsob platby). */
export function SalesSegmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; icon?: SalesIcon }[];
  value: T;
  onChange: (value: any) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-1 p-1 rounded-xl bg-muted/50', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 min-h-[44px] min-w-0',
              'text-[11px] font-medium transition-all duration-150 press-feedback',
              active
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {Icon && <Icon className={cn('w-4 h-4', active && 'text-primary')} />}
            <span className="truncate w-full text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Kompaktní souhrnný pruh s metrikami. */
export function SalesSummaryStrip({
  items,
  className,
}: {
  items: {
    label: string;
    value: string;
    tone?: 'default' | 'success' | 'warning' | 'destructive';
    icon?: SalesIcon;
  }[];
  className?: string;
}) {
  const toneClass = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  } as const;

  return (
    <div
      className={cn(
        'grid gap-2',
        items.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3',
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="section-card p-2.5 min-w-0">
            <div className="flex items-center gap-1 mb-0.5 min-w-0">
              {Icon && <Icon className="w-3 h-3 text-muted-foreground shrink-0" />}
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                {item.label}
              </span>
            </div>
            <p className={cn('text-base sm:text-lg font-bold tabular-nums truncate', toneClass[item.tone ?? 'default'])}>
              {item.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** Barevný ukazatel stavu zásoby. */
export function StockBar({
  quantity,
  threshold,
  className,
}: {
  quantity: number;
  threshold: number;
  className?: string;
}) {
  const safeThreshold = threshold > 0 ? threshold : 1;
  const full = Math.max(safeThreshold * 3, 1);
  const pct = Math.min(100, Math.max(0, (quantity / full) * 100));
  const tone =
    quantity <= 0
      ? 'bg-destructive'
      : quantity <= safeThreshold
      ? 'bg-warning'
      : 'bg-success';

  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-300', tone)}
        style={{ width: `${quantity <= 0 ? 100 : Math.max(pct, 6)}%` }}
      />
    </div>
  );
}

/** Iniciálový avatar klienta. */
export function ClientAvatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const sizes = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
  } as const;

  return (
    <div
      className={cn(
        'shrink-0 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center',
        sizes[size],
        className
      )}
    >
      {initials || '?'}
    </div>
  );
}

/** Skeleton grid pro načítání dlaždic. */
export function SalesTileSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] rounded-2xl" />
      ))}
    </div>
  );
}

/** Skeleton pro seznamy / timeline. */
export function SalesListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

/** Sbalitelná sekce se zvýrazněnou hlavičkou. */
export function SalesCollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
  right,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="section-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-left press-feedback-subtle"
      >
        <span className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">{title}</span>
        {count !== undefined && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {count}
          </span>
        )}
        {right}
        <span
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        >
          ▾
        </span>
      </button>
      {open && <div className="px-2.5 pb-2.5 pt-0 animate-fade-in">{children}</div>}
    </div>
  );
}
