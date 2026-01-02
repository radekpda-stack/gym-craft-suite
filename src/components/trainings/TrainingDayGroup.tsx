import { memo, useMemo } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TrainingDayGroupProps {
  date: string;
  children: React.ReactNode;
  className?: string;
}

const DAY_ABBREVIATIONS: Record<number, string> = {
  0: 'Ne',
  1: 'Po',
  2: 'Út',
  3: 'St',
  4: 'Čt',
  5: 'Pá',
  6: 'So',
};

export const TrainingDayGroup = memo(function TrainingDayGroup({
  date,
  children,
  className,
}: TrainingDayGroupProps) {
  const dateObj = useMemo(() => parseISO(date), [date]);
  
  const dayAbbr = DAY_ABBREVIATIONS[dateObj.getDay()];
  const formattedDate = format(dateObj, 'd. MMMM', { locale: cs });
  
  const isDateToday = isToday(dateObj);
  const isDateTomorrow = isTomorrow(dateObj);

  return (
    <div className={cn('overflow-hidden', className)}>
      {/* Day header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <span className="font-bold text-foreground text-base">
          {dayAbbr}
        </span>
        <span className="text-muted-foreground text-sm">
          · {formattedDate}
        </span>
        {isDateToday && (
          <Badge variant="default" className="ml-auto text-xs px-2 py-0.5">
            Dnes
          </Badge>
        )}
        {isDateTomorrow && (
          <Badge variant="secondary" className="ml-auto text-xs px-2 py-0.5">
            Zítra
          </Badge>
        )}
      </div>
      
      {/* Training rows */}
      <div className="divide-y divide-border">
        {children}
      </div>
    </div>
  );
});
