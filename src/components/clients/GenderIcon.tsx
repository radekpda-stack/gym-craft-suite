import { cn } from "@/lib/utils";

interface GenderIconProps {
  gender: 'male' | 'female' | null;
  className?: string;
  showLabel?: boolean;
}

export function GenderIcon({ gender, className, showLabel = false }: GenderIconProps) {
  if (!gender) return null;

  const isMale = gender === 'male';
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 text-sm min-w-0 max-w-full",
        isMale ? "text-primary/70" : "text-accent/70",
        className
      )}
      title={isMale ? "Muž" : "Žena"}
    >
      <span className="font-medium text-base shrink-0">
        {isMale ? "♂" : "♀"}
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground min-w-0 truncate">
          {isMale ? "Muž" : "Žena"}
        </span>
      )}
    </span>
  );
}