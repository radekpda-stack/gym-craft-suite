import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type KPIVariant = 'success' | 'primary' | 'warning' | 'destructive' | 'muted' | 'accent';

export interface UnifiedKPICardProps {
  id?: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: KPIVariant;
  subLabel?: string;
  isActive?: boolean;
  onClick?: () => void;
}

const VARIANT_STYLES: Record<KPIVariant, { iconBg: string; iconText: string }> = {
  success: { iconBg: 'bg-success/10', iconText: 'text-success' },
  primary: { iconBg: 'bg-primary/10', iconText: 'text-primary' },
  warning: { iconBg: 'bg-warning/10', iconText: 'text-warning' },
  destructive: { iconBg: 'bg-destructive/10', iconText: 'text-destructive' },
  muted: { iconBg: 'bg-muted', iconText: 'text-muted-foreground' },
  accent: { iconBg: 'bg-accent/10', iconText: 'text-accent' },
};

export function UnifiedKPICard({
  label,
  value,
  icon: Icon,
  variant = 'primary',
  subLabel,
  isActive,
  onClick,
}: UnifiedKPICardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Card
      className={cn(
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:border-primary/30 hover:shadow-sm',
        isActive && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', styles.iconBg)}>
            <Icon className={cn('w-5 h-5', styles.iconText)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {subLabel && (
              <p className="text-[10px] text-muted-foreground/70 truncate">{subLabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
