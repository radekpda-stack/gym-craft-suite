import * as React from "react";
import { format, setHours, setMinutes, parse, isValid } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarIcon, Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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

// ============================================================
// UNIFIED DATE-TIME PICKER
// ============================================================

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
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  
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
      // Don't auto-update parent, wait for confirmation
    }
  };

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
  };

  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      let newDate = setHours(selectedDate, parseInt(selectedHour));
      newDate = setMinutes(newDate, parseInt(selectedMinute));
      
      if (returnString) {
        onChange(newDate.toISOString().slice(0, 16));
      } else {
        onChange(newDate);
      }
      
      // Show confirmation animation
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        setIsOpen(false);
      }, 400);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

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
            <div className="flex gap-2 justify-center items-center">
              <Select value={selectedHour} onValueChange={handleHourChange}>
                <SelectTrigger className="w-[70px] bg-secondary border-border text-center font-mono text-lg">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-48 z-[110]">
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour} className="font-mono">
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xl font-bold text-muted-foreground">:</span>
              <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                <SelectTrigger className="w-[70px] bg-secondary border-border text-center font-mono text-lg">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-48 z-[110]">
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute} className="font-mono">
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Preview */}
            <div className={cn(
              "text-center py-3 px-4 rounded-lg border transition-all duration-300",
              showConfirmation 
                ? "bg-green-500/20 border-green-500/50" 
                : "bg-primary/10 border-primary/20"
            )}>
              {showConfirmation ? (
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Uloženo</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-1">Vybráno:</p>
                  <p className="text-lg font-bold text-primary">
                    {selectedDate ? format(selectedDate, 'd. M. yyyy', { locale: cs }) : '—'}, {selectedHour}:{selectedMinute}
                  </p>
                </>
              )}
            </div>
            
            <Button 
              size="sm" 
              className="w-full"
              onClick={handleConfirm}
              disabled={!selectedDate}
            >
              <Check className="w-4 h-4 mr-2" />
              Potvrdit
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// DURATION PICKER
// ============================================================

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

