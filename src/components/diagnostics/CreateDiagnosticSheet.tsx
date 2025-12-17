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

      // Use clientId from form (camelCase from ExtendedDiagnosticForm)
      let clientId = formData.clientId;
      let isNewClient = false;

      // If client is already selected (from defaultClientId or form selection), use that
      if (clientId) {
        isNewClient = false;
      } else if (formData.clientName) {
        // Only search or create if a name was entered but no client selected
        const existingClient = findExistingClient(
          formData.clientEmail,
          formData.clientName,
          formData.clientBirthDate
        );

        if (existingClient) {
          clientId = existingClient.id;
          toast.info(`Diagnostika přiřazena existujícímu klientovi: ${existingClient.name}`);
        } else {
          // Create new client with extended fields
          const newClient = await createClient.mutateAsync({
            name: formData.clientName,
            email: formData.clientEmail || undefined,
            phone: formData.phone || undefined,
            birthDate: formData.clientBirthDate || undefined,
            gender: formData.clientGender || undefined,
            handedness: formData.handedness || null,
            occupation: formData.occupation || null,
            sitting_hours_daily: formData.sittingHoursDaily || null,
            sports_history: formData.sportsHistory || null,
            current_activities: formData.currentActivities || null,
            sleep_hours: formData.sleepHours || null,
            stress_level: formData.stressLevel || null,
            dietary_restrictions: formData.dietaryRestrictions || null,
            supplements: formData.supplements || null,
            healthRestrictions: formData.health_restrictions || undefined,
            trainingGoals: formData.trainingPriorities || [],
            notes: formData.trainerNotes || undefined,
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
        findings: formData.trainerNotes || 'Kompletní vstupní diagnostika',
        notes: formData.shortTermGoals || null,
      });

      if (!diagnostic?.id) {
        throw new Error("Nepodařilo se vytvořit diagnostiku");
      }

      // Create the extended assessment - map camelCase form fields to snake_case DB fields
      await createAssessment.mutateAsync({
        diagnostic_id: diagnostic.id,
        user_id: user.id,
        handedness: formData.handedness,
        occupation: formData.occupation,
        sitting_hours_daily: formData.sittingHoursDaily,
        sports_history: formData.sportsHistory,
        current_activities: formData.currentActivities,
        sleep_hours: formData.sleepHours,
        sleep_quality: formData.sleepQuality,
        stress_level: formData.stressLevel,
        stress_management: formData.stressManagement,
        meditates: formData.meditates,
        regeneration_methods: formData.regenerationMethods,
        diseases: formData.diseases,
        surgeries: formData.surgeries,
        injuries: formData.injuries,
        pain_areas: formData.painAreas,
        allergies: formData.allergies,
        family_health_history: formData.familyHealthHistory,
        short_term_goals: formData.shortTermGoals,
        long_term_goals: formData.longTermGoals,
        training_priorities: formData.trainingPriorities,
        mobility_ankles: formData.mobilityAnkles,
        mobility_hips: formData.mobilityHips,
        mobility_thoracic: formData.mobilityThoracic,
        mobility_shoulders: formData.mobilityShoulders,
        core_stability: formData.coreStability,
        squat_quality: formData.squatQuality,
        lunge_quality: formData.lungeQuality,
        push_quality: formData.pushQuality,
        pull_quality: formData.pullQuality,
        hip_hinge_quality: formData.hipHingeQuality,
        pain_ankle: formData.painAnkle,
        pain_knee: formData.painKnee,
        pain_hip: formData.painHip,
        pain_si: formData.painSi,
        pain_lumbar: formData.painLumbar,
        pain_thoracic: formData.painThoracic,
        pain_shoulder: formData.painShoulder,
        pain_neck: formData.painNeck,
        motivation_level: formData.motivationLevel,
        discipline_level: formData.disciplineLevel,
        preferred_training_style: formData.preferredTrainingStyle,
        eating_regularity: formData.eatingRegularity,
        food_allergies: formData.foodAllergies,
        supplements: formData.supplements,
        dietary_restrictions: formData.dietaryRestrictions,
        ai_analysis: formData.aiAnalysis ? JSON.stringify(formData.aiAnalysis) : null,
        ai_risk_factors: formData.aiAnalysis?.riskFactors,
        ai_strengths: formData.aiAnalysis?.strengths,
        ai_priorities: formData.aiAnalysis?.priorities,
        ai_recommendations: formData.aiAnalysis?.recommendations,
        ai_contraindications: formData.aiAnalysis?.contraindications,
        ai_must_do_exercises: formData.aiAnalysis?.mustDoExercises,
        ai_avoid_exercises: formData.aiAnalysis?.avoidExercises,
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