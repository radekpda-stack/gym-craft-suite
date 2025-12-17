import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  portion_mode: z.enum(['grams', 'portion', 'units']),
  portion_size: z.enum(['small', 'medium', 'large']).optional(),
  grams: z.number().int().positive().max(10000).optional(),
  units_count: z.number().positive().max(100).optional(),
  units_label: z.string().max(50).optional(),
  note: z.string().max(500).optional(),
  photo_url: z.string().url().max(500).optional(),
});

const drinkEntrySchema = z.object({
  drink_type: z.enum(['water', 'tea', 'juice', 'soda', 'alcohol', 'other']),
  drink_name: z.string().max(100).optional(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format").optional(),
  amount_ml: z.number().int().positive().max(10000).optional(),
  amount_container_type: z.enum(['glass', 'mug', 'bottle', 'can']).optional(),
  amount_container_count: z.number().positive().max(100).optional(),
  note: z.string().max(500).optional(),
});

const coffeeEntrySchema = z.object({
  coffee_type: z.enum(['espresso', 'americano', 'latte', 'cappuccino', 'filter', 'instant', 'other']),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  entry_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format").optional(),
  count: z.number().int().positive().max(20).default(1),
  sugar: z.boolean().default(false),
  sugar_spoons: z.number().int().min(0).max(10).default(0),
  milk: z.enum(['none', 'regular', 'skim', 'oat', 'almond', 'soy']).optional(),
  note: z.string().max(500).optional(),
});

const requestSchema = z.object({
  token: z.string().uuid("Invalid token format"),
  type: z.enum(['food', 'drink', 'coffee']),
  entry: z.unknown(), // Will be validated based on type
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIP = getClientIP(req);
    if (isRateLimited(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate base request
    const rawBody = await req.json();
    const baseResult = requestSchema.safeParse(rawBody);
    
    if (!baseResult.success) {
      console.error("Base validation error:", baseResult.error.flatten());
      return new Response(JSON.stringify({ 
        error: 'Invalid request', 
        details: baseResult.error.flatten().fieldErrors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token, type, entry } = baseResult.data;

    // Validate entry based on type
    let validatedEntry: z.infer<typeof foodEntrySchema> | z.infer<typeof drinkEntrySchema> | z.infer<typeof coffeeEntrySchema>;
    
    switch (type) {
      case 'food': {
        const result = foodEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error("Food entry validation error:", result.error.flatten());
          return new Response(JSON.stringify({ 
            error: 'Invalid food entry', 
            details: result.error.flatten().fieldErrors 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        validatedEntry = result.data;
        break;
      }
      case 'drink': {
        const result = drinkEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error("Drink entry validation error:", result.error.flatten());
          return new Response(JSON.stringify({ 
            error: 'Invalid drink entry', 
            details: result.error.flatten().fieldErrors 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        validatedEntry = result.data;
        break;
      }
      case 'coffee': {
        const result = coffeeEntrySchema.safeParse(entry);
        if (!result.success) {
          console.error("Coffee entry validation error:", result.error.flatten());
          return new Response(JSON.stringify({ 
            error: 'Invalid coffee entry', 
            details: result.error.flatten().fieldErrors 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        validatedEntry = result.data;
        break;
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and get session
    const { data: session, error: sessionError } = await supabase
      .from('nutrition_log_sessions')
      .select('*')
      .eq('token', token)
      .single();

    if (sessionError || !session) {
      console.warn(`Invalid token attempt: ${token.substring(0, 8)}...`);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (session.status === 'completed') {
      return new Response(JSON.stringify({ error: 'Session completed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert validated entry based on type
    const tableName = type === 'food' 
      ? 'nutrition_food_entries' 
      : type === 'drink' 
        ? 'nutrition_drink_entries' 
        : 'nutrition_coffee_entries';

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
      console.error('Insert error:', error);
      return new Response(JSON.stringify({ error: 'Failed to save entry' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully saved ${type} entry for session ${session.id}`);

    return new Response(JSON.stringify({ success: true, entry: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
