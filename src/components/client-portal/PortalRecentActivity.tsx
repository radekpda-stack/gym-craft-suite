import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePortalRecentActivity } from '@/hooks/useClientPortalAdmin';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Activity, LogIn, Eye, FileText, CreditCard } from 'lucide-react';

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  login: LogIn,
  page_view: Eye,
  form_submit: FileText,
  credit_view: CreditCard,
  default: Activity,
};

const ACTIVITY_LABELS: Record<string, string> = {
  login: 'Přihlášení',
  page_view: 'Zobrazení stránky',
  page_mount: 'Návštěva stránky',
  form_submit: 'Odeslání formuláře',
  credit_view: 'Zobrazení kreditu',
};

export function PortalRecentActivity() {
  const { data: activities, isLoading } = usePortalRecentActivity(15);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Poslední aktivita</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Poslední aktivita
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Zatím žádná aktivita</p>
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-3">
              {activities?.map((activity: any) => {
                const Icon = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.default;
                const label = ACTIVITY_LABELS[activity.activity_type] || activity.activity_type;
                
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.client?.name || 'Neznámý klient'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {label}
                        {activity.metadata?.page && ` - ${activity.metadata.page}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.activity_date), {
                        addSuffix: true,
                        locale: cs,
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
