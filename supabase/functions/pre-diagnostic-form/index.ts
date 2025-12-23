import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            notes
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

        // If new client source and newClientData provided, check if email exists
        if (form.source === "new_client" && newClientData) {
          const { name, email, phone } = newClientData;

          if (!name || !email) {
            return new Response(
              JSON.stringify({ error: "Name and email are required for new clients" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Check if email exists
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("email", email)
            .eq("user_id", form.user_id)
            .single();

          if (existingClient) {
            // Don't auto-create, just save form for manual assignment
            clientId = null;
          } else {
            // Create new client
            const { data: newClient, error: clientError } = await supabase
              .from("clients")
              .insert({
                user_id: form.user_id,
                name,
                email,
                phone: phone || null,
                // Map common pre-diagnostic fields to client
                birth_date: answers.birth_date || null,
                gender: answers.gender || null,
                occupation: answers.occupation || null,
                health_restrictions: answers.health_notes || null,
                training_goals: answers.goals ? [answers.goals] : [],
                notes: answers.open_question || null,
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
            if (!existingClient.birth_date && answers.birth_date) {
              updates.birth_date = answers.birth_date;
            }
            if (!existingClient.occupation && answers.occupation) {
              updates.occupation = answers.occupation;
            }
            if (!existingClient.health_restrictions && answers.health_notes) {
              updates.health_restrictions = answers.health_notes;
            }
            if ((!existingClient.training_goals || existingClient.training_goals.length === 0) && answers.goals) {
              updates.training_goals = Array.isArray(answers.goals) ? answers.goals : [answers.goals];
            }

            if (Object.keys(updates).length > 0) {
              await supabase
                .from("clients")
                .update(updates)
                .eq("id", clientId);
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
        await supabase
          .from("notifications")
          .insert({
            user_id: form.user_id,
            type: "pre_diagnostic_completed",
            title: "Pre-diagnostika dokončena",
            message: clientId 
              ? "Klient vyplnil pre-diagnostický formulář."
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
