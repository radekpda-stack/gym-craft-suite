import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

// ============ VALIDATION SCHEMAS ============

// UUID validation helper
const uuidSchema = z.string().uuid("Invalid UUID format");

// Client schemas
const clientCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email format").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().nullable(),
  notes: z.string().trim().max(2000, "Notes must be less than 2000 characters").optional().or(z.literal("")),
  health_restrictions: z.string().trim().max(1000, "Health restrictions must be less than 1000 characters").optional().or(z.literal("")),
  training_goals: z.array(z.string().max(100)).max(20).optional().default([]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional().nullable(),
  credit_balance: z.number().min(-1000000).max(1000000).optional().default(0),
  is_favorite: z.boolean().optional().default(false),
});

const clientUpdateSchema = clientCreateSchema.partial().extend({
  is_archived: z.boolean().optional(),
});

// Workout/Training schemas
const workoutCreateSchema = z.object({
  client_id: uuidSchema,
  date: z.string().min(1, "Date is required"),
  duration: z.number().int().min(1).max(480).optional().default(60),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional().default("scheduled"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  participant_count: z.number().int().min(1).max(20).optional().default(1),
  subjective_rating: z.number().int().min(1).max(10).optional().nullable(),
});

const workoutUpdateSchema = workoutCreateSchema.partial();

// Workout entry schema
const workoutEntryCreateSchema = z.object({
  training_session_id: uuidSchema,
  exercise_id: uuidSchema.optional().nullable(),
  exercise_name: z.string().trim().min(1, "Exercise name is required").max(200),
  set_number: z.number().int().min(1).max(100).optional().default(1),
  weight_kg: z.number().min(0).max(1000).optional().nullable(),
  reps: z.number().int().min(0).max(1000).optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const workoutEntryUpdateSchema = workoutEntryCreateSchema.partial().omit({ training_session_id: true });

// Measurement schema
const measurementCreateSchema = z.object({
  client_id: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weight: z.number().min(0).max(500).optional().nullable(),
  body_fat_percentage: z.number().min(0).max(100).optional().nullable(),
  body_fat_percent: z.number().min(0).max(100).optional().nullable(), // Alias
  muscle_mass: z.number().min(0).max(300).optional().nullable(),
  muscle_mass_kg: z.number().min(0).max(300).optional().nullable(), // Alias
  basal_metabolism: z.number().int().min(0).max(10000).optional().nullable(),
  bmr_kcal: z.number().int().min(0).max(10000).optional().nullable(), // Alias
  chest: z.number().min(0).max(300).optional().nullable(),
  waist: z.number().min(0).max(300).optional().nullable(),
  hips: z.number().min(0).max(300).optional().nullable(),
  bicep_left: z.number().min(0).max(100).optional().nullable(),
  bicep_right: z.number().min(0).max(100).optional().nullable(),
  thigh_left: z.number().min(0).max(150).optional().nullable(),
  thigh_right: z.number().min(0).max(150).optional().nullable(),
  calf_left: z.number().min(0).max(100).optional().nullable(),
  calf_right: z.number().min(0).max(100).optional().nullable(),
  mental_state: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const measurementUpdateSchema = measurementCreateSchema.partial().omit({ client_id: true });

// Diagnostic schema
const diagnosticCreateSchema = z.object({
  client_id: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  area_type: z.string().trim().min(1, "Area type is required").max(50),
  area_name: z.string().trim().min(1, "Area name is required").max(100),
  findings: z.string().trim().min(1, "Findings are required").max(5000),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const diagnosticUpdateSchema = diagnosticCreateSchema.partial().omit({ client_id: true });

// Credit schemas
const creditConsumeSchema = z.object({
  client_id: uuidSchema,
  session_type: z.enum(["1", "2", "3+", "first", "diagnostic"]).optional(),
  price: z.number().min(0).max(100000).optional(),
  training_session_id: uuidSchema.optional().nullable(),
  note: z.string().trim().max(500).optional(),
});

const creditAddSchema = z.object({
  client_id: uuidSchema,
  amount: z.number().min(1, "Amount must be at least 1").max(1000000),
  note: z.string().trim().max(500).optional(),
});

// Calendar event schema
const calendarEventCreateSchema = z.object({
  client_id: uuidSchema,
  date: z.string().optional(),
  start: z.string().optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  duration: z.number().int().min(1).max(480).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional().default("scheduled"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  participant_count: z.number().int().min(1).max(20).optional().default(1),
}).refine(data => data.date || data.start, {
  message: "Either 'date' or 'start' is required",
});

const calendarEventUpdateSchema = z.object({
  client_id: uuidSchema.optional(),
  date: z.string().optional(),
  start: z.string().optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  duration: z.number().int().min(1).max(480).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  participant_count: z.number().int().min(1).max(20).optional(),
});

// ============ HELPERS ============

// Error response helper
function errorResponse(code: string, message: string, status: number, details?: object) {
  return new Response(
    JSON.stringify({ error: { code, message, details } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Validation error response - sanitized to only expose field names
function validationErrorResponse(error: z.ZodError) {
  // Only expose field names, not validation rules or expected values
  const fields = [...new Set(error.issues.map(issue => issue.path[0]?.toString() || 'unknown'))];
  return errorResponse("VALIDATION_ERROR", "Invalid input provided", 400, { fields });
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

// Extract and validate user ID from request headers
function getUserId(req: Request): { userId?: string; error?: Response } {
  const userId = req.headers.get("x-user-id");
  
  if (!userId) {
    return { 
      error: errorResponse(
        "UNAUTHORIZED", 
        "Missing x-user-id header. All API requests must include a valid user ID.", 
        401
      ) 
    };
  }
  
  const result = uuidSchema.safeParse(userId);
  if (!result.success) {
    return { 
      error: errorResponse(
        "VALIDATION_ERROR", 
        "Invalid x-user-id format. Must be a valid UUID.", 
        400
      ) 
    };
  }
  
  return { userId };
}

// Validate that a resource belongs to the authenticated user
async function validateOwnership(
  supabase: any, 
  table: string, 
  resourceId: string, 
  userId: string,
  userIdColumn: string = "user_id"
): Promise<{ valid: boolean; error?: Response }> {
  const { data, error } = await supabase
    .from(table)
    .select(userIdColumn)
    .eq("id", resourceId)
    .maybeSingle();
  
  if (error) {
    console.error(`[API v1] Ownership check error for ${table}:`, error);
    return { valid: false, error: errorResponse("INTERNAL_ERROR", "Failed to validate ownership", 500) };
  }
  
  if (!data) {
    return { valid: false, error: errorResponse("NOT_FOUND", `${table} resource not found`, 404) };
  }
  
  if (data[userIdColumn] !== userId) {
    console.warn(`[API v1] Unauthorized access attempt: user ${userId} tried to access ${table}/${resourceId} owned by ${data[userIdColumn]}`);
    return { valid: false, error: errorResponse("FORBIDDEN", "You do not have permission to access this resource", 403) };
  }
  
  return { valid: true };
}

// Parse URL path segments
function parsePath(url: URL): { resource: string; id?: string; action?: string } {
  const pathParts = url.pathname.replace("/api-v1", "").split("/").filter(Boolean);
  return {
    resource: pathParts[0] || "",
    id: pathParts[1],
    action: pathParts[2],
  };
}

// Safe JSON parse with validation
async function parseAndValidate<T>(req: Request, schema: z.ZodSchema<T>): Promise<{ data?: T; error?: Response }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return { error: validationErrorResponse(result.error) };
    }
    return { data: result.data };
  } catch (e) {
    return { error: errorResponse("PARSE_ERROR", "Invalid JSON body", 400) };
  }
}

// ============ MAIN HANDLER ============

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

  // Health check - no auth required
  if (resource === "health") {
    return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
  }

  // API key validation for ALL requests (except health check)
  if (!validateApiKey(req)) {
    return errorResponse("UNAUTHORIZED", "Invalid or missing API key", 401);
  }

  // User ID validation - required for all authenticated requests
  const { userId, error: userIdError } = getUserId(req);
  if (userIdError) {
    return userIdError;
  }

  console.log(`[API v1] Authenticated request for user: ${userId}`);

  try {
    switch (resource) {
      case "clients":
        return await handleClients(supabase, method, id, url, req, userId!);
      case "workouts":
        return await handleWorkouts(supabase, method, id, url, req, userId!);
      case "workout-entries":
        return await handleWorkoutEntries(supabase, method, id, req, userId!);
      case "measurements":
        return await handleMeasurements(supabase, method, id, url, req, userId!);
      case "diagnostics":
        return await handleDiagnostics(supabase, method, id, url, req, userId!);
      case "credits":
        return await handleCredits(supabase, method, id, action, url, req, userId!);
      case "calendar-events":
        return await handleCalendarEvents(supabase, method, id, url, req, userId!);
      default:
        return errorResponse("NOT_FOUND", `Resource '${resource}' not found`, 404);
    }
  } catch (error: unknown) {
    console.error("[API v1] Error:", error);
    // Never expose internal error messages to clients
    return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
  }
});

// ============ CLIENTS ============
async function handleClients(supabase: any, method: string, id: string | undefined, url: URL, req: Request, userId: string) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    // List clients - filtered by user_id
    let query = supabase.from("clients").select("*").eq("user_id", userId);
    
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
    // Validate UUID format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid client ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", id, userId);
    if (!valid) return ownershipError!;

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) throw error;
    if (!client) return errorResponse("NOT_FOUND", "Client not found", 404);

    const { data: lastTraining } = await supabase
      .from("training_sessions")
      .select("id, date, status")
      .eq("client_id", id)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastMeasurement } = await supabase
      .from("measurements")
      .select("id, date, weight, body_fat_percentage")
      .eq("client_id", id)
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: trainingCount } = await supabase
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("client_id", id)
      .eq("user_id", userId)
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
    const { data: body, error: validationError } = await parseAndValidate(req, clientCreateSchema);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: body!.name,
        email: body!.email || "",
        phone: body!.phone || null,
        notes: body!.notes || "",
        health_restrictions: body!.health_restrictions || "",
        training_goals: body!.training_goals || [],
        birth_date: body!.birth_date || null,
        credit_balance: body!.credit_balance || 0,
        is_favorite: body!.is_favorite || false,
        is_archived: false,
        user_id: userId, // Associate with authenticated user
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ client: data }, 201);
  }

  if (method === "PATCH" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid client ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", id, userId);
    if (!valid) return ownershipError!;

    const { data: body, error: validationError } = await parseAndValidate(req, clientUpdateSchema);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from("clients")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ client: data });
  }

  if (method === "DELETE" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid client ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("clients")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ client: data, message: "Client archived successfully" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ WORKOUTS (Training Sessions) ============
async function handleWorkouts(supabase: any, method: string, id: string | undefined, url: URL, req: Request, userId: string) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    let query = supabase.from("training_sessions").select(`
      *,
      clients!inner(id, name)
    `).eq("user_id", userId);
    
    const clientId = params.get("client_id");
    if (clientId) {
      const idResult = uuidSchema.safeParse(clientId);
      if (!idResult.success) {
        return errorResponse("VALIDATION_ERROR", "Invalid client_id format", 400);
      }
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
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid workout ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "training_sessions", id, userId);
    if (!valid) return ownershipError!;

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
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) throw error;
    if (!workout) return errorResponse("NOT_FOUND", "Workout not found", 404);

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
    const { data: body, error: validationError } = await parseAndValidate(req, workoutCreateSchema);
    if (validationError) return validationError;

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", body!.client_id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        client_id: body!.client_id,
        date: body!.date,
        duration: body!.duration || 60,
        status: body!.status || "scheduled",
        notes: body!.notes || "",
        participant_count: body!.participant_count || 1,
        subjective_rating: body!.subjective_rating || null,
        user_id: userId, // Associate with authenticated user
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ workout: data }, 201);
  }

  if (method === "PATCH" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid workout ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "training_sessions", id, userId);
    if (!valid) return ownershipError!;

    const { data: body, error: validationError } = await parseAndValidate(req, workoutUpdateSchema);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from("training_sessions")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ workout: data });
  }

  if (method === "DELETE" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid workout ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "training_sessions", id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("training_sessions")
      .update({ 
        status: "cancelled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ workout: data, message: "Workout cancelled" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ WORKOUT ENTRIES (Exercise Sets) ============
async function handleWorkoutEntries(supabase: any, method: string, id: string | undefined, req: Request, userId: string) {
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
    const { data: body, error: validationError } = await parseAndValidate(req, workoutEntryCreateSchema);
    if (validationError) return validationError;

    // Validate that the training session belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "training_sessions", body!.training_session_id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("workout_entries")
      .insert({
        training_session_id: body!.training_session_id,
        exercise_id: body!.exercise_id,
        exercise_name: body!.exercise_name,
        set_number: body!.set_number || 1,
        weight_kg: body!.weight_kg,
        reps: body!.reps,
        rpe: body!.rpe,
        notes: body!.notes || "",
        user_id: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ entry: data }, 201);
  }

  if (method === "PATCH" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid entry ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "workout_entries", id, userId);
    if (!valid) return ownershipError!;

    const { data: body, error: validationError } = await parseAndValidate(req, workoutEntryUpdateSchema);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from("workout_entries")
      .update(body)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ entry: data });
  }

  if (method === "DELETE" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid entry ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "workout_entries", id, userId);
    if (!valid) return ownershipError!;

    const { error } = await supabase
      .from("workout_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    
    if (error) throw error;
    return jsonResponse({ message: "Entry deleted" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ MEASUREMENTS ============
async function handleMeasurements(supabase: any, method: string, id: string | undefined, url: URL, req: Request, userId: string) {
  const params = url.searchParams;

  if (method === "GET") {
    let query = supabase.from("measurements").select(`
      *,
      clients(id, name)
    `).eq("user_id", userId);
    
    const clientId = params.get("client_id");
    if (clientId) {
      const idResult = uuidSchema.safeParse(clientId);
      if (!idResult.success) {
        return errorResponse("VALIDATION_ERROR", "Invalid client_id format", 400);
      }
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

    query = query.order("date", { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;

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
    const { data: body, error: validationError } = await parseAndValidate(req, measurementCreateSchema);
    if (validationError) return validationError;

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", body!.client_id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("measurements")
      .insert({
        client_id: body!.client_id,
        date: body!.date || new Date().toISOString().split("T")[0],
        weight: body!.weight,
        body_fat_percentage: body!.body_fat_percentage || body!.body_fat_percent,
        muscle_mass: body!.muscle_mass || body!.muscle_mass_kg,
        basal_metabolism: body!.basal_metabolism || body!.bmr_kcal,
        chest: body!.chest,
        waist: body!.waist,
        hips: body!.hips,
        bicep_left: body!.bicep_left,
        bicep_right: body!.bicep_right,
        thigh_left: body!.thigh_left,
        thigh_right: body!.thigh_right,
        calf_left: body!.calf_left,
        calf_right: body!.calf_right,
        mental_state: body!.mental_state,
        notes: body!.notes || "",
        user_id: userId, // Associate with authenticated user
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ measurement: data }, 201);
  }

  if (method === "PATCH" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid measurement ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "measurements", id, userId);
    if (!valid) return ownershipError!;

    const { data: body, error: validationError } = await parseAndValidate(req, measurementUpdateSchema);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from("measurements")
      .update(body)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ measurement: data });
  }

  if (method === "DELETE" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid measurement ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "measurements", id, userId);
    if (!valid) return ownershipError!;

    const { error } = await supabase
      .from("measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    
    if (error) throw error;
    return jsonResponse({ message: "Measurement deleted" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ DIAGNOSTICS ============
async function handleDiagnostics(supabase: any, method: string, id: string | undefined, url: URL, req: Request, userId: string) {
  const params = url.searchParams;

  if (method === "GET" && !id) {
    let query = supabase.from("diagnostics").select(`
      *,
      clients(id, name)
    `).eq("user_id", userId);
    
    const clientId = params.get("client_id");
    if (clientId) {
      const idResult = uuidSchema.safeParse(clientId);
      if (!idResult.success) {
        return errorResponse("VALIDATION_ERROR", "Invalid client_id format", 400);
      }
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
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid diagnostic ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "diagnostics", id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("diagnostics")
      .select(`
        *,
        clients(id, name),
        client_media(id, file_url, type, description, date)
      `)
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) return errorResponse("NOT_FOUND", "Diagnostic not found", 404);
    return jsonResponse({ diagnostic: data });
  }

  if (method === "POST") {
    const { data: body, error: validationError } = await parseAndValidate(req, diagnosticCreateSchema);
    if (validationError) return validationError;

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", body!.client_id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("diagnostics")
      .insert({
        client_id: body!.client_id,
        date: body!.date || new Date().toISOString().split("T")[0],
        area_type: body!.area_type,
        area_name: body!.area_name,
        findings: body!.findings,
        notes: body!.notes || "",
        user_id: userId, // Associate with authenticated user
      })
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ diagnostic: data }, 201);
  }

  if (method === "PATCH" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid diagnostic ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "diagnostics", id, userId);
    if (!valid) return ownershipError!;

    const { data: body, error: validationError } = await parseAndValidate(req, diagnosticUpdateSchema);
    if (validationError) return validationError;

    const { data, error } = await supabase
      .from("diagnostics")
      .update(body)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ diagnostic: data });
  }

  if (method === "DELETE" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid diagnostic ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "diagnostics", id, userId);
    if (!valid) return ownershipError!;

    const { error } = await supabase
      .from("diagnostics")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    
    if (error) throw error;
    return jsonResponse({ message: "Diagnostic deleted" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}

// ============ CREDITS ============
async function handleCredits(supabase: any, method: string, id: string | undefined, action: string | undefined, url: URL, req: Request, userId: string) {
  const params = url.searchParams;

  // GET /credits?client_id=...
  if (method === "GET" && !action) {
    const clientId = params.get("client_id");
    if (!clientId) {
      return errorResponse("VALIDATION_ERROR", "client_id is required", 400);
    }

    const idResult = uuidSchema.safeParse(clientId);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid client_id format", 400);
    }

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", clientId, userId);
    if (!valid) return ownershipError!;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, credit_balance")
      .eq("id", clientId)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (clientError) throw clientError;
    if (!client) return errorResponse("NOT_FOUND", "Client not found", 404);

    const { data: transactions, error: txError } = await supabase
      .from("credit_transactions")
      .select(`
        *,
        products(id, name, price),
        training_sessions(id, date, participant_count)
      `)
      .eq("client_id", clientId)
      .eq("user_id", userId)
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
    const { data: body, error: validationError } = await parseAndValidate(req, creditConsumeSchema);
    if (validationError) return validationError;

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", body!.client_id, userId);
    if (!valid) return ownershipError!;

    const priceMap: Record<string, number> = {
      "1": 800,
      "2": 1000,
      "3+": 1200,
      "first": 1000,
      "diagnostic": 500,
    };
    
    const sessionType = body!.session_type || "1";
    const price = body!.price || priceMap[sessionType] || 800;

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("credit_balance")
      .eq("id", body!.client_id)
      .eq("user_id", userId)
      .single();
    
    if (clientError) throw clientError;

    const newBalance = (client.credit_balance || 0) - price;

    const { data: transaction, error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        client_id: body!.client_id,
        amount: -price,
        type: "training_deduction",
        description: body!.note || `Training session (${sessionType})`,
        training_session_id: body!.training_session_id || null,
        user_id: userId,
      })
      .select()
      .single();
    
    if (txError) throw txError;

    const { error: updateError } = await supabase
      .from("clients")
      .update({ credit_balance: newBalance })
      .eq("id", body!.client_id)
      .eq("user_id", userId);
    
    if (updateError) throw updateError;

    return jsonResponse({
      transaction,
      new_balance: newBalance,
      deducted: price,
    }, 201);
  }

  // POST /credits/add - Add purchased credits
  if (method === "POST" && action === "add") {
    const { data: body, error: validationError } = await parseAndValidate(req, creditAddSchema);
    if (validationError) return validationError;

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", body!.client_id, userId);
    if (!valid) return ownershipError!;

    const amount = Math.abs(body!.amount);

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("credit_balance")
      .eq("id", body!.client_id)
      .eq("user_id", userId)
      .single();
    
    if (clientError) throw clientError;

    const newBalance = (client.credit_balance || 0) + amount;

    const { data: transaction, error: txError } = await supabase
      .from("credit_transactions")
      .insert({
        client_id: body!.client_id,
        amount: amount,
        type: "credit_purchase",
        description: body!.note || "Credit purchase",
        user_id: userId,
      })
      .select()
      .single();
    
    if (txError) throw txError;

    const { error: updateError } = await supabase
      .from("clients")
      .update({ credit_balance: newBalance })
      .eq("id", body!.client_id)
      .eq("user_id", userId);
    
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

    const idResult = uuidSchema.safeParse(clientId);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid client_id format", 400);
    }

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", clientId, userId);
    if (!valid) return ownershipError!;

    let query = supabase
      .from("credit_transactions")
      .select("*")
      .eq("client_id", clientId)
      .eq("user_id", userId);

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

    const { data: client } = await supabase
      .from("clients")
      .select("id, name, credit_balance")
      .eq("id", clientId)
      .eq("user_id", userId)
      .single();

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
async function handleCalendarEvents(supabase: any, method: string, id: string | undefined, url: URL, req: Request, userId: string) {
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
    `).eq("user_id", userId);
    
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
      const idResult = uuidSchema.safeParse(clientId);
      if (!idResult.success) {
        return errorResponse("VALIDATION_ERROR", "Invalid client_id format", 400);
      }
      query = query.eq("client_id", clientId);
    }

    query = query.order("date", { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;

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
    const { data: body, error: validationError } = await parseAndValidate(req, calendarEventCreateSchema);
    if (validationError) return validationError;

    // Validate that the client belongs to this user
    const { valid, error: ownershipError } = await validateOwnership(supabase, "clients", body!.client_id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("training_sessions")
      .insert({
        client_id: body!.client_id,
        date: body!.date || body!.start,
        duration: body!.duration_minutes || body!.duration || 60,
        status: body!.status || "scheduled",
        notes: body!.notes || "",
        participant_count: body!.participant_count || 1,
        user_id: userId, // Associate with authenticated user
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
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid event ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "training_sessions", id, userId);
    if (!valid) return ownershipError!;

    const { data: body, error: validationError } = await parseAndValidate(req, calendarEventUpdateSchema);
    if (validationError) return validationError;

    const updateData: any = {};
    if (body!.date || body!.start) updateData.date = body!.date || body!.start;
    if (body!.duration_minutes || body!.duration) updateData.duration = body!.duration_minutes || body!.duration;
    if (body!.status) updateData.status = body!.status;
    if (body!.notes !== undefined) updateData.notes = body!.notes;
    if (body!.client_id) updateData.client_id = body!.client_id;
    if (body!.participant_count) updateData.participant_count = body!.participant_count;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("training_sessions")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)
      .select(`
        *,
        clients(id, name)
      `)
      .single();
    
    if (error) throw error;
    return jsonResponse({ event: data });
  }

  if (method === "DELETE" && id) {
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid event ID format", 400);
    }

    // Validate ownership
    const { valid, error: ownershipError } = await validateOwnership(supabase, "training_sessions", id, userId);
    if (!valid) return ownershipError!;

    const { data, error } = await supabase
      .from("training_sessions")
      .update({ 
        status: "cancelled",
        canceled_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse({ event: data, message: "Event cancelled" });
  }

  return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405);
}
