import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Scheduled Sync] Starting hourly calendar sync...');

    // Get all active feeds
    const { data: feeds, error: feedsError } = await supabase
      .from('calendar_ics_feeds')
      .select('id, user_id, name')
      .eq('is_active', true);

    if (feedsError) {
      console.error('[Scheduled Sync] Error fetching feeds:', feedsError);
      return new Response(
        JSON.stringify({ error: 'fetch_feeds_failed', details: feedsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!feeds || feeds.length === 0) {
      console.log('[Scheduled Sync] No active feeds to sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No active feeds', feeds_synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Scheduled Sync] Found ${feeds.length} active feeds to sync`);

    // Sync each feed by calling the sync-ics-calendar function
    let successCount = 0;
    let errorCount = 0;
    const results: Array<{ feedId: string; name: string; success: boolean; error?: string }> = [];

    for (const feed of feeds) {
      try {
        console.log(`[Scheduled Sync] Syncing feed "${feed.name}" (${feed.id})...`);
        
        // Call the sync_and_create_sessions action
        const response = await supabase.functions.invoke('sync-ics-calendar', {
          body: {
            action: 'sync_and_create_sessions',
            feedId: feed.id,
          },
        });

        if (response.error) {
          console.error(`[Scheduled Sync] Error syncing feed "${feed.name}":`, response.error);
          errorCount++;
          results.push({ feedId: feed.id, name: feed.name, success: false, error: response.error.message });
        } else {
          console.log(`[Scheduled Sync] Successfully synced feed "${feed.name}":`, response.data);
          successCount++;
          results.push({ feedId: feed.id, name: feed.name, success: true });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scheduled Sync] Exception syncing feed "${feed.name}":`, error);
        errorCount++;
        results.push({ feedId: feed.id, name: feed.name, success: false, error: errorMessage });
      }
    }

    console.log(`[Scheduled Sync] Completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        feeds_total: feeds.length,
        feeds_synced: successCount,
        feeds_failed: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scheduled Sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
