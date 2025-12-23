import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface StatInfoTooltipProps {
  title: string;
  description: string;
  calculation?: string;
}

export function StatInfoTooltip({ title, description, calculation }: StatInfoTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 text-sm" 
        side="top" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-muted-foreground">{description}</p>
          {calculation && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground">Způsob výpočtu:</p>
              <p className="text-xs text-muted-foreground mt-1">{calculation}</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
