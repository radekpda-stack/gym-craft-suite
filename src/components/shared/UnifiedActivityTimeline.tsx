import { LucideIcon, Activity as ActivityIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export type ActivityColor = 'success' | 'warning' | 'destructive' | 'primary' | 'muted' | 'accent';

export interface ActivityItem {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  label: string;
  timestamp: string;
  icon: LucideIcon;
  color: ActivityColor;
  detail?: string;
}

interface UnifiedActivityTimelineProps {
  title: string;
  titleIcon?: LucideIcon;
  activities: ActivityItem[];
  isLoading?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
  showTimeline?: boolean;
}

const COLOR_STYLES: Record<ActivityColor, { bg: string; text: string }> = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  muted: { bg: 'bg-muted', text: 'text-muted-foreground' },
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
};

export function UnifiedActivityTimeline({
  title,
  titleIcon: TitleIcon = ActivityIcon,
  activities,
  isLoading,
  maxHeight = '350px',
  emptyMessage = 'Zatím žádná aktivita',
  showTimeline = true,
}: UnifiedActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TitleIcon className="w-4 h-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TitleIcon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <ActivityIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className="pr-2" style={{ maxHeight }}>
            <div className="space-y-1">
              {activities.map((activity, index) => {
                const Icon = activity.icon;
                const colorStyle = COLOR_STYLES[activity.color];
                const isLast = index === activities.length - 1;
                
                return (
                  <div 
                    key={activity.id}
                    className="relative flex items-start gap-3 py-2"
                  >
                    {/* Timeline line */}
                    {showTimeline && !isLast && (
                      <div className="absolute left-[15px] top-10 bottom-0 w-px bg-border" />
                    )}
                    
                    {/* Icon */}
                    <div className={cn('p-1.5 rounded-full shrink-0 z-10', colorStyle.bg)}>
                      <Icon className={cn('w-4 h-4', colorStyle.text)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link 
                          to={`/clients/${activity.clientId}`}
                          className="font-medium hover:underline"
                        >
                          {activity.clientName}
                        </Link>
                        <span className="text-muted-foreground"> {activity.label}</span>
                      </p>
                      {activity.detail && (
                        <p className="text-xs text-foreground/70 truncate">{activity.detail}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { 
                          addSuffix: true, 
                          locale: cs 
                        })}
                      </p>
                    </div>
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
