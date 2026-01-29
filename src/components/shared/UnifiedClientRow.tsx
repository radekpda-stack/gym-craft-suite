import { ChevronRight, LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ClientRowStatus = 'active' | 'warning' | 'inactive';

export interface ClientRowBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  icon?: LucideIcon;
}

export interface UnifiedClientRowProps {
  client: {
    id: string;
    name: string;
    photo_url?: string | null;
  };
  status?: ClientRowStatus;
  primaryText: string;
  secondaryText?: string;
  badges?: ClientRowBadge[];
  onClick?: () => void;
  className?: string;
}

const STATUS_STYLES: Record<ClientRowStatus, { border: string; fallbackBg: string; fallbackText: string }> = {
  active: { 
    border: '', 
    fallbackBg: 'bg-success/10', 
    fallbackText: 'text-success' 
  },
  warning: { 
    border: 'border-l-4 border-l-destructive', 
    fallbackBg: 'bg-destructive/10', 
    fallbackText: 'text-destructive' 
  },
  inactive: { 
    border: '', 
    fallbackBg: 'bg-muted', 
    fallbackText: 'text-muted-foreground' 
  },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UnifiedClientRow({
  client,
  status = 'inactive',
  primaryText,
  secondaryText,
  badges,
  onClick,
  className,
}: UnifiedClientRowProps) {
  const styles = STATUS_STYLES[status];
  const initials = getInitials(client.name);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border border-border bg-card p-3 transition-all duration-150',
        'hover:border-primary/30 hover:bg-card/80',
        styles.border,
        className
      )}
    >
      {/* Row 1: Avatar, Name, Badges, Arrow */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={client.photo_url || undefined} alt={client.name} />
          <AvatarFallback className={cn('text-xs font-medium', styles.fallbackBg, styles.fallbackText)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Name + Badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate max-w-[180px] sm:max-w-none">
            {client.name}
          </p>
          {badges?.map((badge, idx) => (
            <Badge 
              key={idx} 
              variant={badge.variant || 'secondary'}
              className="shrink-0 text-[10px] px-1.5 py-0.5 h-5"
            >
              {badge.icon && <badge.icon className="h-3 w-3 mr-1" />}
              {badge.label}
            </Badge>
          ))}
        </div>
        
        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Row 2: Primary and Secondary text */}
      <div className="mt-1.5 ml-12 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span>{primaryText}</span>
        {secondaryText && (
          <>
            <span className="hidden sm:inline text-muted-foreground/50">•</span>
            <span>{secondaryText}</span>
          </>
        )}
      </div>
    </div>
  );
}
