import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize response time to prevent timing attacks
const MIN_RESPONSE_TIME_MS = 150;

async function normalizeResponseTime<T>(startTime: number, response: T): Promise<T> {
  const elapsed = Date.now() - startTime;
  if (elapsed < MIN_RESPONSE_TIME_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_RESPONSE_TIME_MS - elapsed));
  }
  return response;
}

// Sanitize validation errors - only return field names, not schema details
function sanitizeValidationErrors(error: z.ZodError): string[] {
  return [...new Set(error.issues.map(issue => issue.path[0]?.toString() || 'unknown'))];
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // Max requests per window

function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("cf-connecting-ip") || 
         "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  
  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// Time format validation: HH:MM (always 2 digits)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Validation schemas for each entry type - SIMPLIFIED for public form
const foodEntrySchema = z.object({
  description: z.string().min(1, "Description required").max(500, "Description too long"),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(timeRegex, "Time must be HH:MM format").optional(),
  // Simplified to 4 types only
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional().nullable(),
  portion_mode: z.enum(['grams', 'portion', 'portion_size', 'units']),
  portion_size: z.enum(['small', 'medium', 'large']).optional().nullable(),
  portion_estimate: z.enum(['palm', 'fist', 'handful', 'thumb']).optional().nullable(),
  grams: z.number().int().positive().max(10000).optional().nullable(),
  units_count: z.number().positive().max(100).optional().nullable(),
  units_label: z.string().max(50).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  photo_url: z.string().url().max(500).optional().nullable(),
  quality: z.enum(['good', 'normal', 'poor']).optional().nullable(),
  satiation: z.enum(['just_right', 'still_hungry', 'overate']).optional().nullable(),
  feeling_after: z.enum(['ok', 'heavy', 'bloated', 'sweet', 'low_energy', 'high_energy']).optional().nullable(),
  energy_after: z.enum(['low', 'normal', 'high']).optional().nullable(),
  client_request_id: z.string().uuid().optional(),
});

const drinkEntrySchema = z.object({
  // Simplified to 4 types for public form
  drink_type: z.enum(['water', 'sugary', 'sports', 'alcohol']),
  drink_name: z.string().max(100).optional().nullable(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(timeRegex, "Time must be HH:MM format").optional(),
  amount_ml: z.number().int().positive().max(10000).optional().nullable(),
  amount_container_type: z.enum(['small_glass', 'large_glass', 'glass', 'mug', 'bottle', 'can']).optional().nullable(),
  amount_container_count: z.number().positive().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  client_request_id: z.string().uuid().optional(),
});

const coffeeEntrySchema = z.object({
  coffee_type: z.enum(['espresso', 'cappuccino', 'energy', 'other']),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(timeRegex, "Time must be HH:MM format").optional(),
  count: z.number().int().positive().max(20).default(1),
  sugar: z.boolean().default(false),
  sugar_spoons: z.number().int().min(0).max(10).default(0),
  milk: z.enum([
    'none', 'little', 'normal', 'much',
    'cow', 'oat', 'almond', 'soy', 'coconut',
    'regular', 'skim'
  ]).optional().nullable(),
  milk_type: z.enum(['cow', 'oat', 'almond', 'soy', 'coconut']).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  client_request_id: z.string().uuid().optional(),
});

const requestSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  type: z.enum(['food', 'drink', 'coffee']),
  action: z.enum(['create', 'update', 'delete']).default('create'),
  entry_id: z.string().uuid().optional(), // Required for update/delete
  entry: z.unknown(),
});

serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }), 
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    // Parse and validate base request
    const rawBody = await req.json();
    console.log('Received request:', { type: rawBody?.type, action: rawBody?.action });
    
    const baseResult = requestSchema.safeParse(rawBody);
    
    if (!baseResult.success) {
      console.error("Base validation error:", baseResult.error.flatten());
      const invalidFields = sanitizeValidationErrors(baseResult.error);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ 
          error: 'Invalid request', 
          code: 'VALIDATION_ERROR',
          fields: invalidFields
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    const { token, type, action, entry_id, entry } = baseResult.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Verifying token: ${token.substring(0, 8)}...`);

    // Verify token and get session
    const { data: session, error: sessionError } = await supabase
      .from('nutrition_log_sessions')
      .select('*')
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      console.warn(`Invalid token attempt: ${token.substring(0, 8)}...`);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Invalid token', code: 'NOT_FOUND' }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    if (session.status === 'completed') {
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Session completed', code: 'SESSION_COMPLETED' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    const tableName = type === 'food' 
      ? 'nutrition_food_entries' 
      : type === 'drink' 
        ? 'nutrition_drink_entries' 
        : 'nutrition_coffee_entries';

    // Handle DELETE action
    if (action === 'delete') {
      if (!entry_id) {
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ error: 'entry_id required for delete', code: 'VALIDATION_ERROR' }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }

      // Verify entry belongs to this session
      const { data: existing, error: findError } = await supabase
        .from(tableName)
        .select('id, session_id')
        .eq('id', entry_id)
        .eq('session_id', session.id)
        .single();

      if (findError || !existing) {
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ error: 'Entry not found', code: 'NOT_FOUND' }), 
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', entry_id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ error: 'Failed to delete entry', code: 'DELETE_ERROR' }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }

      console.log(`Deleted ${type} entry ${entry_id} from session ${session.id}`);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ success: true, deleted: true }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    // Validate entry based on type (for create/update)
    let validatedEntry: z.infer<typeof foodEntrySchema> | z.infer<typeof drinkEntrySchema> | z.infer<typeof coffeeEntrySchema>;
    
    switch (type) {
      case 'food': {
        const result = foodEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error("Food entry validation error:", result.error.flatten());
          const invalidFields = sanitizeValidationErrors(result.error);
          return await normalizeResponseTime(startTime, new Response(
            JSON.stringify({ 
              error: 'Invalid food entry', 
              code: 'VALIDATION_ERROR',
              fields: invalidFields
            }), 
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          ));
        }
        validatedEntry = result.data;
        break;
      }
      case 'drink': {
        const result = drinkEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error("Drink entry validation error:", result.error.flatten());
          const invalidFields = sanitizeValidationErrors(result.error);
          return await normalizeResponseTime(startTime, new Response(
            JSON.stringify({ 
              error: 'Invalid drink entry', 
              code: 'VALIDATION_ERROR',
              fields: invalidFields
            }), 
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          ));
        }
        validatedEntry = result.data;
        break;
      }
      case 'coffee': {
        const result = coffeeEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error("Coffee entry validation error:", result.error.flatten());
          const invalidFields = sanitizeValidationErrors(result.error);
          return await normalizeResponseTime(startTime, new Response(
            JSON.stringify({ 
              error: 'Invalid coffee entry', 
              code: 'VALIDATION_ERROR',
              fields: invalidFields
            }), 
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          ));
        }
        validatedEntry = result.data;
        break;
      }
    }

    // Handle UPDATE action
    if (action === 'update') {
      if (!entry_id) {
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ error: 'entry_id required for update', code: 'VALIDATION_ERROR' }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }

      // Verify entry belongs to this session
      const { data: existing, error: findError } = await supabase
        .from(tableName)
        .select('id, session_id')
        .eq('id', entry_id)
        .eq('session_id', session.id)
        .single();

      if (findError || !existing) {
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ error: 'Entry not found', code: 'NOT_FOUND' }), 
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(validatedEntry)
        .eq('id', entry_id)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ error: 'Failed to update entry', code: 'UPDATE_ERROR' }), 
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }

      console.log(`Updated ${type} entry ${entry_id} in session ${session.id}`);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ success: true, entry: data, updated: true }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    // Handle CREATE action (default)
    const clientRequestId = (validatedEntry as any).client_request_id;
    
    // Check for idempotency - if client_request_id exists, check for duplicate
    if (clientRequestId) {
      const { data: existingEntry } = await supabase
        .from(tableName)
        .select('*')
        .eq('session_id', session.id)
        .eq('client_request_id', clientRequestId)
        .maybeSingle();

      if (existingEntry) {
        console.log(`Duplicate request detected, returning existing entry ${existingEntry.id}`);
        return await normalizeResponseTime(startTime, new Response(
          JSON.stringify({ success: true, entry: existingEntry, duplicate: true }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        ));
      }
    }

    const { data, error } = await supabase
      .from(tableName)
      .insert({
        ...validatedEntry,
        session_id: session.id,
        client_id: session.client_id,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a unique constraint violation (idempotency)
      if (error.code === '23505' && clientRequestId) {
        // Race condition - entry was created by another request
        const { data: existingEntry } = await supabase
          .from(tableName)
          .select('*')
          .eq('session_id', session.id)
          .eq('client_request_id', clientRequestId)
          .single();

        if (existingEntry) {
          return await normalizeResponseTime(startTime, new Response(
            JSON.stringify({ success: true, entry: existingEntry, duplicate: true }), 
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          ));
        }
      }

      console.error('Insert error:', error);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Failed to save entry', code: 'SAVE_ERROR' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    console.log(`Created ${type} entry ${data.id} for session ${session.id}`);

    return await normalizeResponseTime(startTime, new Response(
      JSON.stringify({ success: true, entry: data }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    ));

  } catch (error) {
    console.error('Error:', error);
    return await normalizeResponseTime(Date.now(), new Response(
      JSON.stringify({ error: 'Unable to save entry', code: 'INTERNAL_ERROR' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    ));
  }
});
