import { cn } from '@/lib/utils';
import { Stethoscope, Bone, Dumbbell, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Diagnostic, JOINT_OPTIONS, MUSCLE_OPTIONS } from '@/hooks/useDiagnostics';
import { Client } from '@/hooks/useClients';
import { Badge } from '@/components/ui/badge';

interface DiagnosticCardProps {
  diagnostic: Diagnostic;
  client?: Client | null;
  hasAIAnalysis?: boolean;
  className?: string;
  onClick?: () => void;
}

function getAreaLabel(areaType: string, areaName: string): string {
  const options = areaType === 'joint' ? JOINT_OPTIONS : MUSCLE_OPTIONS;
  const option = options.find(o => o.value === areaName);
  return option?.label || areaName;
}

export function DiagnosticCard({
  diagnostic,
  client,
  hasAIAnalysis = false,
  className,
  onClick,
}: DiagnosticCardProps) {
  const diagnosticDate = new Date(diagnostic.date);
  const isJoint = diagnostic.area_type === 'joint';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full text-left glass rounded-xl border-l-4 border-l-primary/60 transition-all duration-200 hover:glow p-3 sm:p-4',
        className
      )}
    >
      {/* Header: Time, Client Name, Type Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-muted-foreground tabular-nums shrink-0">
            {format(diagnosticDate, 'd. M. yyyy', { locale: cs })}
          </span>
          <span className="font-medium text-foreground truncate">
            {client?.name || 'Klient'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasAIAnalysis && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              AI
            </Badge>
          )}
          <Stethoscope className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      {/* Area info */}
      <div className="flex items-center gap-2 mt-2">
        {isJoint ? (
          <Bone className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Dumbbell className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          {getAreaLabel(diagnostic.area_type, diagnostic.area_name)}
        </span>
        <Badge variant="outline" className="h-5 text-xs">
          {isJoint ? 'Kloub' : 'Sval'}
        </Badge>
      </div>
      
      {/* Findings preview */}
      {diagnostic.findings && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {diagnostic.findings}
        </p>
      )}
    </button>
  );
}
