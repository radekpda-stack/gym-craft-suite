import { AlertTriangle, ChevronRight, LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export type AttentionPriority = 'high' | 'medium' | 'low';

export interface AttentionItem {
  id: string;
  clientId: string;
  clientName: string;
  priority: AttentionPriority;
  label: string;
  reason?: string;
  icon?: LucideIcon;
  tags?: string[];
  onAction?: () => void;
  actionLabel?: string;
}

interface AttentionInboxProps {
  title?: string;
  items: AttentionItem[];
  isLoading?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
  showAllLink?: string;
  limit?: number;
}

const PRIORITY_STYLES: Record<AttentionPriority, { border: string; bg: string; text: string }> = {
  high: { 
    border: 'border-l-destructive', 
    bg: 'bg-destructive/10', 
    text: 'text-destructive' 
  },
  medium: { 
    border: 'border-l-warning', 
    bg: 'bg-warning/10', 
    text: 'text-warning' 
  },
  low: { 
    border: 'border-l-muted-foreground', 
    bg: 'bg-muted', 
    text: 'text-muted-foreground' 
  },
};

export function AttentionInbox({
  title = 'Vyžaduje pozornost',
  items,
  isLoading,
  maxHeight = '300px',
  emptyMessage = 'Žádné položky k řešení',
  showAllLink,
  limit,
}: AttentionInboxProps) {
  const displayItems = limit ? items.slice(0, limit) : items;
  const hasMore = limit && items.length > limit;

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className={cn(
              'w-4 h-4',
              items.length > 0 ? 'text-destructive' : 'text-muted-foreground'
            )} />
            {title}
            {items.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {items.length}
              </Badge>
            )}
          </CardTitle>
          {showAllLink && hasMore && (
            <Link to={showAllLink}>
              <Button variant="ghost" size="sm" className="text-xs">
                Zobrazit vše
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className="pr-2" style={{ maxHeight }}>
            <div className="space-y-2">
              {displayItems.map((item) => {
                const style = PRIORITY_STYLES[item.priority];
                const Icon = item.icon || AlertTriangle;
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      'p-3 rounded-lg border-l-2 bg-card hover:bg-muted/50 transition-colors',
                      style.border
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-1.5 rounded-lg shrink-0', style.bg)}>
                        <Icon className={cn('w-4 h-4', style.text)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            to={`/clients/${item.clientId}`}
                            className="font-medium text-sm hover:underline"
                          >
                            {item.clientName}
                          </Link>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {item.label}
                          </Badge>
                        </div>
                        
                        {item.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.reason}
                          </p>
                        )}
                        
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.tags.map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {item.onAction && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={item.onAction}
                          className="shrink-0"
                        >
                          {item.actionLabel || 'Řešit'}
                        </Button>
                      )}
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
