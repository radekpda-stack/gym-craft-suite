import { useState } from 'react';
import { format, subMonths, startOfYear, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export type StatsPeriodType = '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';

export interface StatsPeriodRange {
  start: Date;
  end: Date;
  label: string;
  type: StatsPeriodType;
}

interface StatsPeriodSelectorProps {
  value: StatsPeriodRange;
  onChange: (range: StatsPeriodRange) => void;
  className?: string;
}

const PERIOD_OPTIONS: { value: StatsPeriodType; label: string; shortLabel: string }[] = [
  { value: '1m', label: '1 měsíc', shortLabel: '1M' },
  { value: '3m', label: '3 měsíce', shortLabel: '3M' },
  { value: '6m', label: '6 měsíců', shortLabel: '6M' },
  { value: '1y', label: '1 rok', shortLabel: '1R' },
  { value: 'all', label: 'Vše', shortLabel: 'Vše' },
];

export function getDefaultPeriodRange(type: StatsPeriodType = '1y'): StatsPeriodRange {
  const now = new Date();
  const end = now;
  
  switch (type) {
    case '1m':
      return {
        start: subMonths(now, 1),
        end,
        label: 'Poslední měsíc',
        type,
      };
    case '3m':
      return {
        start: subMonths(now, 3),
        end,
        label: 'Poslední 3 měsíce',
        type,
      };
    case '6m':
      return {
        start: subMonths(now, 6),
        end,
        label: 'Posledních 6 měsíců',
        type,
      };
    case '1y':
      return {
        start: startOfYear(now),
        end,
        label: `Rok ${now.getFullYear()}`,
        type,
      };
    case 'all':
      return {
        start: subYears(now, 10), // Will be overridden by actual first data
        end,
        label: 'Vše',
        type,
      };
    default:
      return {
        start: startOfYear(now),
        end,
        label: `Rok ${now.getFullYear()}`,
        type: '1y',
      };
  }
}

export function StatsPeriodSelector({ value, onChange, className }: StatsPeriodSelectorProps) {
  const [customStart, setCustomStart] = useState<Date | undefined>(value.start);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(value.end);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handlePeriodChange = (newType: string) => {
    if (!newType) return;
    
    if (newType === 'custom') {
      setShowCustomPicker(true);
      return;
    }
    
    setShowCustomPicker(false);
    onChange(getDefaultPeriodRange(newType as StatsPeriodType));
  };

  const handleCustomConfirm = () => {
    if (customStart && customEnd) {
      onChange({
        start: customStart,
        end: customEnd,
        label: `${format(customStart, 'd.M.yyyy')} - ${format(customEnd, 'd.M.yyyy')}`,
        type: 'custom',
      });
      setShowCustomPicker(false);
    }
  };

  const formatDate = (date: Date) => format(date, 'd. M. yyyy', { locale: cs });

  return (
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center gap-3", className)}>
      <ToggleGroup
        type="single"
        value={showCustomPicker ? 'custom' : value.type}
        onValueChange={handlePeriodChange}
        className="bg-muted/50 p-1 rounded-lg flex-wrap"
      >
        {PERIOD_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
          >
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sm:hidden">{option.shortLabel}</span>
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem
          value="custom"
          className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          <Calendar className="h-3.5 w-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Vlastní</span>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Custom date picker */}
      {showCustomPicker && (
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {customStart ? formatDate(customStart) : 'Od'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                locale={cs}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-xs">–</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {customEnd ? formatDate(customEnd) : 'Do'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                locale={cs}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button 
            size="sm" 
            onClick={handleCustomConfirm}
            disabled={!customStart || !customEnd}
          >
            Použít
          </Button>
        </div>
      )}

      {/* Period label on mobile when custom is not open */}
      {!showCustomPicker && value.type === 'custom' && (
        <span className="text-xs text-muted-foreground">
          {value.label}
        </span>
      )}
    </div>
  );
}
