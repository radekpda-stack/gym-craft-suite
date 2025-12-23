import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronRight, Maximize2 } from 'lucide-react';

interface StatisticsCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export function StatisticsCard({ 
  title, 
  icon, 
  children, 
  expandedContent,
  isLoading,
  className 
}: StatisticsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn("glass overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn(
          "glass overflow-hidden cursor-pointer group transition-all duration-200 hover:shadow-lg hover:border-primary/20",
          className
        )}
        onClick={() => expandedContent && setIsExpanded(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            {expandedContent && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
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
