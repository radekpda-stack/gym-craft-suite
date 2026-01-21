import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to build comprehensive health restrictions from form answers
function buildHealthRestrictions(answers: Record<string, any>): string {
  const parts: string[] = [];
  
  // Pain areas
  if (answers.pain_areas && Array.isArray(answers.pain_areas) && answers.pain_areas.length > 0) {
    const painInfo: string[] = [];
    painInfo.push(`Bolestivé oblasti: ${answers.pain_areas.join(', ')}`);
    if (answers.pain_type) painInfo.push(`Typ: ${answers.pain_type}`);
    if (answers.pain_duration) painInfo.push(`Trvání: ${answers.pain_duration}`);
    if (answers.pain_limitation) painInfo.push(`Omezení: ${answers.pain_limitation}`);
    parts.push(painInfo.join(' | '));
  }
  
  // Injuries
  if (answers.injury_history === true || answers.injury_history === 'yes') {
    const injuries = answers.injury_details || answers.injuries || 'Ano (bez upřesnění)';
    parts.push(`Úrazy: ${injuries}`);
  }
  
  // Surgeries
  if (answers.surgery_history === true || answers.surgery_history === 'yes') {
    const surgeries = answers.surgery_details || answers.surgeries || 'Ano (bez upřesnění)';
    parts.push(`Operace: ${surgeries}`);
  }
  
  // Medications
  if (answers.medications === true || answers.medications === 'yes' || answers.medication_details) {
    const meds = answers.medication_details || answers.medications_list || 'Ano (bez upřesnění)';
    parts.push(`Léky: ${meds}`);
  }
  
  // Health conditions/diseases
  if (answers.health_conditions && Array.isArray(answers.health_conditions) && answers.health_conditions.length > 0) {
    parts.push(`Zdravotní stavy: ${answers.health_conditions.join(', ')}`);
  }
  
  // General health notes
  if (answers.health_notes) {
    parts.push(`Poznámky: ${answers.health_notes}`);
  }
  
  return parts.join('\n');
}

// Helper to build training goals from form answers
function buildTrainingGoals(answers: Record<string, any>): string[] {
  const goals: string[] = [];
  
  if (answers.main_goal) {
    goals.push(answers.main_goal);
  }
  
  if (answers.goals) {
    if (Array.isArray(answers.goals)) {
      goals.push(...answers.goals);
    } else {
      goals.push(answers.goals);
    }
  }
  
  if (answers.priorities && Array.isArray(answers.priorities)) {
    goals.push(...answers.priorities);
  }
  
  // Remove duplicates
  return [...new Set(goals)];
}

// Helper to map daily activity type to sitting hours
function getSittingHours(activityType: string): number | null {
  if (!activityType) return null;
  
  switch (activityType.toLowerCase()) {
    case 'sedentary':
    case 'sedavé':
    case 'sedave':
      return 8;
    case 'light':
    case 'lehká':
    case 'lehka':
      return 6;
    case 'moderate':
    case 'středně aktivní':
    case 'stredne aktivni':
    case 'combined':
    case 'kombinované':
    case 'kombinovane':
      return 5; // Combined work = mix of sitting and standing
    case 'active':
    case 'aktivní':
    case 'aktivni':
      return 3;
    case 'physical':
    case 'very_active':
    case 'velmi aktivní':
    case 'velmi aktivni':
      return 1;
    default:
      console.log(`Unknown activity type for sitting hours: ${activityType}`);
      return null;
  }
}

// Helper to map work type to occupation description
function mapWorkType(workType: string | undefined | null): string | null {
  if (!workType) return null;
  
  switch (workType.toLowerCase()) {
    case 'sedentary':
    case 'sedavé':
    case 'sedave':
      return 'sedavé zaměstnání';
    case 'combined':
    case 'kombinované':
    case 'kombinovane':
      return 'kombinované zaměstnání';
    case 'active':
    case 'aktivní':
    case 'aktivni':
      return 'aktivní zaměstnání';
    case 'physical':
    case 'fyzicky náročné':
    case 'fyzicky narocne':
      return 'fyzicky náročné zaměstnání';
    default:
      console.log(`Unknown work type for occupation: ${workType}`);
      return null;
  }
}

