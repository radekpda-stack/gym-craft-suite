import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value?: Date | string;
  onChange: (date: Date | string) => void;
  placeholder?: string;
  className?: string;
  returnString?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Vyberte datum a čas",
  className,
  returnString = true,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    if (typeof value === 'string') return new Date(value);
    return value;
  }, [value]);

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(dateValue);
  const [selectedHour, setSelectedHour] = React.useState<string>(
    dateValue ? dateValue.getHours().toString().padStart(2, '0') : "09"
  );
  const [selectedMinute, setSelectedMinute] = React.useState<string>(
    dateValue ? dateValue.getMinutes().toString().padStart(2, '0') : "00"
  );

  React.useEffect(() => {
    if (dateValue) {
      setSelectedDate(dateValue);
      setSelectedHour(dateValue.getHours().toString().padStart(2, '0'));
      setSelectedMinute(dateValue.getMinutes().toString().padStart(2, '0'));
    }
  }, [dateValue]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateDateTime(date, selectedHour, selectedMinute);
    }
  };

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
    if (selectedDate) {
      updateDateTime(selectedDate, hour, selectedMinute);
    }
  };

  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute);
    if (selectedDate) {
      updateDateTime(selectedDate, selectedHour, minute);
    }
  };

  const updateDateTime = (date: Date, hour: string, minute: string) => {
    let newDate = setHours(date, parseInt(hour));
    newDate = setMinutes(newDate, parseInt(minute));
    
    if (returnString) {
      onChange(newDate.toISOString().slice(0, 16));
    } else {
      onChange(newDate);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-secondary border-border",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "d. MMMM yyyy, HH:mm", { locale: cs })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-popover border-border z-[100]" 
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={cs}
            initialFocus
            className="p-3 pointer-events-auto"
          />
          <div className="border-t sm:border-t-0 sm:border-l border-border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span>Čas</span>
            </div>
            <div className="flex gap-4 justify-center">
              <div className="flex-1 min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1 text-center">Hodina</p>
                <Select value={selectedHour} onValueChange={handleHourChange}>
                  <SelectTrigger className="w-full bg-secondary border-border">
                    <SelectValue placeholder="HH" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-48 z-[110]">
                    {hours.map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-2 text-xl font-bold text-muted-foreground">:</div>
              <div className="flex-1 min-w-[80px]">
                <p className="text-xs text-muted-foreground mb-1 text-center">Minuta</p>
                <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                  <SelectTrigger className="w-full bg-secondary border-border">
                    <SelectValue placeholder="MM" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border max-h-48 z-[110]">
                    {minutes.filter((_, i) => i % 5 === 0).map((minute) => (
                      <SelectItem key={minute} value={minute}>
                        {minute}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Time display preview */}
            <div className="text-center py-2 px-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-2xl font-bold text-primary">
                {selectedHour}:{selectedMinute}
              </p>
            </div>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Potvrdit
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DurationPickerProps {
  value?: number;
  onChange: (duration: number) => void;
  className?: string;
}

export function DurationPicker({ value = 60, onChange, className }: DurationPickerProps) {
  const durations = [15, 30, 45, 60, 75, 90, 120, 150, 180];

  return (
    <Select value={value.toString()} onValueChange={(v) => onChange(parseInt(v))}>
      <SelectTrigger className={cn("bg-secondary border-border", className)}>
        <SelectValue placeholder="Vyberte délku" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {durations.map((duration) => (
          <SelectItem key={duration} value={duration.toString()}>
            {duration} minut {duration >= 60 && `(${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}m` : ''})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Vyberte datum",
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    return new Date(value);
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal bg-secondary border-border",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "d. MMMM yyyy", { locale: cs })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleDateSelect}
          locale={cs}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}