import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple ICS parser
function parseICS(icsContent: string): Array<{
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend?: Date;
  location?: string;
}> {
  const events: Array<{
    uid: string;
    summary: string;
    description?: string;
    dtstart: Date;
    dtend?: Date;
    location?: string;
  }> = [];

  const lines = icsContent.replace(/\r\n /g, '').split(/\r?\n/);
  let currentEvent: any = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart) {
        events.push({
          uid: currentEvent.uid,
          summary: currentEvent.summary || 'Untitled',
          description: currentEvent.description,
          dtstart: currentEvent.dtstart,
          dtend: currentEvent.dtend,
          location: currentEvent.location,
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const keyPart = line.substring(0, colonIndex);
      const value = line.substring(colonIndex + 1);
      const key = keyPart.split(';')[0];

      switch (key) {
        case 'UID':
          currentEvent.uid = value;
          break;
        case 'SUMMARY':
          currentEvent.summary = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          break;
        case 'DESCRIPTION':
          currentEvent.description = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          break;
        case 'LOCATION':
          currentEvent.location = value.replace(/\\n/g, '\n').replace(/\\,/g, ',');
          break;
        case 'DTSTART':
          currentEvent.dtstart = parseICSDate(value, keyPart);
          break;
        case 'DTEND':
          currentEvent.dtend = parseICSDate(value, keyPart);
          break;
      }
    }
  }

  return events;
}

