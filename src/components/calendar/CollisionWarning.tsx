import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollisionWarningProps {
  type: 'own' | 'shared';
  message: string;
  className?: string;
}

export function CollisionWarning({ type, message, className }: CollisionWarningProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-lg text-sm',
      type === 'own' 
        ? 'bg-destructive/10 text-destructive border border-destructive/30'
        : 'bg-warning/10 text-warning border border-warning/30',
      className
    )}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
