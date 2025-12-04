import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// Error response helper
function errorResponse(code: string, message: string, status: number, details?: object) {
  return new Response(
    JSON.stringify({ error: { code, message, details } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Success response helper
function jsonResponse(data: object, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Validate API key
function validateApiKey(req: Request): boolean {
  const apiKey = req.headers.get("x-api-key");
  const validKey = Deno.env.get("TRAINER_API_KEY");
  return apiKey === validKey && !!validKey;
}

// Parse URL path segments
function parsePath(url: URL): { resource: string; id?: string; action?: string } {
  const pathParts = url.pathname.replace("/api-v1", "").split("/").filter(Boolean);
  // Expected: /api/v1/{resource}/{id?}/{action?}
  // After edge function routing: /{resource}/{id?}/{action?}
  return {
    resource: pathParts[0] || "",
    id: pathParts[1],
    action: pathParts[2],
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const { resource, id, action } = parsePath(url);
  const method = req.method;

  console.log(`[API v1] ${method} /${resource}/${id || ""}/${action || ""}`);

  // Create Supabase client with service role for API operations
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // API key validation for write operations and sensitive reads
  const writeOperations = ["POST", "PATCH", "DELETE", "PUT"];
  if (writeOperations.includes(method) || resource === "credits") {
    if (!validateApiKey(req)) {
      return errorResponse("UNAUTHORIZED", "Invalid or missing API key", 401);
    }
  }

  try {
    // Route to appropriate handler
    switch (resource) {
      case "clients":
        return await handleClients(supabase, method, id, url, req);
      case "workouts":
        return await handleWorkouts(supabase, method, id, url, req);
      case "workout-entries":
        return await handleWorkoutEntries(supabase, method, id, req);
      case "measurements":
        return await handleMeasurements(supabase, method, id, url, req);
      case "diagnostics":
        return await handleDiagnostics(supabase, method, id, url, req);
      case "credits":
        return await handleCredits(supabase, method, id, action, url, req);
      case "calendar-events":
        return await handleCalendarEvents(supabase, method, id, url, req);
      case "health":
        return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
      default:
        return errorResponse("NOT_FOUND", `Resource '${resource}' not found`, 404);
    }
  } catch (error: unknown) {
    console.error("[API v1] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }
});

// ============ CLIENTS ============
async function handleClients(supabase: any, method: string, id: string | undefined, url: URL, req: Request) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    // List clients with optional filtering
    let query = supabase.from("clients").select("*");
    
    const name = params.get("name");
    if (name) {
      query = query.ilike("name", `%${name}%`);
    }
    
    const active = params.get("active");
    if (active === "true") {
      query = query.eq("is_archived", false);
    } else if (active === "false") {
      query = query.eq("is_archived", true);
    }

    query = query.order("is_favorite", { ascending: false }).order("created_at", { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    return jsonResponse({ clients: data || [] });
  }

  if (method === "GET" && id) {
    // Get client detail with stats
    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    
    if (error) throw error;
    if (!client) return errorResponse("NOT_FOUND", "Client not found", 404);

    // Get last training
    const { data: lastTraining } = await supabase
      .from("training_sessions")
      .select("id, date, status")
      .eq("client_id", id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get last measurement
    const { data: lastMeasurement } = await supabase
      .from("measurements")
      .select("id, date, weight, body_fat_percentage")
      .eq("client_id", id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get training count
    const { count: trainingCount } = await supabase
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("client_id", id)
      .eq("status", "completed");

    return jsonResponse({
      client: {
        ...client,
        stats: {
          last_training: lastTraining,
          last_measurement: lastMeasurement,
          completed_trainings: trainingCount || 0,
          credit_balance: client.credit_balance || 0,
        },
      },
    });
  }

  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: body.name,
        email: body.email || "",
        phone: body.phone || null,
        notes: body.notes || "",
        health_restrictions: body.health_restrictions || "",
        training_goals: body.training_goals || [],
        birth_date: body.birth_date || null,
        credit_balance: body.credit_balance || 0,
        is_favorite: body.is_favorite || false,
        is_archived: false,
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ client: data }, 201);
  }

  if (method === "PATCH" && id) {
    const body = await req.json();
    const { data, error } = await supabase
      .from("clients")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ client: data });
  }

  if (method === "DELETE" && id) {
    // Soft delete - set is_archived flag
    const { data, error } = await supabase
      .from("clients")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ client: data, message: "Client archived successfully" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ WORKOUTS (Training Sessions) ============
async function handleWorkouts(supabase: any, method: string, id: string | undefined, url: URL, req: Request) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    let query = supabase.from("training_sessions").select(`
      *,
      clients!inner(id, name)
    `);
    
    const clientId = params.get("client_id");
    if (clientId) {
      query = query.eq("client_id", clientId);
    }
    
    const dateFrom = params.get("date_from");
    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    
    const dateTo = params.get("date_to");
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    const status = params.get("status");
    if (status) {
      query = query.eq("status", status);
    }

    query = query.order("date", { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    return jsonResponse({ workouts: data || [] });
  }

  if (method === "GET" && id) {
    const { data: workout, error } = await supabase
      .from("training_sessions")
      .select(`
        *,
        clients(id, name, email),
        training_session_tags(
          tags(id, name, color)
        )
      `)
      .eq("id", id)
      .maybeSingle();
    
    if (error) throw error;
    if (!workout) return errorResponse("NOT_FOUND", "Workout not found", 404);

    // Format tags
    const tags = workout.training_session_tags?.map((t: any) => t.tags) || [];

    return jsonResponse({
      workout: {
        ...workout,
        tags,
        training_session_tags: undefined,
      },
    });
  }

  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        client_id: body.client_id,
        date: body.date,
        duration: body.duration || 60,
        status: body.status || "scheduled",
        notes: body.notes || "",
        participant_count: body.participant_count || 1,
        subjective_rating: body.subjective_rating || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ workout: data }, 201);
  }

  if (method === "PATCH" && id) {
    const body = await req.json();
    const { data, error } = await supabase
      .from("training_sessions")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ workout: data });
  }

  if (method === "DELETE" && id) {
    const { data, error } = await supabase
      .from("training_sessions")
      .update({ 
        status: "cancelled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ workout: data, message: "Workout cancelled" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ WORKOUT ENTRIES (Exercise Sets) ============
async function handleWorkoutEntries(supabase: any, method: string, id: string | undefined, req: Request) {
  // Note: This requires a workout_entries table. If it doesn't exist, 
  // return a message indicating the feature is not available
  
  // Check if table exists by trying to query it
  const { error: checkError } = await supabase
    .from("workout_entries")
    .select("id")
    .limit(1);
  
  if (checkError && checkError.code === "PGRST204") {
    return errorResponse(
      "NOT_IMPLEMENTED",
      "Workout entries feature requires additional database setup. Please contact support.",
      501
    );
  }

  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("workout_entries")
      .insert({
        training_session_id: body.training_session_id,
        exercise_id: body.exercise_id,
        exercise_name: body.exercise_name,
        set_number: body.set_number || 1,
        weight_kg: body.weight_kg,
        reps: body.reps,
        rpe: body.rpe,
        notes: body.notes || "",
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ entry: data }, 201);
  }

  if (method === "PATCH" && id) {
    const body = await req.json();
    const { data, error } = await supabase
      .from("workout_entries")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ entry: data });
  }

  if (method === "DELETE" && id) {
    const { error } = await supabase
      .from("workout_entries")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    return jsonResponse({ message: "Entry deleted" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ MEASUREMENTS ============
async function handleMeasurements(supabase: any, method: string, id: string | undefined, url: URL, req: Request) {
  const params = url.searchParams;

  if (method === "GET") {
    let query = supabase.from("measurements").select(`
      *,
      clients(id, name)
    `);
    
    const clientId = params.get("client_id");
    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const dateFrom = params.get("date_from");
    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }

    const dateTo = params.get("date_to");
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    query = query.order("date", { ascending: true }); // Ascending for graph display
    
    const { data, error } = await query;
    if (error) throw error;

    // Format for easy graph rendering
    return jsonResponse({
      measurements: data || [],
      chart_data: {
        dates: data?.map((m: any) => m.date) || [],
        weight: data?.map((m: any) => m.weight) || [],
        body_fat_percentage: data?.map((m: any) => m.body_fat_percentage) || [],
        muscle_mass: data?.map((m: any) => m.muscle_mass) || [],
        basal_metabolism: data?.map((m: any) => m.basal_metabolism) || [],
      },
    });
  }

  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("measurements")
      .insert({
        client_id: body.client_id,
        date: body.date || new Date().toISOString().split("T")[0],
        weight: body.weight,
        body_fat_percentage: body.body_fat_percentage || body.body_fat_percent,
        muscle_mass: body.muscle_mass || body.muscle_mass_kg,
        basal_metabolism: body.basal_metabolism || body.bmr_kcal,
        chest: body.chest,
        waist: body.waist,
        hips: body.hips,
        bicep_left: body.bicep_left,
        bicep_right: body.bicep_right,
        thigh_left: body.thigh_left,
        thigh_right: body.thigh_right,
        calf_left: body.calf_left,
        calf_right: body.calf_right,
        mental_state: body.mental_state,
        notes: body.notes || "",
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ measurement: data }, 201);
  }

  if (method === "PATCH" && id) {
    const body = await req.json();
    const { data, error } = await supabase
      .from("measurements")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ measurement: data });
  }

  if (method === "DELETE" && id) {
    const { error } = await supabase
      .from("measurements")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    return jsonResponse({ message: "Measurement deleted" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ DIAGNOSTICS ============
async function handleDiagnostics(supabase: any, method: string, id: string | undefined, url: URL, req: Request) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    let query = supabase.from("diagnostics").select(`
      *,
      clients(id, name)
    `);
    
    const clientId = params.get("client_id");
    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const areaType = params.get("area_type");
    if (areaType) {
      query = query.eq("area_type", areaType);
    }

    query = query.order("date", { ascending: false });
    
    const { data, error } = await query;
    if (error) throw error;
    return jsonResponse({ diagnostics: data || [] });
  }

  if (method === "GET" && id) {
    const { data, error } = await supabase
      .from("diagnostics")
      .select(`
        *,
        clients(id, name),
        client_media(id, file_url, type, description, date)
      `)
      .eq("id", id)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return errorResponse("NOT_FOUND", "Diagnostic not found", 404);
    return jsonResponse({ diagnostic: data });
  }

  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("diagnostics")
      .insert({
        client_id: body.client_id,
        date: body.date || new Date().toISOString().split("T")[0],
        area_type: body.area_type,
        area_name: body.area_name,
        findings: body.findings,
        notes: body.notes || "",
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ diagnostic: data }, 201);
  }

  if (method === "PATCH" && id) {
    const body = await req.json();
    const { data, error } = await supabase
      .from("diagnostics")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ diagnostic: data });
  }

  if (method === "DELETE" && id) {
    const { error } = await supabase
      .from("diagnostics")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    return jsonResponse({ message: "Diagnostic deleted" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ CREDITS ============
async function handleCredits(supabase: any, method: string, id: string | undefined, action: string | undefined, url: URL, req: Request) {
  const params = url.searchParams;

  // GET /credits?client_id=...
  if (method === "GET" && !action) {
    const clientId = params.get("client_id");
    if (!clientId) {
      return errorResponse("VALIDATION_ERROR", "client_id is required", 400);
    }

    // Get client with credit balance
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, credit_balance")
      .eq("id", clientId)
      .maybeSingle();
    
    if (clientError) throw clientError;
    if (!client) return errorResponse("NOT_FOUND", "Client not found", 404);

    // Get transaction history
    const { data: transactions, error: txError } = await supabase
      .from("credit_transactions")
      .select(`
        *,
        products(id, name, price),
        training_sessions(id, date, participant_count)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    
    if (txError) throw txError;

    return jsonResponse({
      client_id: client.id,
      client_name: client.name,
      credit_balance: client.credit_balance || 0,
      transactions: transactions || [],
    });
  }

  // POST /credits/consume - Deduct credits after training
  if (method === "POST" && action === "consume") {
    const body = await req.json();
    
    if (!body.client_id) {
      return errorResponse("VALIDATION_ERROR", "client_id is required", 400);
    }

    // Calculate price based on session type
    const priceMap: Record<string, number> = {
      "1": 800,  // 1 client
      "2": 1000, // 2 clients
      "3+": 1200, // 3+ clients
      "first": 1000, // First training
      "diagnostic": 500, // Diagnostic
    };
    
    const sessionType = body.session_type || "1";
    const price = body.price || priceMap[sessionType] || 800;

    // Get current balance
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("credit_balance")
      .eq("id", body.client_id)
      .single();
    
    if (clientError) throw clientError;

    const newBalance = (client.credit_balance || 0) - price;

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        client_id: body.client_id,
        amount: -price,
        type: "training_deduction",
        description: body.note || `Training session (${sessionType})`,
        training_session_id: body.training_session_id || null,
      })
      .select()
      .single();
    
    if (txError) throw txError;

    // Update client balance
    const { error: updateError } = await supabase
      .from("clients")
      .update({ credit_balance: newBalance })
      .eq("id", body.client_id);
    
    if (updateError) throw updateError;

    return jsonResponse({
      transaction,
      new_balance: newBalance,
      deducted: price,
    }, 201);
  }

  // POST /credits/add - Add purchased credits
  if (method === "POST" && action === "add") {
    const body = await req.json();
    
    if (!body.client_id || !body.amount) {
      return errorResponse("VALIDATION_ERROR", "client_id and amount are required", 400);
    }

    const amount = Math.abs(body.amount); // Ensure positive

    // Get current balance
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("credit_balance")
      .eq("id", body.client_id)
      .single();
    
    if (clientError) throw clientError;

    const newBalance = (client.credit_balance || 0) + amount;

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        client_id: body.client_id,
        amount: amount,
        type: "credit_purchase",
        description: body.note || "Credit purchase",
      })
      .select()
      .single();
    
    if (txError) throw txError;

    // Update client balance
    const { error: updateError } = await supabase
      .from("clients")
      .update({ credit_balance: newBalance })
      .eq("id", body.client_id);
    
    if (updateError) throw updateError;

    return jsonResponse({
      transaction,
      new_balance: newBalance,
      added: amount,
    }, 201);
  }

  // GET /credits/statement?client_id=...&from=...&to=...
  if (method === "GET" && action === "statement") {
    const clientId = params.get("client_id");
    if (!clientId) {
      return errorResponse("VALIDATION_ERROR", "client_id is required", 400);
    }

    let query = supabase
      .from("credit_transactions")
      .select("*")
      .eq("client_id", clientId);

    const from = params.get("from");
    if (from) {
      query = query.gte("created_at", from);
    }

    const to = params.get("to");
    if (to) {
      query = query.lte("created_at", to);
    }

    query = query.order("created_at", { ascending: false });

    const { data: transactions, error } = await query;
    if (error) throw error;

    // Get client info
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, credit_balance")
      .eq("id", clientId)
      .single();

    // Calculate totals
    const totalAdded = transactions
      ?.filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
    
    const totalDeducted = transactions
      ?.filter((t: any) => t.amount < 0)
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0) || 0;

    return jsonResponse({
      client: {
        id: client?.id,
        name: client?.name,
        current_balance: client?.credit_balance || 0,
      },
      period: {
        from: from || "all",
        to: to || "all",
      },
      summary: {
        total_added: totalAdded,
        total_deducted: totalDeducted,
        net_change: totalAdded - totalDeducted,
      },
      transactions: transactions || [],
    });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ CALENDAR EVENTS (Training Schedule) ============
async function handleCalendarEvents(supabase: any, method: string, id: string | undefined, url: URL, req: Request) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    let query = supabase.from("training_sessions").select(`
      id,
      date,
      duration,
      status,
      notes,
      participant_count,
      client_id,
      clients(id, name)
    `);
    
    const dateFrom = params.get("date_from");
    if (dateFrom) {
      query = query.gte("date", dateFrom);
    }
    
    const dateTo = params.get("date_to");
    if (dateTo) {
      query = query.lte("date", dateTo);
    }

    const clientId = params.get("client_id");
    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    query = query.order("date", { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;

    // Transform to calendar event format
    const events = (data || []).map((session: any) => ({
      id: session.id,
      title: session.clients?.name || "Training",
      start: session.date,
      end: new Date(new Date(session.date).getTime() + session.duration * 60000).toISOString(),
      status: session.status,
      client_id: session.client_id,
      client_name: session.clients?.name,
      duration_minutes: session.duration,
      participant_count: session.participant_count,
      notes: session.notes,
    }));

    return jsonResponse({ events });
  }

  if (method === "POST") {
    const body = await req.json();
    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        client_id: body.client_id,
        date: body.date || body.start,
        duration: body.duration_minutes || body.duration || 60,
        status: body.status || "scheduled",
        notes: body.notes || "",
        participant_count: body.participant_count || 1,
      })
      .select(`
        *,
        clients(id, name)
      `)
      .single();
    
    if (error) throw error;
    return jsonResponse({ event: data }, 201);
  }

  if (method === "PATCH" && id) {
    const body = await req.json();
    
    // Map calendar event fields to training session fields
    const updateData: any = {};
    if (body.date || body.start) updateData.date = body.date || body.start;
    if (body.duration_minutes || body.duration) updateData.duration = body.duration_minutes || body.duration;
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.client_id) updateData.client_id = body.client_id;
    if (body.participant_count) updateData.participant_count = body.participant_count;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("training_sessions")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        clients(id, name)
      `)
      .single();
    
    if (error) throw error;
    return jsonResponse({ event: data });
  }

  if (method === "DELETE" && id) {
    const { data, error } = await supabase
      .from("training_sessions")
      .update({ 
        status: "cancelled",
        canceled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ event: data, message: "Event cancelled" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
