/**
 * Tag Validation Alert Component
 * 
 * Displays validation errors and warnings for training tags.
 * Shows missing required tag types and health-related warnings.
 */
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TagValidationResult } from "@/hooks/useTrainingTagValidation";
import { TAG_TYPE_LABELS, TagType } from "@/hooks/useTags";
import { cn } from "@/lib/utils";

interface TagValidationAlertProps {
  validation: TagValidationResult;
  className?: string;
  compact?: boolean;
}

export function TagValidationAlert({ 
  validation, 
  className,
  compact = false,
}: TagValidationAlertProps) {
  if (validation.isValid && validation.warnings.length === 0) {
    if (compact) return null;
    return (
      <Alert className={cn("border-success/30 bg-success/5", className)}>
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertDescription className="text-success">
          Všechny povinné tagy jsou nastaveny
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Errors - missing required tags */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium text-sm">Chybějící povinné tagy:</p>
              <div className="flex flex-wrap gap-1">
                {validation.missingTypes.map((type) => (
                  <Badge 
                    key={type} 
                    variant="outline" 
                    className="text-xs border-destructive/50 text-destructive"
                  >
                    {TAG_TYPE_LABELS[type]}
                  </Badge>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Alert className="border-warning/30 bg-warning/5 py-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            <ul className="text-sm space-y-0.5">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Inline validation message for tag selector
 */
interface TagValidationInlineProps {
  missingTypes: TagType[];
  className?: string;
}

export function TagValidationInline({ missingTypes, className }: TagValidationInlineProps) {
  if (missingTypes.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 text-xs text-destructive mt-1", className)}>
      <AlertCircle className="h-3 w-3" />
      <span>
        Doplňte: {missingTypes.map(t => TAG_TYPE_LABELS[t]).join(", ")}
      </span>
    </div>
  );
}
