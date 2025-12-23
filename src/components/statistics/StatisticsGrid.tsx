import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronRight, Maximize2 } from 'lucide-react';
import { StatInfoTooltip } from './StatInfoTooltip';

interface StatisticsCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  infoDescription?: string;
  infoCalculation?: string;
}

export function StatisticsCard({ 
  title, 
  icon, 
  children, 
  expandedContent,
  isLoading,
  className,
  infoDescription,
  infoCalculation,
}: StatisticsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <Skeleton className="h-28 sm:h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg hover:border-primary/20 relative",
          className
        )}
        onClick={() => expandedContent && setIsExpanded(true)}
      >
        <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 min-w-0">
              <span className="shrink-0">{icon}</span>
              <span className="truncate">{title}</span>
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              {infoDescription && (
                <StatInfoTooltip 
                  title={title} 
                  description={infoDescription} 
                  calculation={infoCalculation} 
                />
              )}
              {expandedContent && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                >
                  <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
          {children}
        </CardContent>
        {expandedContent && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </Card>

      {expandedContent && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {icon}
                {title}
              </DialogTitle>
            </DialogHeader>
            {expandedContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
