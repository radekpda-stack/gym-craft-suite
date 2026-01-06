import { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type BandType = 'lightest' | 'light' | 'medium' | 'strong';

export interface AssistanceBands {
  bands: BandType[];
}

interface AssistanceBandSelectorProps {
  value: BandType[];
  onChange: (bands: BandType[]) => void;
  className?: string;
}

const BAND_OPTIONS: { id: BandType; label: string; color: string; bgColor: string; description: string }[] = [
  { 
    id: 'lightest', 
    label: 'Nejslabší', 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    description: 'Minimální dopomoc, blízko k čistému shybu'
  },
  { 
    id: 'light', 
    label: 'Slabá', 
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    description: 'Mírná dopomoc'
  },
  { 
    id: 'medium', 
    label: 'Střední', 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
    description: 'Střední úroveň dopomoci'
  },
  { 
    id: 'strong', 
    label: 'Silná', 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
    description: 'Maximální dopomoc pro začátečníky'
  },
];

// Helper to check if exercise is a pull-up type
export function isPullUpExercise(exerciseName: string): boolean {
  const name = exerciseName.toLowerCase();
  return (
    name.includes('shyb') ||
    name.includes('pull-up') ||
    name.includes('pullup') ||
    name.includes('pull up') ||
    name.includes('chin-up') ||
    name.includes('chinup') ||
    name.includes('chin up')
  );
}

export function AssistanceBandSelector({ value, onChange, className }: AssistanceBandSelectorProps) {
  const [isOpen, setIsOpen] = useState(value.length > 0);

  // Auto-open if there are selected bands
  useEffect(() => {
    if (value.length > 0) {
      setIsOpen(true);
    }
  }, [value]);

  const toggleBand = (bandId: BandType) => {
    if (value.includes(bandId)) {
      onChange(value.filter(b => b !== bandId));
    } else {
      onChange([...value, bandId]);
    }
  };

  const getSelectedBandsDisplay = () => {
    if (value.length === 0) return null;
    
    const sorted = BAND_OPTIONS.filter(b => value.includes(b.id));
    return sorted.map(band => (
      <Badge 
        key={band.id} 
        variant="outline" 
        className={cn('text-xs', band.color, band.bgColor)}
      >
        {band.label}
      </Badge>
    ));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between text-sm h-auto py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Dopomoc (odporové gumy)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-xs">
                      Vyberte jednu nebo více odporových gum, které klient používá pro dopomoc.
                      Sledování gum umožňuje vidět progres směrem k čistým shybům.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              {!isOpen && getSelectedBandsDisplay()}
              <ChevronDown className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )} />
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {BAND_OPTIONS.map((band) => {
              const isSelected = value.includes(band.id);
              return (
                <Button
                  key={band.id}
                  type="button"
                  variant="outline"
                  onClick={() => toggleBand(band.id)}
                  className={cn(
                    'h-auto py-2 px-3 justify-start border-2 transition-all',
                    isSelected 
                      ? cn(band.bgColor, 'border-current', band.color)
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className={cn(
                      'font-medium text-sm',
                      isSelected ? band.color : 'text-foreground'
                    )}>
                      {band.label}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {band.description}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>

          {value.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Aktuálně:</span>
              <div className="flex flex-wrap gap-1">
                {getSelectedBandsDisplay()}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-6 ml-auto text-muted-foreground hover:text-destructive"
                onClick={() => onChange([])}
              >
                Vymazat
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Helper to format bands for display in lists/history
export function formatAssistanceBands(bands: BandType[]): string {
  if (!bands || bands.length === 0) return '';
  
  const bandLabels: Record<BandType, string> = {
    lightest: 'Nejslabší',
    light: 'Slabá',
    medium: 'Střední',
    strong: 'Silná',
  };
  
  return bands.map(b => bandLabels[b]).join(' + ');
}

// Component to display bands as badges (for history/stats views)
export function AssistanceBandBadges({ bands, className }: { bands: BandType[]; className?: string }) {
  if (!bands || bands.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {BAND_OPTIONS.filter(b => bands.includes(b.id)).map(band => (
        <Badge 
          key={band.id} 
          variant="outline" 
          className={cn('text-xs py-0 h-5', band.color, band.bgColor)}
        >
          {band.label}
        </Badge>
      ))}
    </div>
  );
}
