import { Loader2, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAutoSaveField } from '@/hooks/useAutoSaveField';
import { cn } from '@/lib/utils';

interface InlineTextareaProps {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export function InlineTextarea({
  initialValue,
  onSave,
  placeholder,
  minHeight = '60px',
  className,
}: InlineTextareaProps) {
  const { value, onChange, onBlur, isSaving, lastSaved } = useAutoSaveField({
    initialValue,
    onSave,
  });

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(
          "bg-secondary/50 border-border/50 focus:border-primary/50 transition-colors",
          className
        )}
        style={{ minHeight }}
      />
      {/* Save indicator */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {isSaving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        )}
        {!isSaving && lastSaved && (
          <span className="text-xs text-success/70 flex items-center gap-1 animate-in fade-in duration-300">
            <Check className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}
