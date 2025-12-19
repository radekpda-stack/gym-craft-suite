import { cn } from '@/lib/utils';
import { Stethoscope, Bone, Dumbbell, Sparkles, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Diagnostic, JOINT_OPTIONS, MUSCLE_OPTIONS } from '@/hooks/useDiagnostics';
import { Client } from '@/hooks/useClients';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';

interface DiagnosticCardProps {
  diagnostic: Diagnostic;
  client?: Client | null;
  hasAIAnalysis?: boolean;
  isFollowUp?: boolean;
  className?: string;
  onClick?: () => void;
}

function getAreaLabel(areaType: string, areaName: string): string {
  const options = areaType === 'joint' ? JOINT_OPTIONS : MUSCLE_OPTIONS;
  const option = options.find(o => o.value === areaName);
  return option?.label || areaName;
}

// Determine severity based on findings text
function getSeverityFromFindings(findings: string): {
  level: 'low' | 'medium' | 'high';
  borderColor: string;
} {
  const lowercaseFindings = findings.toLowerCase();
  
  // High severity keywords
  const highSeverityKeywords = ['akutní', 'silná bolest', 'otok', 'zánět', 'ruptura', 'zlomenina', 'nemožnost'];
  if (highSeverityKeywords.some(kw => lowercaseFindings.includes(kw))) {
    return { level: 'high', borderColor: 'border-l-destructive' };
  }
  
  // Medium severity keywords  
  const mediumSeverityKeywords = ['bolest', 'omezení', 'dysfunkce', 'svalová nerovnováha', 'zkrácení', 'oslabení'];
  if (mediumSeverityKeywords.some(kw => lowercaseFindings.includes(kw))) {
    return { level: 'medium', borderColor: 'border-l-warning' };
  }
  
  // Low severity - default
  return { level: 'low', borderColor: 'border-l-primary/60' };
}

export function DiagnosticCard({
  diagnostic,
  client,
  hasAIAnalysis = false,
  isFollowUp = false,
  className,
  onClick,
}: DiagnosticCardProps) {
  const diagnosticDate = new Date(diagnostic.date);
  const isJoint = diagnostic.area_type === 'joint';
  const severity = getSeverityFromFindings(diagnostic.findings);
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'block w-full text-left glass rounded-xl border-l-4 transition-all duration-200 hover:glow p-3 sm:p-4',
        severity.borderColor,
        className
      )}
    >
      {/* Header: Avatar, Client Name, Date, Badges */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ClientAvatar 
            name={client?.name || 'K'} 
            size="sm"
            className="shrink-0"
          />
          <div className="min-w-0">
            <span className="font-medium text-foreground truncate block">
              {client?.name || 'Klient'}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {format(diagnosticDate, 'd. M. yyyy', { locale: cs })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasAIAnalysis && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              AI
            </Badge>
          )}
          {isFollowUp ? (
            <Badge variant="outline" className="h-5 text-xs">
              Kontrola
            </Badge>
          ) : (
            <Badge className="h-5 text-xs bg-primary/20 text-primary border-0">
              Nový
            </Badge>
          )}
          <Stethoscope className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      {/* Area info with severity indicator */}
      <div className="flex items-center gap-2 mt-3">
        {isJoint ? (
          <Bone className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Dumbbell className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">
          {getAreaLabel(diagnostic.area_type, diagnostic.area_name)}
        </span>
        <Badge variant="outline" className="h-5 text-xs">
          {isJoint ? 'Kloub' : 'Sval'}
        </Badge>
        {severity.level === 'high' && (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        )}
        {severity.level === 'medium' && (
          <AlertTriangle className="w-4 h-4 text-warning" />
        )}
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
