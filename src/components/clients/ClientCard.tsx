import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Wallet,
  MoreHorizontal,
  Calendar,
  Star,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  CreditCard,
  MessageSquareWarning,
  HeartPulse,
  Clock,
  Briefcase,
  Moon,
  Activity,
  AlertCircle,
  Utensils,
  Pill,
  User,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

// Helper to check if client has personal data
function hasPersonalData(client: Client): boolean {
  return !!(
    client.occupation ||
    client.sports_history ||
    client.current_activities?.length ||
    client.sleep_hours ||
    client.stress_level ||
    client.dietary_restrictions?.length ||
    client.supplements?.length ||
    client.sitting_hours_daily ||
    client.health_restrictions
  );
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
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if any unresolved items exist
  const hasAnyUnresolved = 
    unresolvedItems.unpaidCount > 0 || 
    unresolvedItems.missingFeedback > 0 || 
    unresolvedItems.hasHealthRestrictions;

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

  // Credit balance color
  const getCreditColor = () => {
    if (actualBalance <= 0) return 'text-destructive';
    if (actualBalance < 500) return 'text-warning';
    return 'text-emerald-400';
  };

  // Calculate days since last training
  const getDaysSinceTraining = () => {
    if (!lastActivityDate) return null;
    return differenceInDays(new Date(), new Date(lastActivityDate));
  };
  
  const daysSince = getDaysSinceTraining();
  
  const getDaysSinceColor = () => {
    if (daysSince === null) return 'text-muted-foreground';
    if (daysSince <= 3) return 'text-success';
    if (daysSince <= 7) return 'text-warning';
    return 'text-destructive';
  };

  const clientHasData = hasPersonalData(client);

  return (
    <div
      className={cn(
        "hero-card p-4 transition-all duration-200 premium-touch group relative border-l-4",
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
          "absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10",
          isFavorite 
            ? "text-yellow-500 bg-yellow-500/10" 
            : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-500 hover:bg-yellow-500/10"
        )}
      >
        <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
      </button>

      <Link to={`/clients/${client.id}`} className="block">
        {/* === TOP SECTION: Identity === */}
        <div className="flex items-start gap-3 pr-8">
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
            
            {/* Personal info row - occupation, health */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {client.occupation && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {client.occupation}
                </span>
              )}
              {client.health_restrictions && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-orange-500 flex items-center gap-1 cursor-help">
                      <HeartPulse className="w-3 h-3" />
                      Omezení
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{client.health_restrictions}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            {/* Tags row - max 2 visible */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color + '15', color: tag.color, borderColor: tag.color + '30' }}
                    className="border text-[10px] px-1.5 py-0 h-4"
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length > 2 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                    +{tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
        </div>

        {/* === SEPARATOR === */}
        <div className="border-t border-border/30 my-3" />

        {/* === BOTTOM SECTION: Data === */}
        <div className="flex items-center justify-between">
          {/* Left: Credit instrument */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                actualBalance <= 0 ? 'bg-destructive/10' : 
                actualBalance < 500 ? 'bg-warning/10' : 'bg-emerald-500/10'
              )}>
                <Wallet className={cn('w-4 h-4', getCreditColor())} />
              </div>
              <div>
                <p className={cn('text-sm font-semibold tabular-nums', getCreditColor())}>
                  {formatCurrency(displayBalance)}
                </p>
                {isSharedBudget && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <LinkIcon className="w-2.5 h-2.5" />
                    {sharedBudgetName}
                  </p>
                )}
              </div>
            </div>

            {trainingCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Dumbbell className="w-3.5 h-3.5" />
                <span className="text-xs tabular-nums">{trainingCount}×</span>
              </div>
            )}

            {/* Days since last training indicator */}
            {daysSince !== null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn("flex items-center gap-1 cursor-help", getDaysSinceColor())}>
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium tabular-nums">{daysSince}d</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {daysSince === 0 
                      ? 'Trénink dnes' 
                      : daysSince === 1 
                        ? 'Včera' 
                        : `Před ${daysSince} dny`}
                  </p>
                  {lastActivityDate && (
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(lastActivityDate), 'd. MMMM yyyy', { locale: cs })}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Right: Issue indicators */}
          <div className="flex items-center gap-2">
            {unresolvedItems.unpaidCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 text-destructive cursor-help">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{unresolvedItems.unpaidCount}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{unresolvedItems.unpaidCount}× neuhrazeno ({formatCurrency(unresolvedItems.unpaidTotal)})</p>
                </TooltipContent>
              </Tooltip>
            )}

            {unresolvedItems.missingFeedback > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-0.5 text-warning cursor-help">
                    <MessageSquareWarning className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{unresolvedItems.missingFeedback}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{unresolvedItems.missingFeedback}× čeká na feedback</p>
                </TooltipContent>
              </Tooltip>
            )}

            {unresolvedItems.hasHealthRestrictions && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center text-orange-500 cursor-help">
                    <HeartPulse className="w-3.5 h-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zdravotní omezení</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Next Training Row */}
        {nextTraining && (
          <div className="flex items-center gap-2 mt-3 text-sm text-primary">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium">{formatNextTraining(nextTraining.date)}</span>
          </div>
        )}
      </Link>

      {/* Expandable Personal Data Section */}
      {clientHasData && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 mt-3 pt-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center border-t border-border/30"
            >
              <User className="w-3 h-3" />
              <span>Osobní data</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs bg-secondary/30 rounded-lg p-3">
              {/* Lifestyle data */}
              {client.sleep_hours && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Moon className="w-3 h-3 shrink-0" />
                  <span>Spánek: <span className="text-foreground">{client.sleep_hours}h</span></span>
                </div>
              )}
              
              {client.stress_level && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>Stres: <span className="text-foreground">{client.stress_level}/10</span></span>
                </div>
              )}
              
              {client.sitting_hours_daily && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  <span>Sezení: <span className="text-foreground">{client.sitting_hours_daily}h/den</span></span>
                </div>
              )}

              {/* Sports & Activities */}
              {client.current_activities && client.current_activities.length > 0 && (
                <div className="flex items-start gap-1.5 text-muted-foreground col-span-2">
                  <Activity className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Aktivity: <span className="text-foreground">{client.current_activities.join(', ')}</span></span>
                </div>
              )}
              
              {client.sports_history && (
                <div className="flex items-start gap-1.5 text-muted-foreground col-span-2">
                  <Dumbbell className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Historie: <span className="text-foreground">{client.sports_history}</span></span>
                </div>
              )}

              {/* Diet & Supplements */}
              {client.dietary_restrictions && client.dietary_restrictions.length > 0 && (
                <div className="flex items-start gap-1.5 text-muted-foreground col-span-2">
                  <Utensils className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Dieta: <span className="text-foreground">{client.dietary_restrictions.join(', ')}</span></span>
                </div>
              )}
              
              {client.supplements && client.supplements.length > 0 && (
                <div className="flex items-start gap-1.5 text-muted-foreground col-span-2">
                  <Pill className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>Suplementy: <span className="text-foreground">{client.supplements.join(', ')}</span></span>
                </div>
              )}

              {/* Health restrictions - full width */}
              {client.health_restrictions && (
                <div className="flex items-start gap-1.5 text-orange-500 col-span-2">
                  <HeartPulse className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Omezení: <span className="text-orange-400">{client.health_restrictions}</span></span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-9 text-xs gap-1.5 rounded-xl hover:bg-primary/10 hover:text-primary"
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
          className="flex-1 h-9 text-xs gap-1.5 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-400"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddCredit();
          }}
        >
          <Wallet className="w-3.5 h-3.5" />
          Kredit
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 p-0 rounded-xl"
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
