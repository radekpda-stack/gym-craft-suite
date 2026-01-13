import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GuestRegistration {
  challenge_id: string;
  first_name: string;
  last_name: string;
  sex?: 'male' | 'female';
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  email?: string;
}

interface SubmitResult {
  challenge_id: string;
  participant_token: string;
  metrics_data: Record<string, number>;
  photo_urls?: string[];
}

interface Reaction {
  result_id: string;
  reaction_type: 'like' | '💪' | '🔥' | '👏' | '🤯' | '😄';
  visitor_token: string;
}

interface ChatMessage {
  challenge_id: string;
  participant_token?: string;
  message: string;
}

// Rate limiting map (in-memory, resets on function restart)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const limit = rateLimits.get(key);
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

function hashToken(token: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 16));
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method === 'POST' ? await req.json() : {};

    // GET: Fetch public challenge by slug
    if (req.method === 'GET' && action === 'get_challenge') {
      const slug = url.searchParams.get('slug');
      if (!slug) {
        return new Response(
          JSON.stringify({ error: 'Missing slug parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: challenge, error } = await supabaseAdmin
        .from('vw_public_challenge')
        .select('*')
        .eq('public_slug', slug)
        .single();

      if (error || !challenge) {
        return new Response(
          JSON.stringify({ error: 'Challenge not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(challenge),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: Fetch leaderboard
    if (req.method === 'GET' && action === 'get_leaderboard') {
      const challengeId = url.searchParams.get('challenge_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '50'), 100);
      const sexFilter = url.searchParams.get('sex');
      
      if (!challengeId) {
        return new Response(
          JSON.stringify({ error: 'Missing challenge_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabaseAdmin
        .from('vw_public_leaderboard')
        .select('*', { count: 'exact' })
        .eq('challenge_id', challengeId)
        .order('submitted_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (sexFilter && ['male', 'female'].includes(sexFilter)) {
        query = query.eq('sex', sexFilter);
      }

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data, total: count, page, pageSize }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: Fetch stats
    if (req.method === 'GET' && action === 'get_stats') {
      const challengeId = url.searchParams.get('challenge_id');
      
      if (!challengeId) {
        return new Response(
          JSON.stringify({ error: 'Missing challenge_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseAdmin.rpc('get_public_challenge_stats', {
        p_challenge_id: challengeId
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: Fetch chat messages
    if (req.method === 'GET' && action === 'get_chat') {
      const challengeId = url.searchParams.get('challenge_id');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      
      if (!challengeId) {
        return new Response(
          JSON.stringify({ error: 'Missing challenge_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from('vw_public_chat')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data?.reverse() || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Register guest
    if (action === 'register_guest') {
      const registration = body as GuestRegistration;
      
      // Validate required fields
      if (!registration.challenge_id || !registration.first_name || !registration.last_name) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate name lengths
      if (registration.first_name.length > 50 || registration.last_name.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Name too long' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check challenge exists and is public
      const { data: challenge } = await supabaseAdmin
        .from('challenges')
        .select('id, is_public, status, end_at')
        .eq('id', registration.challenge_id)
        .eq('is_public', true)
        .single();

      if (!challenge) {
        return new Response(
          JSON.stringify({ error: 'Challenge not found or not public' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(challenge.end_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Challenge has ended' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate token
      const participantToken = generateToken();
      const tokenHash = hashToken(participantToken);

      // Create guest profile
      const { data: profile, error } = await supabaseAdmin
        .from('challenge_guest_profiles')
        .insert({
          challenge_id: registration.challenge_id,
          first_name: registration.first_name.trim(),
          last_name: registration.last_name.trim(),
          sex: registration.sex,
          age: registration.age,
          weight_kg: registration.weight_kg,
          height_cm: registration.height_cm,
          email: registration.email?.toLowerCase().trim(),
          participant_token_hash: tokenHash,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Guest registration error:', error);
        return new Response(
          JSON.stringify({ error: 'Registration failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          participant_token: participantToken,
          guest_profile_id: profile.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Submit result (guest)
    if (action === 'submit_result') {
      const submission = body as SubmitResult;
      
      if (!submission.challenge_id || !submission.participant_token || !submission.metrics_data) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = hashToken(submission.participant_token);

      // Verify guest profile
      const { data: guestProfile } = await supabaseAdmin
        .from('challenge_guest_profiles')
        .select('id, challenge_id')
        .eq('participant_token_hash', tokenHash)
        .eq('challenge_id', submission.challenge_id)
        .single();

      if (!guestProfile) {
        return new Response(
          JSON.stringify({ error: 'Invalid participant token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get challenge config for validation
      const { data: challenge } = await supabaseAdmin
        .from('challenges')
        .select('id, is_public, require_photo_proof, metrics_config, end_at')
        .eq('id', submission.challenge_id)
        .single();

      if (!challenge || !challenge.is_public) {
        return new Response(
          JSON.stringify({ error: 'Challenge not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (new Date(challenge.end_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Challenge has ended' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate photo proof requirement
      if (challenge.require_photo_proof && (!submission.photo_urls || submission.photo_urls.length === 0)) {
        return new Response(
          JSON.stringify({ error: 'Photo proof is required for this challenge' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate metrics against config
      const metricsConfig = challenge.metrics_config as Array<{
        key: string;
        required: boolean;
        min?: number;
        max?: number;
        type: string;
      }> || [];

      for (const metric of metricsConfig) {
        if (metric.required && submission.metrics_data[metric.key] === undefined) {
          return new Response(
            JSON.stringify({ error: `Missing required metric: ${metric.key}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const value = submission.metrics_data[metric.key];
        if (value !== undefined) {
          if (typeof value !== 'number' || isNaN(value)) {
            return new Response(
              JSON.stringify({ error: `Invalid value for metric: ${metric.key}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (metric.min !== undefined && value < metric.min) {
            return new Response(
              JSON.stringify({ error: `${metric.key} must be at least ${metric.min}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (metric.max !== undefined && value > metric.max) {
            return new Response(
              JSON.stringify({ error: `${metric.key} must be at most ${metric.max}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Check for existing result and update or insert
      const { data: existingResult } = await supabaseAdmin
        .from('challenge_public_results')
        .select('id')
        .eq('challenge_id', submission.challenge_id)
        .eq('guest_profile_id', guestProfile.id)
        .single();

      let result;
      if (existingResult) {
        // Update existing result
        const { data, error } = await supabaseAdmin
          .from('challenge_public_results')
          .update({
            metrics_data: submission.metrics_data,
            photo_urls: submission.photo_urls || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResult.id)
          .select('id')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new result
        const { data, error } = await supabaseAdmin
          .from('challenge_public_results')
          .insert({
            challenge_id: submission.challenge_id,
            guest_profile_id: guestProfile.id,
            metrics_data: submission.metrics_data,
            photo_urls: submission.photo_urls || [],
          })
          .select('id')
          .single();

        if (error) throw error;
        result = data;
      }

      return new Response(
        JSON.stringify({ success: true, result_id: result.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Add reaction
    if (action === 'react') {
      const reaction = body as Reaction;
      
      if (!reaction.result_id || !reaction.reaction_type || !reaction.visitor_token) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validReactions = ['like', '💪', '🔥', '👏', '🤯', '😄'];
      if (!validReactions.includes(reaction.reaction_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid reaction type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = hashToken(reaction.visitor_token);

      // Insert or ignore (unique constraint handles duplicates)
      const { error } = await supabaseAdmin
        .from('challenge_result_reactions')
        .insert({
          result_id: reaction.result_id,
          reaction_type: reaction.reaction_type,
          visitor_token_hash: tokenHash,
        });

      if (error && !error.message.includes('duplicate')) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Remove reaction
    if (action === 'unreact') {
      const reaction = body as Reaction;
      
      if (!reaction.result_id || !reaction.reaction_type || !reaction.visitor_token) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = hashToken(reaction.visitor_token);

      await supabaseAdmin
        .from('challenge_result_reactions')
        .delete()
        .eq('result_id', reaction.result_id)
        .eq('reaction_type', reaction.reaction_type)
        .eq('visitor_token_hash', tokenHash);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Send chat message
    if (action === 'send_chat') {
      const chatMsg = body as ChatMessage;
      
      if (!chatMsg.challenge_id || !chatMsg.message || !chatMsg.participant_token) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (chatMsg.message.length > 300) {
        return new Response(
          JSON.stringify({ error: 'Message too long (max 300 characters)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limit: 1 message per 10 seconds per token
      const tokenHash = hashToken(chatMsg.participant_token);
      const rateLimitKey = `chat:${tokenHash}`;
      
      if (!checkRateLimit(rateLimitKey, 1, 10000)) {
        return new Response(
          JSON.stringify({ error: 'Too many messages. Please wait.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify guest profile
      const { data: guestProfile } = await supabaseAdmin
        .from('challenge_guest_profiles')
        .select('id')
        .eq('participant_token_hash', tokenHash)
        .eq('challenge_id', chatMsg.challenge_id)
        .single();

      if (!guestProfile) {
        return new Response(
          JSON.stringify({ error: 'Invalid participant token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabaseAdmin
        .from('challenge_public_chat')
        .insert({
          challenge_id: chatMsg.challenge_id,
          guest_profile_id: guestProfile.id,
          message: chatMsg.message.trim(),
        });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Public challenge error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
