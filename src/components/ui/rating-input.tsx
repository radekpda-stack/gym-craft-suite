import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RatingInput({
  value,
  onChange,
  max = 10,
  disabled = false,
  size = "md",
}: RatingInputProps) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const getRatingColor = (rating: number) => {
    if (rating <= 3) return "text-destructive";
    if (rating <= 5) return "text-warning";
    if (rating <= 7) return "text-primary";
    return "text-success";
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onChange(rating)}
          className={cn(
            "transition-all duration-150 hover:scale-110 focus:outline-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              value && rating <= value
                ? cn("fill-current", getRatingColor(value))
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
      {value && (
        <span className={cn(
          "ml-2 font-semibold tabular-nums",
          getRatingColor(value)
        )}>
          {value}/10
        </span>
      )}
    </div>
  );
}

interface RatingDisplayProps {
  value: number | null;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}

export function RatingDisplay({ value, size = "sm", showNumber = true }: RatingDisplayProps) {
  if (!value) return <span className="text-muted-foreground">—</span>;

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const getRatingColor = (rating: number) => {
    if (rating <= 3) return "text-destructive";
    if (rating <= 5) return "text-warning";
    if (rating <= 7) return "text-primary";
    return "text-success";
  };

  return (
    <div className={cn("flex items-center gap-1", sizeClasses[size])}>
      <Star className={cn("w-4 h-4 fill-current", getRatingColor(value))} />
      {showNumber && (
        <span className={cn("font-semibold tabular-nums", getRatingColor(value))}>
          {value}/10
        </span>
      )}
    </div>
  );
}