// Helper to build comprehensive client notes from answers
function buildNotes(answers: Record<string, any>): string {
  const parts: string[] = [];
  
  if (answers.open_question) {
    parts.push(answers.open_question);
  }
  
  if (answers.expectations) {
    parts.push(`Očekávání: ${answers.expectations}`);
  }
  
  if (answers.preferred_training_time) {
    parts.push(`Preferovaný čas tréninku: ${answers.preferred_training_time}`);
  }
  
  if (answers.training_frequency) {
    parts.push(`Frekvence tréninku: ${answers.training_frequency}`);
  }
  
  return parts.join('\n');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const token = pathParts[pathParts.length - 1];

    if (req.method === "GET") {
      // Get form data by token
      console.log("GET request for token:", token, "from URL:", url.pathname);
      
      if (!token || token === "pre-diagnostic-form") {
        console.log("Token missing or invalid");
        return new Response(
          JSON.stringify({ error: "Token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: form, error: formError } = await supabase
        .from("pre_diagnostic_forms")
        .select(`
          id,
          client_id,
          status,
          source,
          locked,
          expires_at,
          clients (
            id,
            name,
            email,
            phone,
            birth_date,
            gender,
            occupation,
            health_restrictions,
            training_goals,
            notes,
            current_activities,
            sleep_hours
          )
        `)
        .eq("token", token)
        .single();

      if (formError || !form) {
        console.log("Form not found for token:", token, "error:", formError);
        return new Response(
          JSON.stringify({ error: "Form not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Form found:", { id: form.id, source: form.source, status: form.status });

      // Check if expired
      if (new Date(form.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Form has expired", expired: true }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if locked/completed
      if (form.locked || form.status === "completed") {
        return new Response(
          JSON.stringify({ error: "Form is already completed", completed: true }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Track opened_at if not already set (first open)
      const { data: formWithOpened } = await supabase
        .from("pre_diagnostic_forms")
        .select("opened_at")
        .eq("id", form.id)
        .single();

      if (!formWithOpened?.opened_at) {
        await supabase
          .from("pre_diagnostic_forms")
          .update({ opened_at: new Date().toISOString() })
          .eq("id", form.id);
        console.log(`Marked pre-diagnostic form ${form.id} as opened`);
      }

      // Get existing answers (for draft)
      const { data: answers } = await supabase
        .from("pre_diagnostic_answers")
        .select("field_key, value")
        .eq("form_id", form.id);

      const answersMap: Record<string, any> = {};
      (answers || []).forEach((a: any) => {
        answersMap[a.field_key] = a.value;
      });

      return new Response(
        JSON.stringify({
          form: {
            id: form.id,
            status: form.status,
            source: form.source,
            client: form.clients,
          },
          answers: answersMap,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      // Handle autosave (draft)
      if (action === "autosave") {
        const { formId, answers } = body;

        if (!formId || !answers) {
          return new Response(
            JSON.stringify({ error: "Form ID and answers are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check form exists and is not locked
        const { data: form } = await supabase
          .from("pre_diagnostic_forms")
          .select("id, locked, status")
          .eq("id", formId)
          .single();

        if (!form || form.locked || form.status === "completed") {
          return new Response(
            JSON.stringify({ error: "Cannot save to this form" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update status to draft
        await supabase
          .from("pre_diagnostic_forms")
          .update({ status: "draft" })
          .eq("id", formId);

        // Upsert answers
        for (const [key, value] of Object.entries(answers)) {
          await supabase
            .from("pre_diagnostic_answers")
            .upsert({
              form_id: formId,
              field_key: key,
              value: value,
            }, { onConflict: "form_id,field_key" });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle form submission
      if (action === "submit") {
        const { formId, answers, newClientData } = body;

        if (!formId || !answers) {
          return new Response(
            JSON.stringify({ error: "Form ID and answers are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Submit action - answers received:", JSON.stringify(answers, null, 2));

        // Get form
        const { data: form, error: formError } = await supabase
          .from("pre_diagnostic_forms")
          .select("id, client_id, user_id, locked, status, source")
          .eq("id", formId)
          .single();

        if (formError || !form) {
          return new Response(
            JSON.stringify({ error: "Form not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (form.locked || form.status === "completed") {
          return new Response(
            JSON.stringify({ error: "Form is already completed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let clientId = form.client_id;

        // Build comprehensive client data from answers (support both old and new format)
        const healthRestrictions = buildHealthRestrictions(answers);
        const trainingGoals = buildTrainingGoals(answers);
        const notes = buildNotes(answers);
        
        // Support both old sitting_hours_daily and new sitting_hours + work_type
        const sittingHours = answers.sitting_hours ?? answers.sitting_hours_daily ?? getSittingHours(answers.daily_activity_type) ?? getSittingHours(answers.work_type);
        
        // Map work_type to occupation if provided (call mapWorkType for both work_type and daily_activity_type)
        const occupation = answers.occupation || mapWorkType(answers.work_type) || mapWorkType(answers.daily_activity_type) || answers.daily_activity_type;
        
        console.log("Activity mapping:", { 
          daily_activity_type: answers.daily_activity_type,
          work_type: answers.work_type,
          calculated_sitting_hours: sittingHours,
          calculated_occupation: occupation 
        });
        
        // Support both birth_date and birth_year (and age conversion)
        let birthDate = answers.birth_date;
        if (!birthDate && answers.birth_year) {
          birthDate = `${answers.birth_year}-01-01`;
        }
        // If only age is provided, calculate approximate birth year
        if (!birthDate && answers.age) {
          const age = parseInt(answers.age);
          if (!isNaN(age) && age > 0 && age < 120) {
            const birthYear = new Date().getFullYear() - age;
            birthDate = `${birthYear}-01-01`;
            console.log(`Calculated birth_date from age ${age}: ${birthDate}`);
          }
        }
        console.log("Birth date mapping:", { 
          raw_birth_date: answers.birth_date, 
          birth_year: answers.birth_year, 
          age: answers.age,
          resolved: birthDate 
        });

        // Build health notes from pain + health_notes
        let combinedHealthRestrictions = healthRestrictions;
        if (answers.has_pain && answers.pain_areas?.length > 0) {
          const painInfo = `Aktuální bolest: ${answers.pain_areas.join(', ')}${answers.pain_note ? ` - ${answers.pain_note}` : ''}`;
          combinedHealthRestrictions = combinedHealthRestrictions 
            ? `${combinedHealthRestrictions}\n${painInfo}` 
            : painInfo;
        }
        if (answers.health_notes) {
          combinedHealthRestrictions = combinedHealthRestrictions 
            ? `${combinedHealthRestrictions}\n${answers.health_notes}` 
            : answers.health_notes;
        }

        // Client data to save
        const clientData: Record<string, any> = {
          birth_date: birthDate || null,
          gender: answers.gender || null,
          occupation: occupation || null,
          sitting_hours_daily: sittingHours,
          current_activities: Array.isArray(answers.current_activities) 
            ? answers.current_activities 
            : answers.current_activities ? [answers.current_activities] : null,
          sleep_hours: answers.sleep_hours || (answers.sleep_hours_avg ? parseFloat(answers.sleep_hours_avg) : null),
          sports_history: answers.exercise_experience || answers.sports_history || null,
          stress_level: answers.stress_level || null,
          health_restrictions: combinedHealthRestrictions || null,
          training_goals: trainingGoals.length > 0 ? trainingGoals : (answers.main_goal ? [answers.main_goal] : null),
          notes: notes || null,
          handedness: answers.handedness || null,
          dietary_restrictions: Array.isArray(answers.dietary_restrictions)
            ? answers.dietary_restrictions
            : null,
          supplements: Array.isArray(answers.supplements)
            ? answers.supplements
            : null,
        };

        // If new client source and newClientData provided, check if email exists
        if (form.source === "new_client" && newClientData) {
          const { name, first_name, last_name, email, phone, gender, birth_date } = newClientData;
          
          // Build full name from components if not provided
          const fullName = name || `${first_name || ''} ${last_name || ''}`.trim();

          if (!fullName || !email) {
            return new Response(
              JSON.stringify({ error: "Name and email are required for new clients" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Check if email exists for this trainer
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id, name, email")
            .eq("email", email)
            .eq("user_id", form.user_id)
            .single();

          if (existingClient) {
            // Client exists - update with new data (merge)
            clientId = existingClient.id;
            console.log("Found existing client by email:", existingClient.id, existingClient.name);
            
            // Merge client data with existing client (only update missing fields)
            const { data: fullExistingClient } = await supabase
              .from("clients")
              .select("*")
              .eq("id", clientId)
              .single();

            if (fullExistingClient) {
              const updates: Record<string, any> = {};
              
              // Update birth_date if provided and not set
              if (!fullExistingClient.birth_date && (birth_date || clientData.birth_date)) {
                updates.birth_date = birth_date || clientData.birth_date;
              }
              // Update gender if provided and not set
              if (!fullExistingClient.gender && (gender || clientData.gender)) {
                updates.gender = gender || clientData.gender;
              }
              // Update phone if provided and not set
              if (!fullExistingClient.phone && phone) {
                updates.phone = phone;
              }
              // Apply other clientData updates for missing fields
              if (!fullExistingClient.occupation && clientData.occupation) {
                updates.occupation = clientData.occupation;
              }
              if (!fullExistingClient.sitting_hours_daily && clientData.sitting_hours_daily) {
                updates.sitting_hours_daily = clientData.sitting_hours_daily;
              }
              if ((!fullExistingClient.current_activities || fullExistingClient.current_activities.length === 0) && clientData.current_activities) {
                updates.current_activities = clientData.current_activities;
              }
              if (!fullExistingClient.sleep_hours && clientData.sleep_hours) {
                updates.sleep_hours = clientData.sleep_hours;
              }
              if (!fullExistingClient.sports_history && clientData.sports_history) {
                updates.sports_history = clientData.sports_history;
              }
              if (!fullExistingClient.stress_level && clientData.stress_level) {
                updates.stress_level = clientData.stress_level;
              }
              if (!fullExistingClient.health_restrictions && clientData.health_restrictions) {
                updates.health_restrictions = clientData.health_restrictions;
              }
              if ((!fullExistingClient.training_goals || fullExistingClient.training_goals.length === 0) && clientData.training_goals) {
                updates.training_goals = clientData.training_goals;
              }
              if (!fullExistingClient.handedness && clientData.handedness) {
                updates.handedness = clientData.handedness;
              }
              // Append notes if existing
              if (clientData.notes) {
                if (fullExistingClient.notes) {
                  updates.notes = fullExistingClient.notes + '\n\n--- Z pre-diagnostiky ---\n' + clientData.notes;
                } else {
                  updates.notes = clientData.notes;
                }
              }

              if (Object.keys(updates).length > 0) {
                console.log("Updating existing client with:", updates);
                await supabase
                  .from("clients")
                  .update(updates)
                  .eq("id", clientId);
              }
            }
          } else {
            // Create new client with full data
            const { data: newClient, error: clientError } = await supabase
              .from("clients")
              .insert({
                user_id: form.user_id,
                name: fullName,
                email,
                phone: phone || null,
                gender: gender || clientData.gender || null,
                birth_date: birth_date || clientData.birth_date || null,
                occupation: clientData.occupation || null,
                sitting_hours_daily: clientData.sitting_hours_daily,
                current_activities: clientData.current_activities || null,
                sleep_hours: clientData.sleep_hours || null,
                sports_history: clientData.sports_history || null,
                stress_level: clientData.stress_level || null,
                health_restrictions: clientData.health_restrictions || null,
                training_goals: clientData.training_goals || null,
                notes: clientData.notes || null,
                handedness: clientData.handedness || null,
              })
              .select()
              .single();

            if (clientError) {
              console.error("Error creating client:", clientError);
              return new Response(
                JSON.stringify({ error: "Failed to create client" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            clientId = newClient.id;
            console.log("New client created with ID:", clientId);
          }
        } else if (clientId) {
          // Update existing client with pre-diagnostic data (only fill missing fields)
          const { data: existingClient } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .single();

          if (existingClient) {
            const updates: Record<string, any> = {};

            // Only update if field is empty/null
            if (!existingClient.birth_date && clientData.birth_date) {
              updates.birth_date = clientData.birth_date;
            }
            if (!existingClient.gender && clientData.gender) {
              updates.gender = clientData.gender;
            }
            if (!existingClient.occupation && clientData.occupation) {
              updates.occupation = clientData.occupation;
            }
            if (!existingClient.sitting_hours_daily && clientData.sitting_hours_daily) {
              updates.sitting_hours_daily = clientData.sitting_hours_daily;
            }
            if ((!existingClient.current_activities || existingClient.current_activities.length === 0) && clientData.current_activities) {
              updates.current_activities = clientData.current_activities;
            }
            if (!existingClient.sleep_hours && clientData.sleep_hours) {
              updates.sleep_hours = clientData.sleep_hours;
            }
            if (!existingClient.sports_history && clientData.sports_history) {
              updates.sports_history = clientData.sports_history;
            }
            if (!existingClient.stress_level && clientData.stress_level) {
              updates.stress_level = clientData.stress_level;
            }
            if (!existingClient.health_restrictions && clientData.health_restrictions) {
              updates.health_restrictions = clientData.health_restrictions;
            }
            if ((!existingClient.training_goals || existingClient.training_goals.length === 0) && clientData.training_goals) {
              updates.training_goals = clientData.training_goals;
            }
            if (!existingClient.handedness && clientData.handedness) {
              updates.handedness = clientData.handedness;
            }
            if ((!existingClient.dietary_restrictions || existingClient.dietary_restrictions.length === 0) && clientData.dietary_restrictions) {
              updates.dietary_restrictions = clientData.dietary_restrictions;
            }
            if ((!existingClient.supplements || existingClient.supplements.length === 0) && clientData.supplements) {
              updates.supplements = clientData.supplements;
            }
            // Append notes if existing
            if (clientData.notes) {
              if (existingClient.notes) {
                updates.notes = existingClient.notes + '\n\n--- Z pre-diagnostiky ---\n' + clientData.notes;
              } else {
                updates.notes = clientData.notes;
              }
            }

            if (Object.keys(updates).length > 0) {
              console.log("Updating existing client with:", updates);
              await supabase
                .from("clients")
                .update(updates)
                .eq("id", clientId);
            }
          }
        }

        // Create weight measurement if weight is provided
        if (clientId && answers.weight) {
          const weight = parseFloat(answers.weight);
          if (!isNaN(weight) && weight > 0) {
            console.log("Creating weight measurement for client:", clientId, "weight:", weight);
            const { error: measurementError } = await supabase
              .from("measurements")
              .insert({
                client_id: clientId,
                user_id: form.user_id,
                date: new Date().toISOString().split('T')[0],
                weight: weight,
                notes: "Z pre-diagnostického formuláře",
              });
            
            if (measurementError) {
              console.error("Error creating measurement:", measurementError);
              // Don't fail the whole submission for this
            } else {
              console.log("Weight measurement created successfully");
            }
          }
        }

        // Save all answers
        for (const [key, value] of Object.entries(answers)) {
          await supabase
            .from("pre_diagnostic_answers")
            .upsert({
              form_id: formId,
              field_key: key,
              value: value,
            }, { onConflict: "form_id,field_key" });
        }

        // Update form status to completed and lock it
        await supabase
          .from("pre_diagnostic_forms")
          .update({
            client_id: clientId,
            status: "completed",
            locked: true,
            completed_at: new Date().toISOString(),
          })
          .eq("id", formId);

        // Create notification for trainer
        const clientNameForNotif = newClientData?.name || 
          (newClientData?.first_name && newClientData?.last_name 
            ? `${newClientData.first_name} ${newClientData.last_name}` 
            : null);
            
        await supabase
          .from("notifications")
          .insert({
            user_id: form.user_id,
            type: "pre_diagnostic_completed",
            title: "Pre-diagnostika dokončena",
            message: clientId 
              ? `${clientNameForNotif || 'Klient'} vyplnil/a pre-diagnostický formulář.`
              : "Nový klient vyplnil pre-diagnostický formulář. Přiřaďte ho k existujícímu nebo vytvořte nového.",
            entity_type: "pre_diagnostic_form",
            entity_id: formId,
            client_id: clientId,
          });

        return new Response(
          JSON.stringify({ success: true, clientId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
