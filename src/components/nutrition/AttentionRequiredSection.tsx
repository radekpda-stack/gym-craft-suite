import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { NutritionSessionWithClient } from '@/hooks/useAllNutritionSessions';
import { toast } from 'sonner';

interface AttentionRequiredSectionProps {
  sessions: NutritionSessionWithClient[];
  onOpenDetail: (id: string) => void;
}

export function AttentionRequiredSection({ sessions, onOpenDetail }: AttentionRequiredSectionProps) {
  const today = new Date();

  const needsAttention = sessions.filter(s => {
    if (s.status !== 'active') return false;
    
    const startDate = parseISO(s.start_date);
    const currentDay = differenceInDays(today, startDate) + 1;
    
    // No entries after 2+ days
    if (s.entries_count === 0 && currentDay >= 2) return true;
    
    // No entries for 2+ days
    if (s.last_entry_date) {
      const daysSinceEntry = differenceInDays(today, parseISO(s.last_entry_date));
      if (daysSinceEntry >= 2) return true;
    }
    
    return false;
  });

  if (needsAttention.length === 0) return null;

  const sendReminder = async (campaign: NutritionSessionWithClient, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/nutrition-log/${campaign.token}`;
    const message = `Ahoj! Nezapomeň prosím zaznamenat svou stravu. Odkaz: ${url}`;
    
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Připomínka zkopírována', {
        description: 'Můžeš ji vložit do chatu nebo SMS'
      });
    } catch {
      window.prompt('Zkopírujte připomínku:', message);
    }
  };

  const displayedCampaigns = needsAttention.slice(0, 3);
  const remainingCount = needsAttention.length - 3;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <span className="text-amber-700 dark:text-amber-400">Vyžadují pozornost</span>
          <Badge variant="secondary" className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">
            {needsAttention.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedCampaigns.map(campaign => {
          const daysSince = campaign.last_entry_date 
            ? differenceInDays(today, parseISO(campaign.last_entry_date))
            : differenceInDays(today, parseISO(campaign.start_date));
          
          return (
            <div 
              key={campaign.id}
              className="flex items-center justify-between p-3 rounded-xl bg-background/80 hover:bg-background transition-colors cursor-pointer group border border-transparent hover:border-border/50"
              onClick={() => onOpenDetail(campaign.id)}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <AvatarInitials name={campaign.client_name} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{campaign.client_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {campaign.entries_count === 0 
                      ? 'Žádná data' 
                      : `${daysSince} ${daysSince === 1 ? 'den' : daysSince < 5 ? 'dny' : 'dní'} bez záznamu`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-600"
                  onClick={(e) => sendReminder(campaign, e)}
                  title="Poslat připomínku"
                >
                  <Bell className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{remainingCount} {remainingCount === 1 ? 'další' : 'dalších'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
