import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Loader2, ClipboardList } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { UnifiedNotification } from '@/hooks/useAggregatedNotifications';

interface DiagnosticDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}

export function DiagnosticDetailDialog({ open, onOpenChange, notification }: DiagnosticDetailDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [assessment, setAssessment] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!open || !notification) {
      setAssessment(null);
      setClientName('');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const clientId = notification.client_id;
        if (!clientId) return;

        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', clientId)
          .maybeSingle();
        if (client?.name) setClientName(client.name);

        // Fetch latest diagnostic assessment for this client
        const { data: assessmentData } = await supabase
          .from('diagnostic_assessments_v2')
          .select('id, assessment_type, ai_analysis, ai_risk_factors, ai_strengths, ai_priorities, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assessmentData) {
          setAssessment(assessmentData as unknown as Record<string, unknown>);
        }
      } catch (error) {
        console.error('[DiagnosticDetailDialog] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, notification]);

  const createdAt = assessment?.created_at as string | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col z-[120]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Diagnostika
          </DialogTitle>
          <DialogDescription>
            {clientName && <span className="font-medium text-foreground">{clientName}</span>}
            {createdAt && (
              <>
                {clientName && ' • '}
                <span>{format(parseISO(createdAt), 'd. MMMM yyyy', { locale: cs })}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !assessment ? (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Diagnostika nebyla nalezena</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <h3 className="font-semibold text-foreground">
                  {(assessment.assessment_type as string) || 'Diagnostika'}
                </h3>
                {createdAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(createdAt), 'EEEE d. MMMM yyyy', { locale: cs })}
                  </p>
                )}
              </div>

              {/* AI Analysis */}
              {assessment.ai_analysis && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Analýza</h3>
                  <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {String(assessment.ai_analysis).slice(0, 500)}
                      {String(assessment.ai_analysis).length > 500 && '...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Risk factors */}
              {Array.isArray(assessment.ai_risk_factors) && assessment.ai_risk_factors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Rizikové faktory</h3>
                  <div className="space-y-1">
                    {(assessment.ai_risk_factors as string[]).slice(0, 5).map((factor, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                        <span className="text-destructive shrink-0">•</span>
                        <span className="text-muted-foreground">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {Array.isArray(assessment.ai_strengths) && assessment.ai_strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Silné stránky</h3>
                  <div className="space-y-1">
                    {(assessment.ai_strengths as string[]).slice(0, 5).map((strength, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                        <span className="text-primary shrink-0">•</span>
                        <span className="text-muted-foreground">{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4 border-t shrink-0">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              const clientId = notification?.client_id;
              if (clientId) {
                onOpenChange(false);
                navigate(`/clients/${clientId}?tab=profile`);
              }
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Karta klienta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
