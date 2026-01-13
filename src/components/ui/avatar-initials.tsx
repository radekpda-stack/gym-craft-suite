import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base'
};

// Generate consistent color based on name
function getColorFromName(name: string): string {
  const colors = [
    'bg-accent/15 text-accent',
    'bg-success/15 text-success',
    'bg-primary/15 text-primary',
    'bg-warning/15 text-warning',
    'bg-destructive/15 text-destructive',
    'bg-muted text-muted-foreground',
    'bg-accent/20 text-accent',
    'bg-primary/20 text-primary',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AvatarInitials({ name, className, size = 'md' }: AvatarInitialsProps) {
  const initials = getInitials(name);
  const colorClass = getColorFromName(name);
  
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium shrink-0',
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