// ============================================================
// UNIFIED DATE PICKER - Enhanced with quick input
// ============================================================

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
  const [quickInput, setQuickInput] = React.useState('');
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [pendingDate, setPendingDate] = React.useState<Date | undefined>();
  
  const dateValue = React.useMemo(() => {
    if (!value) return undefined;
    return new Date(value);
  }, [value]);

  React.useEffect(() => {
    if (dateValue) {
      setPendingDate(dateValue);
    }
  }, [dateValue]);

  // Parse quick input (DDMM, DDMMYY, DDMMYYYY)
  const parseQuickInput = (input: string): Date | null => {
    const cleaned = input.replace(/[.\-\/\s]/g, '');
    const now = new Date();
    
    let day: number, month: number, year: number;
    
    if (cleaned.length === 2) {
      // DD - current month/year
      day = parseInt(cleaned);
      month = now.getMonth();
      year = now.getFullYear();
    } else if (cleaned.length === 4) {
      // DDMM
      day = parseInt(cleaned.slice(0, 2));
      month = parseInt(cleaned.slice(2, 4)) - 1;
      year = now.getFullYear();
    } else if (cleaned.length === 6) {
      // DDMMYY
      day = parseInt(cleaned.slice(0, 2));
      month = parseInt(cleaned.slice(2, 4)) - 1;
      year = 2000 + parseInt(cleaned.slice(4, 6));
    } else if (cleaned.length === 8) {
      // DDMMYYYY
      day = parseInt(cleaned.slice(0, 2));
      month = parseInt(cleaned.slice(2, 4)) - 1;
      year = parseInt(cleaned.slice(4, 8));
    } else {
      return null;
    }
    
    if (day < 1 || day > 31 || month < 0 || month > 11) {
      return null;
    }
    
    const date = new Date(year, month, day);
    if (isValid(date) && date.getDate() === day) {
      return date;
    }
    return null;
  };

  const handleQuickInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuickInput(value);
    
    const parsed = parseQuickInput(value);
    if (parsed) {
      setPendingDate(parsed);
    }
  };

  const handleQuickInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pendingDate) {
      handleConfirm();
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setPendingDate(date);
      setQuickInput(format(date, 'ddMM'));
    }
  };

  const handleConfirm = () => {
    if (pendingDate) {
      onChange(format(pendingDate, 'yyyy-MM-dd'));
      setShowConfirmation(true);
      setTimeout(() => {
        setShowConfirmation(false);
        setIsOpen(false);
        setQuickInput('');
      }, 400);
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
      <PopoverContent 
        className="w-auto p-0 bg-popover border-border z-[100]" 
        align="start"
        sideOffset={4}
      >
        <div className="p-3 border-b border-border">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Rychlé zadání (DDMM nebo DDMMRRRR)
          </label>
          <Input
            value={quickInput}
            onChange={handleQuickInputChange}
            onKeyDown={handleQuickInputKeyDown}
            placeholder="např. 2501 nebo 25012025"
            className="font-mono text-center"
            autoFocus
          />
        </div>
        
        <Calendar
          mode="single"
          selected={pendingDate}
          onSelect={handleCalendarSelect}
          locale={cs}
          className="p-3 pointer-events-auto"
        />
        
        {/* Confirmation area */}
        <div className="p-3 border-t border-border space-y-3">
          <div className={cn(
            "text-center py-2 px-4 rounded-lg border transition-all duration-300",
            showConfirmation 
              ? "bg-green-500/20 border-green-500/50" 
              : pendingDate 
                ? "bg-primary/10 border-primary/20" 
                : "bg-muted/50 border-border"
          )}>
            {showConfirmation ? (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">Uloženo</span>
              </div>
            ) : pendingDate ? (
              <>
                <p className="text-xs text-muted-foreground">Vybráno:</p>
                <p className="text-lg font-bold text-primary">
                  {format(pendingDate, 'd. MMMM yyyy', { locale: cs })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Vyberte datum</p>
            )}
          </div>
          
          <Button 
            size="sm" 
            className="w-full"
            onClick={handleConfirm}
            disabled={!pendingDate}
          >
            <Check className="w-4 h-4 mr-2" />
            Potvrdit
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================
// TIME INPUT - Standalone component for just time
// ============================================================

interface TimeInputProps {
  value?: string; // HH:MM format
  onChange: (time: string) => void;
  className?: string;
  placeholder?: string;
}

export function TimeInput({
  value = '',
  onChange,
  className,
  placeholder = 'HH:MM',
}: TimeInputProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const [isEditing, setIsEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const formatTimeInput = (input: string): string => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    if (digits.length <= 2) {
      const hour = parseInt(digits);
      if (hour > 23) return '23';
      return digits.padStart(2, '0');
    }
    
    // Handle HHMM format
    let hours = parseInt(digits.slice(0, 2));
    let mins = parseInt(digits.slice(2, 4) || '0');
    
    if (hours > 23) hours = 23;
    if (mins > 59) mins = 59;
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const formatted = formatTimeInput(localValue);
    if (formatted && formatted.includes(':')) {
      setLocalValue(formatted);
      onChange(formatted);
    } else if (localValue.length >= 2) {
      const formatted = `${localValue.slice(0, 2).padStart(2, '0')}:00`;
      setLocalValue(formatted);
      onChange(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    // Select all on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <div className={cn("relative", className)}>
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "pl-10 font-mono text-center",
          "bg-secondary border-border"
        )}
        maxLength={5}
      />
    </div>
  );
}

// ============================================================
// QUICK DATE INPUT - Inline date input without popover
// ============================================================

interface QuickDateInputProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
}

export function QuickDateInput({
  value = '',
  onChange,
  className,
  placeholder = 'DD.MM.RRRR',
}: QuickDateInputProps) {
  const [localValue, setLocalValue] = React.useState('');
  const [isValid, setIsValid] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setLocalValue(format(date, 'dd.MM.yyyy'));
      }
    } else {
      setLocalValue('');
    }
  }, [value]);

  const parseAndValidate = (input: string): { valid: boolean; date?: Date } => {
    const cleaned = input.replace(/[.\-\/\s]/g, '');
    
    if (cleaned.length === 0) return { valid: true };
    
    let day: number, month: number, year: number;
    const now = new Date();
    
    if (cleaned.length === 2) {
      day = parseInt(cleaned);
      month = now.getMonth();
      year = now.getFullYear();
    } else if (cleaned.length === 4) {
      day = parseInt(cleaned.slice(0, 2));
      month = parseInt(cleaned.slice(2, 4)) - 1;
      year = now.getFullYear();
    } else if (cleaned.length === 6) {
      day = parseInt(cleaned.slice(0, 2));
      month = parseInt(cleaned.slice(2, 4)) - 1;
      year = 2000 + parseInt(cleaned.slice(4, 6));
    } else if (cleaned.length === 8) {
      day = parseInt(cleaned.slice(0, 2));
      month = parseInt(cleaned.slice(2, 4)) - 1;
      year = parseInt(cleaned.slice(4, 8));
    } else {
      return { valid: false };
    }
    
    if (day < 1 || day > 31 || month < 0 || month > 11 || isNaN(day) || isNaN(month) || isNaN(year)) {
      return { valid: false };
    }
    
    const date = new Date(year, month, day);
    if (date.getDate() === day && date.getMonth() === month) {
      return { valid: true, date };
    }
    return { valid: false };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    
    // Auto-insert dots for better UX
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 2 && !raw.includes('.')) {
      raw = digits.slice(0, 2) + '.' + digits.slice(2);
    }
    if (digits.length >= 4 && raw.split('.').length < 3) {
      const parts = raw.split('.');
      if (parts[1] && parts[1].length >= 2) {
        raw = parts[0] + '.' + parts[1].slice(0, 2) + '.' + parts[1].slice(2);
      }
    }
    
    setLocalValue(raw);
    
    const result = parseAndValidate(raw);
    setIsValid(result.valid);
  };

  const handleBlur = () => {
    const result = parseAndValidate(localValue);
    if (result.date) {
      const formatted = format(result.date, 'dd.MM.yyyy');
      setLocalValue(formatted);
      onChange(format(result.date, 'yyyy-MM-dd'));
      setIsValid(true);
    } else if (localValue === '') {
      setIsValid(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "pl-10 font-mono",
          "bg-secondary border-border",
          !isValid && "border-destructive focus-visible:ring-destructive"
        )}
        maxLength={10}
      />
      {!isValid && (
        <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
      )}
    </div>
  );
}
