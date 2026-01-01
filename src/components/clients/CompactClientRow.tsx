import { memo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Calendar, Star } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreditStatusBadge } from '@/components/ui/CreditStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { Client } from '@/hooks/useClients';
import { Tag } from '@/hooks/useTags';
import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

interface CompactClientRowProps {
  client: Client;
  tags?: Tag[];
  nextTraining?: { date: string; time?: string } | null;
  onNewTraining?: () => void;
  onAddCredit?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onToggleFavorite?: () => void;
  className?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatNextTraining(date: string, time?: string): string {
  const dateObj = parseISO(date);
  
  if (isToday(dateObj)) {
    return time ? `Dnes ${time}` : 'Dnes';
  }
  if (isTomorrow(dateObj)) {
    return time ? `Zítra ${time}` : 'Zítra';
  }
  
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: cs });
}

export const CompactClientRow = memo(function CompactClientRow({
  client,
  tags = [],
  nextTraining,
  onNewTraining,
  onAddCredit,
  onEdit,
  onArchive,
  onToggleFavorite,
  className,
}: CompactClientRowProps) {
  const { offsetX, isDragging, direction, handlers } = useSwipeGesture({
    threshold: 80,
    maxOffset: 120,
    onSwipeRight: onNewTraining,
    onSwipeLeft: onAddCredit,
  });

  const showTrainingHint = direction === 'right' && onNewTraining;
  const showCreditHint = direction === 'left' && onAddCredit;
  const firstTag = tags[0];

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Swipe background - Training (right) */}
      {onNewTraining && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start px-4 transition-opacity',
            'bg-primary',
            showTrainingHint ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(offsetX) + 16 }}
        >
          <Calendar className="w-5 h-5 text-primary-foreground" />
        </div>
      )}

      {/* Swipe background - Credit (left) */}
      {onAddCredit && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-4 transition-opacity',
            'bg-success',
            showCreditHint ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: Math.abs(offsetX) + 16 }}
        >
          <span className="text-success-foreground font-semibold text-sm">+Kč</span>
        </div>
      )}

      {/* Main row content */}
      <div
        {...handlers}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="relative bg-card"
      >
        <Link
          to={`/clients/${client.id}`}
          className={cn(
            'flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors',
            'min-h-[56px]'
          )}
        >
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>

          {/* Name + Tag */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate">
                {client.name}
              </span>
              {client.is_favorite && (
                <Star className="w-3.5 h-3.5 text-warning fill-warning flex-shrink-0" />
              )}
            </div>
            {firstTag && (
              <Badge variant="outline" className="mt-0.5 text-[10px] px-1.5 py-0">
                {firstTag.name}
              </Badge>
            )}
          </div>

          {/* Indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <CreditStatusBadge balance={client.credit_balance} />
            
            {nextTraining && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatNextTraining(nextTraining.date, nextTraining.time)}
              </span>
            )}
          </div>

          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onNewTraining && (
                <DropdownMenuItem onClick={onNewTraining}>
                  Nový trénink
                </DropdownMenuItem>
              )}
              {onAddCredit && (
                <DropdownMenuItem onClick={onAddCredit}>
                  Dobít kredit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Upravit
                </DropdownMenuItem>
              )}
              {onToggleFavorite && (
                <DropdownMenuItem onClick={onToggleFavorite}>
                  {client.is_favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive} className="text-destructive">
                  {client.is_archived ? 'Obnovit' : 'Archivovat'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </Link>
      </div>
    </div>
  );
});