function parseICSDate(value: string, keyPart: string): Date {
  // Check for timezone info
  const tzMatch = keyPart.match(/TZID=([^:;]+)/);
  
  // Format: YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const cleanValue = value.replace('Z', '');
  
  if (cleanValue.length === 8) {
    // All-day event: YYYYMMDD
    const year = parseInt(cleanValue.substring(0, 4));
    const month = parseInt(cleanValue.substring(4, 6)) - 1;
    const day = parseInt(cleanValue.substring(6, 8));
    return new Date(year, month, day);
  } else if (cleanValue.length >= 15) {
    // DateTime: YYYYMMDDTHHMMSS
    const year = parseInt(cleanValue.substring(0, 4));
    const month = parseInt(cleanValue.substring(4, 6)) - 1;
    const day = parseInt(cleanValue.substring(6, 8));
    const hour = parseInt(cleanValue.substring(9, 11));
    const minute = parseInt(cleanValue.substring(11, 13));
    const second = parseInt(cleanValue.substring(13, 15));
    
    if (value.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    return new Date(year, month, day, hour, minute, second);
  }
  
  return new Date(value);
}

// Try to match event summary to a client name
function findClientMatch(summary: string, clients: Array<{ id: string; name: string }>): string | null {
  const normalizedSummary = summary.toLowerCase().trim();
  
  for (const client of clients) {
    const normalizedName = client.name.toLowerCase().trim();
    
    // Direct match
    if (normalizedSummary.includes(normalizedName)) {
      return client.id;
    }
    
    // Check if first name matches
    const firstName = normalizedName.split(' ')[0];
    if (firstName.length > 2 && normalizedSummary.includes(firstName)) {
      return client.id;
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, feedId, userId, icsUrl } = body;

    console.log(`[ICS Sync] Action: ${action}, FeedId: ${feedId}, UserId: ${userId}`);

    if (action === 'sync_feed') {
      // Get feed info
      const { data: feed, error: feedError } = await supabase
        .from('calendar_ics_feeds')
        .select('*')
        .eq('id', feedId)
        .single();

      if (feedError || !feed) {
        return new Response(
          JSON.stringify({ error: 'feed_not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update sync status to pending
      await supabase
        .from('calendar_ics_feeds')
        .update({ last_sync_status: 'pending' })
        .eq('id', feedId);

      try {
        // Fetch ICS content
        console.log(`[ICS Sync] Fetching ICS from: ${feed.ics_url}`);
        const icsResponse = await fetch(feed.ics_url);
        
        if (!icsResponse.ok) {
          throw new Error(`Failed to fetch ICS: ${icsResponse.status}`);
        }

        const icsContent = await icsResponse.text();
        console.log(`[ICS Sync] Fetched ${icsContent.length} bytes`);

        // Parse ICS
        const events = parseICS(icsContent);
        console.log(`[ICS Sync] Parsed ${events.length} events`);

        // Filter events by sync_from_date if set
        const syncFromDate = feed.sync_from_date ? new Date(feed.sync_from_date) : new Date();
        syncFromDate.setMonth(syncFromDate.getMonth() - 1); // Default: last month
        
        const filteredEvents = events.filter(e => e.dtstart >= syncFromDate);
        console.log(`[ICS Sync] ${filteredEvents.length} events after date filter`);

        // Get user's clients for matching
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', feed.user_id)
          .eq('is_archived', false);

        // Process each event
        let syncedCount = 0;
        for (const event of filteredEvents) {
          const matchedClientId = clients ? findClientMatch(event.summary, clients) : null;

          // Upsert event
          const { error: upsertError } = await supabase
            .from('calendar_ics_events')
            .upsert({
              feed_id: feedId,
              ics_uid: event.uid,
              summary: event.summary,
              description: event.description,
              start_at: event.dtstart.toISOString(),
              end_at: event.dtend?.toISOString(),
              location: event.location,
              matched_client_id: matchedClientId,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'feed_id,ics_uid',
            });

          if (!upsertError) {
            syncedCount++;
          }
        }

        // Update feed status
        await supabase
          .from('calendar_ics_feeds')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'success',
            last_sync_error: null,
            events_synced: syncedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', feedId);

        console.log(`[ICS Sync] Successfully synced ${syncedCount} events`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            events_synced: syncedCount,
            total_events: events.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (syncError) {
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        console.error(`[ICS Sync] Sync error:`, syncError);

        await supabase
          .from('calendar_ics_feeds')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'error',
            last_sync_error: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', feedId);

        return new Response(
          JSON.stringify({ error: 'sync_failed', message: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'create_sessions_from_events') {
      // Get unprocessed events with matched clients
      const { data: events, error: eventsError } = await supabase
        .from('calendar_ics_events')
        .select(`
          *,
          feed:calendar_ics_feeds(user_id, default_duration)
        `)
        .eq('feed_id', feedId)
        .eq('is_processed', false)
        .not('matched_client_id', 'is', null)
        .order('start_at', { ascending: true });

      if (eventsError) {
        return new Response(
          JSON.stringify({ error: 'fetch_failed', details: eventsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let createdCount = 0;
      for (const event of events || []) {
        const feed = event.feed as any;
        
        // Calculate duration
        let duration = feed.default_duration || 60;
        if (event.end_at && event.start_at) {
          const start = new Date(event.start_at);
          const end = new Date(event.end_at);
          duration = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        // Check if session already exists for this time and client
        const { data: existingSession } = await supabase
          .from('training_sessions')
          .select('id')
          .eq('client_id', event.matched_client_id)
          .eq('date', event.start_at)
          .single();

        if (!existingSession) {
          // Create training session
          const { data: session, error: sessionError } = await supabase
            .from('training_sessions')
            .insert({
              client_id: event.matched_client_id,
              user_id: feed.user_id,
              date: event.start_at,
              duration,
              status: 'scheduled',
              notes: event.description ? `Z kalendáře: ${event.summary}\n\n${event.description}` : `Z kalendáře: ${event.summary}`,
            })
            .select()
            .single();

          if (!sessionError && session) {
            // Update event with session reference
            await supabase
              .from('calendar_ics_events')
              .update({
                training_session_id: session.id,
                is_processed: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event.id);

            createdCount++;
          }
        } else {
          // Mark as processed without creating new session
          await supabase
            .from('calendar_ics_events')
            .update({
              training_session_id: existingSession.id,
              is_processed: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', event.id);
        }
      }

      console.log(`[ICS Sync] Created ${createdCount} training sessions`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessions_created: createdCount,
          events_processed: events?.length || 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'test_url') {
      // Just test if the URL is accessible
      try {
        const response = await fetch(icsUrl, { method: 'HEAD' });
        
        if (!response.ok) {
          return new Response(
            JSON.stringify({ valid: false, error: `HTTP ${response.status}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Try to fetch and parse a bit
        const fullResponse = await fetch(icsUrl);
        const content = await fullResponse.text();
        
        if (!content.includes('BEGIN:VCALENDAR')) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Not a valid ICS file' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const events = parseICS(content);

        return new Response(
          JSON.stringify({ 
            valid: true, 
            events_count: events.length,
            sample_events: events.slice(0, 3).map(e => ({
              summary: e.summary,
              date: e.dtstart.toISOString(),
            })),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Failed to fetch URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'unknown_action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ICS Sync] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
