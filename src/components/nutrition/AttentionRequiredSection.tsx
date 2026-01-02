import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Vyžadují pozornost
          <Badge variant="secondary" className="ml-auto">
            {needsAttention.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {needsAttention.slice(0, 5).map(campaign => {
          const daysSince = campaign.last_entry_date 
            ? differenceInDays(today, parseISO(campaign.last_entry_date))
            : differenceInDays(today, parseISO(campaign.start_date));
          
          return (
            <div 
              key={campaign.id}
              className="flex items-center justify-between p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => onOpenDetail(campaign.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{campaign.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.entries_count === 0 
                    ? 'Žádná data' 
                    : `${daysSince} dny bez záznamu`
                  }
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
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
        {needsAttention.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{needsAttention.length - 5} dalších
          </p>
        )}
      </CardContent>
    </Card>
  );
}
