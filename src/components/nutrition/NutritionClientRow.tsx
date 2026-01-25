import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle, Clock, Apple, Calendar, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ClientStats {
  hasActiveSession: boolean;
  lastEntryDate: string | null;
  weeklyFoodCount: number;
  weeklyDrinkCount: number;
  weeklyCoffeeCount: number;
  emptyDays: number;
  lateCaffeineCount: number;
}

interface NutritionClientRowProps {
  client: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
  };
  stats: ClientStats;
  needsAttention?: boolean;
  className?: string;
}

function formatLastActivity(dateStr: string | null): string {
  if (!dateStr) return 'Žádný záznam';
  
  const date = new Date(dateStr);
  if (isToday(date)) return 'Dnes';
  if (isYesterday(date)) return 'Včera';
  
  return format(date, 'd. M.', { locale: cs });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function NutritionClientRow({
  client,
  stats,
  needsAttention = false,
  className,
}: NutritionClientRowProps) {
  const navigate = useNavigate();
  
  const fullName = `${client.last_name} ${client.first_name}`;
  const initials = getInitials(client.first_name, client.last_name);
  const lastActivity = formatLastActivity(stats.lastEntryDate);
  
  const handleClick = () => {
    navigate(`/nutrition/client/${client.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 transition-all duration-150",
        "hover:border-primary/30 hover:bg-card/80",
        needsAttention && "border-l-4 border-l-destructive",
        className
      )}
    >
      {/* Row 1: Avatar, Name, Badge, Arrow */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={client.photo_url || undefined} alt={fullName} />
          <AvatarFallback className={cn(
            "text-xs font-medium",
            needsAttention ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate max-w-[180px] sm:max-w-none">
            {fullName}
          </p>
        </div>
        
        {/* Attention Badge */}
        {needsAttention && (
          <Badge 
            variant="destructive" 
            className="shrink-0 text-[10px] px-1.5 py-0.5 h-5"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">Pozornost</span>
            <span className="sm:hidden">!</span>
          </Badge>
        )}
        
        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>
      
      {/* Row 2: Stats */}
      <div className="mt-2 ml-12 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {/* Last Activity */}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {lastActivity}
        </span>
        
        {/* Separator on desktop */}
        <span className="hidden sm:inline text-muted-foreground/50">•</span>
        
        {/* Weekly Food */}
        <span className="flex items-center gap-1" title="Jídel tento týden">
          <Apple className="h-3 w-3" />
          <span className="font-medium">{stats.weeklyFoodCount}</span>
          <span className="hidden sm:inline">tento týden</span>
        </span>
        
        {/* Empty Days - only show if > 0 */}
        {stats.emptyDays > 0 && (
          <>
            <span className="hidden sm:inline text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1 text-warning" title="Prázdných dnů">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">{stats.emptyDays}</span>
              <span className="hidden sm:inline">prázdných</span>
            </span>
          </>
        )}
        
        {/* Late Caffeine - only show if > 0 */}
        {stats.lateCaffeineCount > 0 && (
          <>
            <span className="hidden sm:inline text-muted-foreground/50">•</span>
            <span className="flex items-center gap-1 text-amber-500" title="Pozdní kofein">
              <Coffee className="h-3 w-3" />
              <span className="font-medium">{stats.lateCaffeineCount}×</span>
              <span className="hidden sm:inline">pozdě</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
