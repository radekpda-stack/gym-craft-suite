import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  Calendar,
  XCircle,
  Eye,
  AlertTriangle,
  Bell,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { NutritionSessionWithClient } from '@/hooks/useAllNutritionSessions';
import { cn } from '@/lib/utils';

interface CampaignCardProps {
  campaign: NutritionSessionWithClient;
  onComplete?: (id: string) => void;
  onViewClient?: (clientId: string) => void;
  onOpenDetail?: (id: string) => void;
  variant?: 'default' | 'compact';
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function CampaignCard({ 
  campaign, 
  onComplete, 
  onViewClient,
  onOpenDetail,
  variant = 'default',
  selected,
  onSelect
}: CampaignCardProps) {
  const startDate = parseISO(campaign.start_date);
  const endDate = parseISO(campaign.end_date);
  const today = new Date();
  
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const currentDay = Math.min(
    Math.max(1, differenceInDays(today, startDate) + 1),
    totalDays
  );
  const progress = (currentDay / totalDays) * 100;
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));
  
  const isActive = campaign.status === 'active';
  const isCompleted = campaign.status === 'completed';
  const isExpired = !isCompleted && isAfter(today, endDate);

  // Calculate expected entries and completion rate
  const expectedEntries = totalDays * 3;
  const actualEntries = campaign.entries_count;
  const completionRate = Math.round((actualEntries / expectedEntries) * 100);
  const hasLowEntries = completionRate < 50;

  // Calculate days since last entry (for inactivity badge)
  const daysSinceLastEntry = campaign.last_entry_date 
    ? differenceInDays(today, parseISO(campaign.last_entry_date))
    : currentDay;
  const isInactive = isActive && daysSinceLastEntry >= 2 && campaign.entries_count > 0;
  const hasNoEntries = isActive && campaign.entries_count === 0 && currentDay >= 2;

  const copyLink = async () => {
    const url = `${window.location.origin}/nutrition-log/${campaign.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Odkaz zkopírován');
    } catch {
      window.prompt('Zkopírujte odkaz:', url);
    }
  };

  const openForm = () => {
    window.open(`/nutrition-log/${campaign.token}`, '_blank');
  };

  const sendReminder = async () => {
    const url = `${window.location.origin}/nutrition-log/${campaign.token}`;
    const message = `Ahoj! Nezapomeň prosím zaznamenat svou stravu. Odkaz: ${url}`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Připomínka zkopírována do schránky', {
        description: 'Můžeš ji vložit do chatu nebo SMS'
      });
    } catch {
      window.prompt('Zkopírujte připomínku:', message);
    }
  };

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] sm:text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Dokončeno
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="destructive" className="text-[10px] sm:text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Vypršelo
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] sm:text-xs">
        <Clock className="h-3 w-3 mr-1" />
        Den {currentDay}/{totalDays}
      </Badge>
    );
  };

  const getInactivityBadge = () => {
    if (hasNoEntries) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] sm:text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Žádná data
        </Badge>
      );
    }
    if (isInactive) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300 text-[10px] sm:text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {daysSinceLastEntry}d neaktivní
        </Badge>
      );
    }
    return null;
  };

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50 transition-all cursor-pointer group",
          (isInactive || hasNoEntries) && "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
        )}
        onClick={() => onOpenDetail?.(campaign.id)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <AvatarInitials 
            name={campaign.client_name} 
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{campaign.client_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{totalDays}d</span>
              <span>•</span>
              <span>{campaign.entries_count} záznamů</span>
              {isActive && (
                <>
                  <span>•</span>
                  <span className="text-blue-600">{Math.round(progress)}%</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(isInactive || hasNoEntries) && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          {getStatusBadge()}
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md hover:-translate-y-0.5",
        isActive && "border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent",
        (isInactive || hasNoEntries) && isActive && "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent",
        selected && "ring-2 ring-primary"
      )}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-4">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
            onClick={() => onOpenDetail?.(campaign.id)}
          >
            <AvatarInitials name={campaign.client_name} size="md" />
            <div className="min-w-0">
              <h3 className="font-semibold text-lg truncate">{campaign.client_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {format(startDate, 'd. M.', { locale: cs })} – {format(endDate, 'd. M. yyyy', { locale: cs })}
                </span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetail?.(campaign.id); }}>
                <Eye className="h-4 w-4 mr-2" />
                Otevřít detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewClient?.(campaign.client_id); }}>
                <AvatarInitials name={campaign.client_name} size="sm" className="h-4 w-4 mr-2 text-[8px]" />
                Zobrazit klienta
              </DropdownMenuItem>
              {isActive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sendReminder(); }}>
                    <Bell className="h-4 w-4 mr-2" />
                    Poslat připomínku
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyLink(); }}>
                    <Copy className="h-4 w-4 mr-2" />
                    Kopírovat odkaz
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openForm(); }}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Otevřít formulář
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onComplete?.(campaign.id); }}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Ukončit kampaň
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status & Inactivity Badges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {getInactivityBadge()}
              {campaign.is_self_service && (
                <Badge variant="outline" className="text-purple-600 border-purple-300 text-[10px] sm:text-xs">
                  Self-service
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {campaign.entries_count} záznamů
            </span>
          </div>

          {isActive && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {daysRemaining > 0 ? `Zbývá ${daysRemaining} ${daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dní'}` : 'Poslední den'}
              </p>
            </div>
          )}

          {/* Entry Stats - horizontal layout */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold">{campaign.food_count}</span>
                <span className="text-xs text-muted-foreground">jídel</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold">{campaign.drink_count}</span>
                <span className="text-xs text-muted-foreground">nápojů</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold">{campaign.coffee_count}</span>
                <span className="text-xs text-muted-foreground">káv</span>
              </div>
            </div>
          </div>

          {/* Last entries preview - collapsible style */}
          {campaign.last_entries && campaign.last_entries.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1.5">Poslední záznamy:</p>
              <div className="space-y-1">
                {campaign.last_entries.slice(0, 2).map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2 py-1">
                    <span className="truncate flex-1">{entry.name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button 
            className="flex-1" 
            variant={isActive ? "default" : "outline"}
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(campaign.id); }}
          >
            <Eye className="h-4 w-4 mr-2" />
            {campaign.entries_count === 0 ? 'Zatím žádná data' : 'Otevřít detail'}
          </Button>
          {isActive && (isInactive || hasNoEntries) && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={(e) => { e.stopPropagation(); sendReminder(); }}
              title="Poslat připomínku"
              className="shrink-0"
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
