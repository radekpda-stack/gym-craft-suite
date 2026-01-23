import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClientData {
  name: string;
}

interface NutritionSession {
  id: string;
  client_id: string;
  user_id: string;
  clients: ClientData | ClientData[] | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[check-nutrition-inactivity] Starting inactivity check...');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split('T')[0];

    console.log('[check-nutrition-inactivity] Checking for sessions active on:', todayStr);
    console.log('[check-nutrition-inactivity] Inactivity threshold:', twentyFourHoursAgo.toISOString());

    // Find active nutrition sessions that are within their date range
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('nutrition_log_sessions')
      .select(`
        id, client_id, user_id,
        clients (name)
      `)
      .eq('status', 'active')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr);

    if (sessionsError) {
      console.error('[check-nutrition-inactivity] Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    console.log('[check-nutrition-inactivity] Found', activeSessions?.length || 0, 'active sessions');

    const notificationsCreated: string[] = [];
    const sessionsChecked: string[] = [];

    for (const session of (activeSessions || []) as NutritionSession[]) {
      sessionsChecked.push(session.id);
      
      // Get the latest food entry for this session
      const { data: lastEntry, error: entryError } = await supabase
        .from('nutrition_food_entries')
        .select('created_at')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (entryError) {
        console.error('[check-nutrition-inactivity] Error fetching entries for session:', session.id, entryError);
        continue;
      }

      const lastEntryDate = lastEntry?.created_at 
        ? new Date(lastEntry.created_at) 
        : null;

      console.log('[check-nutrition-inactivity] Session', session.id, 
        'last entry:', lastEntryDate?.toISOString() || 'none');

      // If no entry or last entry is older than 24h
      if (!lastEntryDate || lastEntryDate < twentyFourHoursAgo) {
        // Check if notification already exists in the last 24h
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('client_id', session.client_id)
          .eq('type', 'nutrition_inactive')
          .gte('created_at', twentyFourHoursAgo.toISOString())
          .maybeSingle();

        if (!existingNotif) {
          // Handle both single object and array returns from Supabase
          const clientsData = session.clients;
          const clientName = Array.isArray(clientsData) 
            ? (clientsData[0]?.name || 'Klient')
            : (clientsData?.name || 'Klient');
          
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: session.user_id,
            client_id: session.client_id,
            type: 'nutrition_inactive',
            title: 'Klient nezapisuje stravu',
            message: `${clientName} nezapsal/a stravu více než 24 hodin.`,
            entity_type: 'nutrition_session',
            entity_id: session.id,
            severity: 'warning',
          });

          if (notifError) {
            console.error('[check-nutrition-inactivity] Error creating notification:', notifError);
          } else {
            notificationsCreated.push(session.client_id);
            console.log('[check-nutrition-inactivity] Created inactivity notification for client:', session.client_id);
          }
        } else {
          console.log('[check-nutrition-inactivity] Notification already exists for client:', session.client_id);
        }
      }
    }

    const result = {
      success: true,
      timestamp: now.toISOString(),
      sessionsChecked: sessionsChecked.length,
      notificationsCreated: notificationsCreated.length,
    };

    console.log('[check-nutrition-inactivity] Completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[check-nutrition-inactivity] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
