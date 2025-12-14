import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ExtendedDiagnosticForm } from "./ExtendedDiagnosticForm";
import { Client, useCreateClient } from "@/hooks/useClients";
import { useCreateDiagnostic } from "@/hooks/useDiagnostics";
import { useCreateDiagnosticAssessment } from "@/hooks/useDiagnosticAssessment";
import { useCreateMedia } from "@/hooks/useClientMedia";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CreateDiagnosticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  defaultClientId?: string;
}

export function CreateDiagnosticSheet({
  open,
  onOpenChange,
  clients,
  defaultClientId,
}: CreateDiagnosticSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createClient = useCreateClient();
  const createDiagnostic = useCreateDiagnostic();
  const createAssessment = useCreateDiagnosticAssessment();
  const createMedia = useCreateMedia();

  // Find existing client by email or name + birthdate
  const findExistingClient = (email?: string, name?: string, birthDate?: string): Client | undefined => {
    if (email) {
      const byEmail = clients.find(c => c.email?.toLowerCase() === email.toLowerCase());
      if (byEmail) return byEmail;
    }
    
    if (name && birthDate) {
      const byNameAndBirth = clients.find(c => 
        c.name.toLowerCase() === name.toLowerCase() && 
        c.birth_date === birthDate
      );
      if (byNameAndBirth) return byNameAndBirth;
    }
    
    return undefined;
  };

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Pro vytvoření diagnostiky musíte být přihlášen");
        return;
      }

      let clientId = formData.client_id;
      let isNewClient = false;

      // If client is already selected (from defaultClientId or form selection), use that
      if (clientId) {
        isNewClient = false;
      } else if (formData.clientName) {
        // Only search or create if a name was entered but no client selected
        const existingClient = findExistingClient(
          formData.email,
          formData.clientName,
          formData.birthDate
        );

        if (existingClient) {
          clientId = existingClient.id;
          toast.info(`Diagnostika přiřazena existujícímu klientovi: ${existingClient.name}`);
        } else {
          // Create new client with extended fields
          const newClient = await createClient.mutateAsync({
            name: formData.clientName,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            birthDate: formData.birthDate || undefined,
            gender: formData.gender || undefined,
            handedness: formData.handedness || null,
            occupation: formData.occupation || null,
            sitting_hours_daily: formData.sitting_hours_daily || null,
            sports_history: formData.sports_history || null,
            current_activities: formData.current_activities || null,
            sleep_hours: formData.sleep_hours || null,
            stress_level: formData.stress_level || null,
            dietary_restrictions: formData.dietary_restrictions || null,
            supplements: formData.supplements || null,
            healthRestrictions: formData.health_restrictions || undefined,
            trainingGoals: formData.training_goals || [],
            notes: formData.trainer_notes || undefined,
          });
          
          clientId = newClient.id;
          isNewClient = true;
          toast.success(`Vytvořen nový klient: ${formData.clientName}`);
        }
      }

      if (!clientId) {
        toast.error("Vyberte nebo zadejte klienta");
        setIsSubmitting(false);
        return;
      }

      // Create the base diagnostic record
      const diagnostic = await createDiagnostic.mutateAsync({
        client_id: clientId,
        date: formData.date || new Date().toISOString().split('T')[0],
        area_type: 'joint',
        area_name: 'Vstupní diagnostika',
        findings: formData.trainer_notes || 'Kompletní vstupní diagnostika',
        notes: formData.short_term_goals || null,
      });

      if (!diagnostic?.id) {
        throw new Error("Nepodařilo se vytvořit diagnostiku");
      }

      // Create the extended assessment
      await createAssessment.mutateAsync({
        diagnostic_id: diagnostic.id,
        user_id: user.id,
        handedness: formData.handedness,
        occupation: formData.occupation,
        sitting_hours_daily: formData.sitting_hours_daily,
        sports_history: formData.sports_history,
        current_activities: formData.current_activities,
        sleep_hours: formData.sleep_hours,
        sleep_quality: formData.sleep_quality,
        stress_level: formData.stress_level,
        stress_management: formData.stress_management,
        meditates: formData.meditates,
        regeneration_methods: formData.regeneration_methods,
        diseases: formData.diseases,
        surgeries: formData.surgeries,
        injuries: formData.injuries,
        pain_areas: formData.pain_areas,
        allergies: formData.allergies,
        family_health_history: formData.family_health_history,
        short_term_goals: formData.short_term_goals,
        long_term_goals: formData.long_term_goals,
        training_priorities: formData.training_priorities,
        mobility_ankles: formData.mobility_ankles,
        mobility_hips: formData.mobility_hips,
        mobility_thoracic: formData.mobility_thoracic,
        mobility_shoulders: formData.mobility_shoulders,
        core_stability: formData.core_stability,
        squat_quality: formData.squat_quality,
        lunge_quality: formData.lunge_quality,
        push_quality: formData.push_quality,
        pull_quality: formData.pull_quality,
        hip_hinge_quality: formData.hip_hinge_quality,
        pain_ankle: formData.pain_ankle,
        pain_knee: formData.pain_knee,
        pain_hip: formData.pain_hip,
        pain_si: formData.pain_si,
        pain_lumbar: formData.pain_lumbar,
        pain_thoracic: formData.pain_thoracic,
        pain_shoulder: formData.pain_shoulder,
        pain_neck: formData.pain_neck,
        motivation_level: formData.motivation_level,
        discipline_level: formData.discipline_level,
        preferred_training_style: formData.preferred_training_style,
        eating_regularity: formData.eating_regularity,
        food_allergies: formData.food_allergies,
        supplements: formData.supplements,
        dietary_restrictions: formData.dietary_restrictions,
        ai_analysis: formData.ai_analysis,
        ai_risk_factors: formData.ai_risk_factors,
        ai_strengths: formData.ai_strengths,
        ai_priorities: formData.ai_priorities,
        ai_recommendations: formData.ai_recommendations,
        ai_contraindications: formData.ai_contraindications,
        ai_must_do_exercises: formData.ai_must_do_exercises,
        ai_avoid_exercises: formData.ai_avoid_exercises,
        is_draft: false,
      });

      // Upload any pending media
      if (formData.pendingMedia && formData.pendingMedia.length > 0) {
        for (const media of formData.pendingMedia) {
          await createMedia.mutateAsync({
            client_id: clientId,
            type: media.type,
            file: media.file,
            description: `Diagnostika - ${media.description || 'Posturální analýza'}`,
            category: 'diagnostic',
            diagnostic_id: diagnostic.id,
            date: formData.date || new Date().toISOString().split('T')[0],
            body_area: media.bodyArea,
          });
        }
      }

      toast.success(isNewClient 
        ? "Diagnostika vytvořena a nový klient přidán" 
        : "Diagnostika úspěšně uložena"
      );
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating diagnostic:', error);
      toast.error("Nepodařilo se vytvořit diagnostiku");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-full sm:max-w-4xl overflow-y-auto p-0"
        side="right"
      >
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-xl">Nová komplexní diagnostika</SheetTitle>
          <SheetDescription>
            Rozšířená anamnéza s AI analýzou. Nový klient bude vytvořen pouze pokud není vybrán existující.
          </SheetDescription>
        </SheetHeader>
        <div className="p-6 pt-4">
          <ExtendedDiagnosticForm
            clients={clients}
            defaultClientId={defaultClientId}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}