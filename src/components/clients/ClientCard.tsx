import { memo } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ChevronRight,
  Dumbbell,
  Plus,
  Wallet,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  Star,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Client } from '@/hooks/useClients';
import { GenderIcon } from '@/components/clients/GenderIcon';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface ClientTag {
  id: string;
  name: string;
  color: string;
}

interface NextTraining {
  id: string;
  date: string;
}

interface UnresolvedItems {
  unpaidCount: number;
  unpaidTotal: number;
  missingFeedback: number;
  hasHealthRestrictions: boolean;
}

interface ClientCardProps {
  client: Client;
  age: number | null;
  trainingCount: number;
  lastActivityDate?: string;
  tags: ClientTag[];
  isSharedBudget: boolean;
  sharedBudgetName?: string;
  displayBalance: number;
  actualBalance: number;
  nextTraining?: NextTraining;
  unresolvedItems: UnresolvedItems;
  isFavorite: boolean;
  onAddTraining: () => void;
  onAddCredit: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onToggleFavorite: () => void;
}

export const ClientCard = memo(function ClientCard({
  client,
  age,
  trainingCount,
  lastActivityDate,
  tags,
  isSharedBudget,
  sharedBudgetName,
  displayBalance,
  actualBalance,
  nextTraining,
  unresolvedItems,
  isFavorite,
  onAddTraining,
  onAddCredit,
  onEdit,
  onDelete,
  onArchive,
  onToggleFavorite,
}: ClientCardProps) {
  const totalUnresolved = 
    unresolvedItems.unpaidCount + 
    unresolvedItems.missingFeedback + 
    (unresolvedItems.hasHealthRestrictions ? 1 : 0);

  // Determine status color for left border
  const getStatusColor = () => {
    if (unresolvedItems.unpaidCount > 0) return 'border-l-destructive';
    if (actualBalance < 500) return 'border-l-warning';
    return 'border-l-success';
  };

  // Format next training date
  const formatNextTraining = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return `Dnes ${format(d, 'HH:mm')}`;
    if (isTomorrow(d)) return `Zítra ${format(d, 'HH:mm')}`;
    return format(d, 'EEE d.M. HH:mm', { locale: cs });
  };

  return (
    <div
      className={cn(
        "glass rounded-xl p-4 transition-all duration-200 hover:bg-secondary/50 group relative border-l-4",
        getStatusColor()
      )}
    >
      {/* Favorite button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          "absolute top-2 right-2 p-1 rounded transition-all z-10",
          isFavorite 
            ? "text-yellow-500" 
            : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-500"
        )}
      >
        <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
      </button>

      <Link to={`/clients/${client.id}`} className="block">
        {/* Header Row: Avatar + Name + Info */}
        <div className="flex items-start gap-3 pr-6">
          <ClientAvatar name={client.name} size="sm" className="flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {client.name}
              </h3>
              <GenderIcon gender={client.gender} />
              {age !== null && (
                <span className="text-xs text-muted-foreground">{age} let</span>
              )}
            </div>
            
            {/* Tags row */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                    className="border text-xs px-1.5 py-0 h-4"
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                    +{tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        {/* Stats Row: Credit + Trainings + Next Training */}
        <div className="flex items-center gap-3 mt-3 text-sm flex-wrap">
          <span className={cn(
            "font-semibold flex items-center gap-1",
            actualBalance <= 0 ? "text-destructive" : actualBalance < 500 ? "text-warning" : "text-success"
          )}>
            <Wallet className="w-3.5 h-3.5" />
            {formatCurrency(displayBalance)}
          </span>
          
          {isSharedBudget && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 gap-0.5">
              <LinkIcon className="w-2.5 h-2.5" />
              {sharedBudgetName}
            </Badge>
          )}

          {trainingCount > 0 && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Dumbbell className="w-3.5 h-3.5" />
              {trainingCount}×
            </span>
          )}

          {/* Unresolved items counter */}
          {totalUnresolved > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 text-destructive font-medium cursor-help">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {totalUnresolved}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-sm space-y-1">
                  {unresolvedItems.unpaidCount > 0 && (
                    <p>• {unresolvedItems.unpaidCount}× neuhrazený trénink ({formatCurrency(unresolvedItems.unpaidTotal)})</p>
                  )}
                  {unresolvedItems.missingFeedback > 0 && (
                    <p>• {unresolvedItems.missingFeedback}× chybí feedback</p>
                  )}
                  {unresolvedItems.hasHealthRestrictions && (
                    <p>• ⚠️ Zdravotní omezení</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Next Training Row */}
        {nextTraining && (
          <div className="flex items-center gap-2 mt-2 text-sm text-primary">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium">{formatNextTraining(nextTraining.date)}</span>
          </div>
        )}
      </Link>

      {/* Quick Actions - Always visible */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddTraining();
          }}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          Trénink
        </Button>
        
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-8 text-xs gap-1 hover:bg-success/10 hover:text-success"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddCredit();
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Kredit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Upravit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}>
              {client.is_archived ? (
                <>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Obnovit
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Archivovat
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
