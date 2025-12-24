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

// Validation schemas for each entry type
const foodEntrySchema = z.object({
  description: z.string().min(1, "Description required").max(500, "Description too long"),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format").optional(),
  meal_type: z.enum(['breakfast', 'snack_am', 'lunch', 'snack_pm', 'dinner', 'snack']).optional().nullable(),
  portion_mode: z.enum(['grams', 'portion', 'portion_size', 'units']),
  portion_size: z.enum(['small', 'medium', 'large']).optional().nullable(),
  portion_estimate: z.enum(['palm', 'fist', 'handful', 'thumb']).optional().nullable(),
  grams: z.number().int().positive().max(10000).optional().nullable(),
  units_count: z.number().positive().max(100).optional().nullable(),
  units_label: z.string().max(50).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  photo_url: z.string().url().max(500).optional().nullable(),
  food_item_id: z.string().uuid().optional().nullable(),
  quality: z.enum(['good', 'normal', 'poor']).optional().nullable(),
  satiation: z.enum(['just_right', 'still_hungry', 'overate']).optional().nullable(),
  feeling_after: z.enum(['ok', 'heavy', 'bloated', 'sweet', 'low_energy', 'high_energy']).optional().nullable(),
  energy_after: z.enum(['low', 'normal', 'high']).optional().nullable(),
});

const drinkEntrySchema = z.object({
  drink_type: z.enum([
    'water', 'mineral', 'sparkling', 'tea', 'juice', 'cola', 'soda', 
    'sports', 'alcohol', 'smoothie', 'milk', 'sugary', 'other'
  ]),
  drink_name: z.string().max(100).optional().nullable(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format").optional(),
  amount_ml: z.number().int().positive().max(10000).optional().nullable(),
  amount_container_type: z.enum(['small_glass', 'large_glass', 'glass', 'mug', 'bottle', 'can']).optional().nullable(),
  amount_container_count: z.number().positive().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  drink_item_id: z.string().uuid().optional().nullable(),
  amount: z.enum(['little', 'ok', 'lots']).optional().nullable(),
});

const coffeeEntrySchema = z.object({
  coffee_type: z.enum([
    'small_espresso', 'large_espresso', 'espresso', 'lungo', 'americano', 
    'latte', 'cappuccino', 'flat_white', 'filter', 'instant', 'decaf', 'energy', 'other'
  ]),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format").optional(),
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
  after_16: z.boolean().default(false),
});

const requestSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  type: z.enum(['food', 'drink', 'coffee']),
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
    console.log('Received request type:', rawBody?.type);
    
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

    const { token, type, entry } = baseResult.data;

    // Validate entry based on type
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

    // Insert validated entry based on type
    const tableName = type === 'food' 
      ? 'nutrition_food_entries' 
      : type === 'drink' 
        ? 'nutrition_drink_entries' 
        : 'nutrition_coffee_entries';

    // Remove food_item_id and drink_item_id from the insert if they exist (not in DB yet)
    const entryToInsert = { ...validatedEntry };
    delete (entryToInsert as any).food_item_id;
    delete (entryToInsert as any).drink_item_id;

    const { data, error } = await supabase
      .from(tableName)
      .insert({
        ...entryToInsert,
        session_id: session.id,
        client_id: session.client_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return await normalizeResponseTime(startTime, new Response(
        JSON.stringify({ error: 'Failed to save entry', code: 'SAVE_ERROR' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      ));
    }

    // For food entries, get AI calorie estimate asynchronously
    let calorieEstimate = null;
    if (type === 'food' && data) {
      try {
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        if (lovableApiKey) {
          const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-nutrition`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              analyzeType: 'single-food',
              foodEntry: {
                description: (validatedEntry as any).description,
                portion_size: (validatedEntry as any).portion_size,
                portion_estimate: (validatedEntry as any).portion_estimate,
                grams: (validatedEntry as any).grams,
                meal_type: (validatedEntry as any).meal_type,
              }
            }),
          });

          if (analyzeResponse.ok) {
            calorieEstimate = await analyzeResponse.json();
            
            // Update the entry with calorie estimates
            if (calorieEstimate?.calorie_estimate_low && calorieEstimate?.calorie_estimate_high) {
              await supabase
                .from('nutrition_food_entries')
                .update({
                  calorie_estimate_low: calorieEstimate.calorie_estimate_low,
                  calorie_estimate_high: calorieEstimate.calorie_estimate_high,
                })
                .eq('id', data.id);
              
              data.calorie_estimate_low = calorieEstimate.calorie_estimate_low;
              data.calorie_estimate_high = calorieEstimate.calorie_estimate_high;
            }
          }
        }
      } catch (aiError) {
        console.error('AI calorie estimate error (non-blocking):', aiError);
      }
    }

    console.log(`Successfully saved ${type} entry for session ${session.id}`);

    return await normalizeResponseTime(startTime, new Response(
      JSON.stringify({ success: true, entry: data, calorieEstimate }), 
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
