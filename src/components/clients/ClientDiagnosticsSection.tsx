import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  Stethoscope,
  Plus,
  ChevronRight,
  Bone,
  Dumbbell,
  Sparkles,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { JOINT_OPTIONS, MUSCLE_OPTIONS } from '@/hooks/useDiagnostics';
import { useDiagnosticAssessments, DiagnosticWithAssessment } from '@/hooks/useDiagnosticAssessments';
import { DiagnosticDetailSheet } from '@/components/diagnostics/DiagnosticDetailSheet';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface ClientDiagnosticsSectionProps {
  clientId: string;
  clientName: string;
}

function getAreaLabel(areaType: string, areaName: string): string {
  const options = areaType === 'joint' ? JOINT_OPTIONS : MUSCLE_OPTIONS;
  const option = options.find(o => o.value === areaName);
  return option?.label || areaName;
}

function getSeverityFromFindings(findings: string): {
  level: 'low' | 'medium' | 'high';
  color: string;
} {
  const lowercaseFindings = findings.toLowerCase();
  
  const highSeverityKeywords = ['akutní', 'silná bolest', 'otok', 'zánět', 'ruptura', 'zlomenina'];
  if (highSeverityKeywords.some(kw => lowercaseFindings.includes(kw))) {
    return { level: 'high', color: 'text-destructive' };
  }
  
  const mediumSeverityKeywords = ['bolest', 'omezení', 'dysfunkce', 'svalová nerovnováha', 'zkrácení'];
  if (mediumSeverityKeywords.some(kw => lowercaseFindings.includes(kw))) {
    return { level: 'medium', color: 'text-warning' };
  }
  
  return { level: 'low', color: 'text-success' };
}

export function ClientDiagnosticsSection({ clientId, clientName }: ClientDiagnosticsSectionProps) {
  const { data: diagnosticsWithAssessments = [], isLoading } = useDiagnosticAssessments(clientId);
  const { data: clients = [] } = useClients();
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticWithAssessment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Stats
  const totalDiagnostics = diagnosticsWithAssessments.length;
  const withAI = diagnosticsWithAssessments.filter(d => d.assessment?.ai_analysis).length;
  const recentIssues = diagnosticsWithAssessments.filter(d => {
    const severity = getSeverityFromFindings(d.findings);
    return severity.level !== 'low';
  }).length;

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-2xl p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Diagnostika</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Nová
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
            <p className="text-xl font-bold text-primary">{totalDiagnostics}</p>
            <p className="text-[10px] text-muted-foreground">Celkem</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <p className="text-xl font-bold text-foreground">{withAI}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">S AI analýzou</p>
          </div>
          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-center">
            <p className="text-xl font-bold text-warning">{recentIssues}</p>
            <p className="text-[10px] text-muted-foreground">Problémy</p>
          </div>
        </div>

        {/* Diagnostics List */}
        {diagnosticsWithAssessments.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Poslední diagnostiky</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {diagnosticsWithAssessments.slice(0, 5).map((diagnostic) => {
                const isJoint = diagnostic.area_type === 'joint';
                const severity = getSeverityFromFindings(diagnostic.findings);
                const hasAssessment = !!diagnostic.assessment?.ai_analysis;
                
                return (
                  <button
                    key={diagnostic.id}
                    onClick={() => setSelectedDiagnostic(diagnostic)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isJoint ? 'bg-blue-500/20' : 'bg-orange-500/20'
                      )}>
                        {isJoint ? (
                          <Bone className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Dumbbell className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {getAreaLabel(diagnostic.area_type, diagnostic.area_name)}
                          </p>
                          {severity.level !== 'low' && (
                            <AlertTriangle className={cn('w-3 h-3 shrink-0', severity.color)} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(new Date(diagnostic.date), 'd. MMM yyyy', { locale: cs })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasAssessment && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
                          <Sparkles className="w-3 h-3" />
                          AI
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
            {diagnosticsWithAssessments.length > 5 && (
              <p className="text-xs text-center text-muted-foreground">
                +{diagnosticsWithAssessments.length - 5} dalších
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Zatím žádná diagnostika</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Přidat diagnostiku
            </Button>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <DiagnosticDetailSheet
        open={!!selectedDiagnostic}
        onOpenChange={(open) => !open && setSelectedDiagnostic(null)}
        diagnostic={selectedDiagnostic}
      />

      {/* Create Sheet */}
      <CreateDiagnosticSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clients={clients}
        defaultClientId={clientId}
      />
    </>
  );
}
