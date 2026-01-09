import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { useDiagnosticAssessments } from '@/hooks/useDiagnosticAssessments';
import { useCreateDiagnostic } from '@/hooks/useDiagnostics';
import { useCreateDiagnosticAssessment } from '@/hooks/useDiagnosticAssessment';
import { UnifiedDiagnosticForm, UnifiedDiagnosticData } from '@/components/diagnostics/UnifiedDiagnosticForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  Stethoscope, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  PlusCircle
} from 'lucide-react';

export default function ClientPortalDiagnostic() {
  const { clientId, clientProfile, clientAccount } = useClientPortal();
  const trainerId = clientAccount?.trainer_id;
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: diagnostics, isLoading, refetch } = useDiagnosticAssessments(clientId ?? undefined);
  const createDiagnostic = useCreateDiagnostic();
  const createAssessment = useCreateDiagnosticAssessment();
  
  const { trackPageMount } = useClientPortalPageTracking('client_portal_diagnostic');

  useEffect(() => {
    trackPageMount();
  }, [trackPageMount]);

  const handleSubmit = async (data: UnifiedDiagnosticData) => {
    if (!clientId || !trainerId) {
      toast.error('Chyba: nelze identifikovat klienta nebo trenéra');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create base diagnostic record
      const diagnosticResult = await createDiagnostic.mutateAsync({
        client_id: clientId,
        date: new Date().toISOString().split('T')[0],
        area_type: 'joint', // Default type for unified form
        area_name: 'celkové hodnocení',
        findings: data.primaryGoal || 'Vstupní diagnostika',
        notes: data.healthIssues || null,
      });

      // 2. Create extended assessment
      await createAssessment.mutateAsync({
        diagnostic_id: diagnosticResult.id,
        diagnostic_level: 'functional',
        occupation: data.occupation,
        sitting_hours_daily: data.sittingHoursDaily,
        sleep_hours: data.sleepHours,
        sleep_quality: data.sleepQuality,
        stress_level: data.stressLevel,
        mobility_shoulders: data.mobilityShoulders || null,
        mobility_hips: data.mobilityHips || null,
        mobility_ankles: data.mobilityAnkles || null,
        mobility_thoracic: data.mobilityThoracic || null,
        squat_quality: data.squatQuality || null,
        lunge_quality: data.lungeQuality || null,
        hip_hinge_quality: data.hipHingeQuality || null,
        push_quality: data.pushQuality || null,
        pull_quality: data.pullQuality || null,
        trainer_priorities: data.trainerPriorities,
        trainer_limitations: data.trainerLimitations,
        trainer_risks: data.trainerRisks,
        trainer_other_notes: data.trainerNotes,
        short_term_goals: data.primaryGoal,
        long_term_goals: data.secondaryGoals,
        sports_history: data.sportsHistory,
        current_activities: data.currentActivities,
        pain_areas: data.painAreas,
        injuries: data.injuries ? [data.injuries] : [],
        surgeries: data.surgeries ? [data.surgeries] : [],
        diseases: data.healthIssues ? [data.healthIssues] : [],
      });

      // 3. Update client profile with relevant data
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          health_restrictions: data.healthIssues || '',
          training_goals: data.primaryGoal ? [data.primaryGoal] : [],
          occupation: data.occupation,
          sitting_hours_daily: data.sittingHoursDaily,
          sleep_hours: data.sleepHours,
          stress_level: data.stressLevel,
          sports_history: data.sportsHistory,
          current_activities: data.currentActivities,
        })
        .eq('id', clientId);

      if (updateError) {
        console.error('Error updating client profile:', updateError);
      }

      // 4. Create notification for trainer via direct insert
      if (trainerId) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: trainerId,
            type: 'diagnostic_completed',
            title: 'Diagnostika dokončena',
            message: `Klient ${clientProfile?.name || 'Neznámý'} vyplnil diagnostický formulář.`,
            entity_type: 'diagnostic',
            entity_id: diagnosticResult.id,
            client_id: clientId,
          });
        if (notifError) console.error('Notification error:', notifError);
      }

      toast.success('Diagnostika byla úspěšně odeslána!');
      setShowForm(false);
      refetch();
    } catch (error) {
      console.error('Error submitting diagnostic:', error);
      toast.error('Nepodařilo se odeslat diagnostiku');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
            ← Zpět
          </Button>
          <h1 className="text-xl font-bold">Vyplnit diagnostiku</h1>
        </div>
        
        <UnifiedDiagnosticForm
          mode="client"
          clientName={clientProfile?.name}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            Diagnostika
          </h1>
          <p className="text-muted-foreground text-sm">
            Vyplňte diagnostiku pro lepší tréninkový plán
          </p>
        </div>
      </div>

      {/* CTA Card - Show if no diagnostics or encourage new one */}
      {(!diagnostics || diagnostics.length === 0) && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Vyplňte vstupní diagnostiku</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Pomůže vašemu trenérovi připravit trénink přesně na míru vašim potřebám a cílům.
                  </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="shrink-0">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Vyplnit nyní
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* New Diagnostic Button - If already has diagnostics */}
      {diagnostics && diagnostics.length > 0 && (
        <Button onClick={() => setShowForm(true)} variant="outline" className="w-full sm:w-auto">
          <PlusCircle className="w-4 h-4 mr-2" />
          Nová diagnostika
        </Button>
      )}

      {/* Diagnostics History */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Historie diagnostik
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : diagnostics && diagnostics.length > 0 ? (
          <div className="space-y-3">
            {diagnostics.map((diagnostic, index) => (
              <motion.div
                key={diagnostic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(diagnostic.date), 'd. MMMM yyyy', { locale: cs })}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {diagnostic.findings || 'Vstupní diagnostika'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {diagnostic.assessment?.diagnostic_level === 'deep' ? 'Hloubková' : 
                           diagnostic.assessment?.diagnostic_level === 'functional' ? 'Funkční' : 'Základní'}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Zatím nemáte žádné diagnostiky. Vyplňte první diagnostiku pro zlepšení vašeho tréninku.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
