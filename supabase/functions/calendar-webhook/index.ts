import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface CalendarEvent {
  external_id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
}

interface WebhookPayload {
  action: 'create' | 'update' | 'delete';
  user_email: string;
  event: CalendarEvent;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('CALENDAR_WEBHOOK_KEY');
    
    if (!expectedKey || apiKey !== expectedKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: WebhookPayload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));

    // Validate payload
    if (!payload.action || !payload.user_email || !payload.event) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, user_email, event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', payload.user_email)
      .single();

    if (userError || !userData) {
      console.error('User not found:', payload.user_email, userError);
      return new Response(
        JSON.stringify({ error: `User not found: ${payload.user_email}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user_id;
    const { action, event } = payload;

    // Validate event data
    if (!event.external_id || !event.title || !event.start_time || !event.end_time) {
      return new Response(
        JSON.stringify({ error: 'Event missing required fields: external_id, title, start_time, end_time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'create':
      case 'update':
        // Upsert event
        const { data: upsertData, error: upsertError } = await supabase
          .from('external_calendar_events')
          .upsert({
            user_id: userId,
            external_id: event.external_id,
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time,
            all_day: event.all_day ?? false,
            source: 'make.com',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,external_id',
          })
          .select()
          .single();

        if (upsertError) {
          console.error('Upsert error:', upsertError);
          return new Response(
            JSON.stringify({ error: 'Failed to save event', details: upsertError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { success: true, action, event: upsertData };
        console.log(`Event ${action}d successfully:`, upsertData?.id);
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('external_calendar_events')
          .delete()
          .eq('user_id', userId)
          .eq('external_id', event.external_id);

        if (deleteError) {
          console.error('Delete error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to delete event', details: deleteError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { success: true, action, external_id: event.external_id };
        console.log('Event deleted successfully:', event.external_id);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
