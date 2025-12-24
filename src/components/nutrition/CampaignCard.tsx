import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  User,
  Calendar,
  FileText,
  XCircle,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
}

export function CampaignCard({ 
  campaign, 
  onComplete, 
  onViewClient,
  onOpenDetail,
  variant = 'default' 
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
  const expectedEntries = totalDays * 3; // Default 3 food entries per day
  const actualEntries = campaign.entries_count;
  const completionRate = Math.round((actualEntries / expectedEntries) * 100);
  const hasLowEntries = completionRate < 50;

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

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Dokončeno
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Vypršelo
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Den {currentDay} / {totalDays}
      </Badge>
    );
  };

  if (variant === 'compact') {
    return (
      <div 
        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => onOpenDetail?.(campaign.id)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isCompleted ? "bg-green-500/10" : isActive ? "bg-blue-500/10" : "bg-muted"
          )}>
            <User className={cn(
              "h-4 w-4",
              isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <p className="font-medium">{campaign.client_name}</p>
            <p className="text-xs text-muted-foreground">
              {totalDays} dní • {campaign.entries_count} záznamů
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasLowEntries && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          {getStatusBadge()}
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        isActive && "border-blue-500/30 bg-blue-500/5",
        hasLowEntries && isActive && "border-amber-500/30 bg-amber-500/5"
      )}
      onClick={() => onOpenDetail?.(campaign.id)}
    >
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isCompleted ? "bg-green-500/10" : isActive ? "bg-blue-500/10" : "bg-muted"
            )}>
              <User className={cn(
                "h-5 w-5",
                isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{campaign.client_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {format(startDate, 'd. M.', { locale: cs })} – {format(endDate, 'd. M. yyyy', { locale: cs })}
                </span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetail?.(campaign.id); }}>
                <Eye className="h-4 w-4 mr-2" />
                Otevřít detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewClient?.(campaign.client_id); }}>
                <User className="h-4 w-4 mr-2" />
                Zobrazit klienta
              </DropdownMenuItem>
              {isActive && (
                <>
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

        {/* Status & Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <div className="flex items-center gap-2">
              {hasLowEntries && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Málo dat
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {campaign.entries_count} záznamů
              </span>
            </div>
          </div>

          {isActive && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {daysRemaining > 0 ? `Zbývá ${daysRemaining} ${daysRemaining === 1 ? 'den' : daysRemaining < 5 ? 'dny' : 'dní'}` : 'Poslední den'}
              </p>
            </div>
          )}

          {/* Entry Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-semibold">{campaign.food_count}</p>
              <p className="text-xs text-muted-foreground">Jídla</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{campaign.drink_count}</p>
              <p className="text-xs text-muted-foreground">Nápoje</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{campaign.coffee_count}</p>
              <p className="text-xs text-muted-foreground">Káva</p>
            </div>
          </div>
        </div>

        {/* Primary CTA - always visible */}
        <div className="mt-4 pt-4 border-t">
          <Button 
            className="w-full" 
            variant={isActive ? "default" : "outline"}
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(campaign.id); }}
          >
            <Eye className="h-4 w-4 mr-2" />
            {campaign.entries_count === 0 ? 'Zatím žádná data' : 'Otevřít detail'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
