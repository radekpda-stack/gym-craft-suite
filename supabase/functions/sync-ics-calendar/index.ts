import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Czech nicknames database
const CZECH_NICKNAMES: Record<string, string[]> = {
  'jan': ['honza', 'jenda', 'jeník', 'honzík', 'jéňa', 'johny'],
  'josef': ['pepa', 'pepík', 'pepča', 'jožka', 'joska'],
  'petr': ['péťa', 'petřík', 'peťan', 'pedro'],
  'marie': ['máňa', 'maruška', 'mařenka', 'mája', 'majka'],
  'kateřina': ['káťa', 'katka', 'kačka', 'kačenka', 'kája'],
  'tereza': ['terka', 'terezka', 'tery'],
  'michaela': ['míša', 'míšenka', 'miki'],
  'jiří': ['jirka', 'jiřík', 'jura', 'juraj'],
  'tomáš': ['tomeš', 'tomík', 'tonda', 'tom'],
  'martin': ['máťa', 'martínek', 'marty'],
  'pavel': ['pája', 'pavlík', 'pašík'],
  'lukáš': ['lukášek', 'luki', 'luky'],
  'david': ['davídek', 'dáda', 'dave'],
  'jakub': ['kuba', 'kubík', 'kubíček', 'kubo'],
  'ondřej': ['ondra', 'ondráš', 'ondráček'],
  'františek': ['franta', 'fanda', 'ferda', 'frank'],
  'václav': ['vašek', 'véna', 'václavek', 'venca'],
  'anna': ['anka', 'andula', 'anička', 'aňa'],
  'eva': ['evička', 'evka', 'evina'],
  'lucie': ['lucka', 'lucinka', 'lucy'],
  'jana': ['janka', 'janička', 'jaňa'],
  'hana': ['hanka', 'hanička', 'háňa'],
  'petra': ['péťa', 'petruška', 'petruše'],
  'veronika': ['věrka', 'nika', 'verča'],
  'lenka': ['lenička', 'lenušká'],
  'markéta': ['márka', 'markétka', 'maky'],
  'zuzana': ['zuzka', 'zuzi', 'zuzanka'],
  'barbora': ['bára', 'baru', 'barča', 'barbuška'],
  'alexandra': ['saša', 'alex', 'sára'],
  'monika': ['moňa', 'monča', 'moni'],
  'andrea': ['andy', 'andrejka'],
  'alena': ['alenka', 'ali', 'ajka'],
  'daniel': ['dan', 'daník', 'danda'],
  'marek': ['mareček', 'mára'],
  'michal': ['míša', 'mišák', 'miki'],
  'filip': ['filda', 'filípek', 'fil'],
  'adam': ['adámek', 'ady'],
  'vojtěch': ['vojta', 'vojtík', 'véja'],
  'štěpán': ['štěpa', 'štěpánek', 'stevo'],
  'matěj': ['máťa', 'matýsek', 'maty'],
  'dominik': ['domča', 'dom', 'dodo'],
  'radek': ['ráďa', 'radoušek'],
  'jaroslav': ['jarda', 'slávek', 'jára'],
  'zdeněk': ['zdenda', 'zdeňous', 'zděna'],
  'vladimír': ['vláďa', 'vlado', 'vládík'],
  'miroslav': ['míra', 'mirek', 'mířa'],
  'oldřich': ['olda', 'olina'],
  'stanislav': ['standa', 'staník', 'slávek'],
  'ladislav': ['láďa', 'lado', 'laco'],
  'richard': ['rišo', 'ríša', 'riki'],
  'robert': ['robo', 'robík', 'bobby'],
  'libor': ['líba', 'libíček'],
  'jiřina': ['jířa', 'jiruna'],
  'věra': ['věrka', 'věruška'],
  'ivana': ['iva', 'ivča', 'ivuška'],
  'helena': ['hela', 'helenka', 'lena'],
  'ludmila': ['lída', 'lidka', 'míla'],
  'milena': ['míla', 'miluška'],
  'dagmar': ['dáša', 'dáda'],
  'simona': ['simča', 'simi'],
  'nikola': ['niki', 'nikolka'],
  'kristýna': ['kiki', 'týna', 'kristy'],
};

// Normalize text - remove diacritics and convert to lowercase
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Get all possible name variations for a client
function getNameVariations(name: string): string[] {
  const normalized = normalizeText(name);
  const parts = normalized.split(/\s+/);
  const variations: string[] = [normalized];

  for (const part of parts) {
    variations.push(part);
    
    // Check if this part is a key in nicknames
    const nicknamesForPart = CZECH_NICKNAMES[part];
    if (nicknamesForPart) {
      variations.push(...nicknamesForPart.map(normalizeText));
    }
    
    // Check if this part is a nickname value
    for (const [formalName, nicknames] of Object.entries(CZECH_NICKNAMES)) {
      if (nicknames.map(normalizeText).includes(part)) {
        variations.push(normalizeText(formalName));
      }
    }
  }

  return [...new Set(variations)];
}

// Extract potential name tokens from event summary
function extractNameTokens(summary: string): string[] {
  const normalized = normalizeText(summary);
  // Remove common non-name words
  const stopWords = ['trenink', 'training', 'trening', 'session', 'sezení', 'cviceni', 'cvičení', 'workout', 'osobni', 'osobní'];
  const tokens = normalized.split(/[\s,\-–:]+/).filter(t => 
    t.length > 1 && !stopWords.includes(t) && !/^\d+$/.test(t)
  );
  return tokens;
}

interface ClientMatchResult {
  clientId: string;
  clientName: string;
  score: number;
  matchType: 'exact_full' | 'exact_first' | 'exact_last' | 'nickname' | 'alias' | 'fuzzy';
}

// Score a client match against event summary
function scoreClientMatch(
  summary: string,
  client: { id: string; name: string },
  aliases: string[]
): ClientMatchResult | null {
  const normalizedSummary = normalizeText(summary);
  const summaryTokens = extractNameTokens(summary);
  const clientVariations = getNameVariations(client.name);
  const normalizedClientName = normalizeText(client.name);
  const nameParts = normalizedClientName.split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  let bestScore = 0;
  let matchType: ClientMatchResult['matchType'] = 'fuzzy';

  // Check for exact full name match
  if (normalizedSummary.includes(normalizedClientName)) {
    return { clientId: client.id, clientName: client.name, score: 100, matchType: 'exact_full' };
  }

  // Check aliases (from database)
  for (const alias of aliases) {
    if (normalizedSummary.includes(normalizeText(alias))) {
      return { clientId: client.id, clientName: client.name, score: 95, matchType: 'alias' };
    }
  }

  // Check for nickname matches
  for (const variation of clientVariations) {
    if (variation !== normalizedClientName && normalizedSummary.includes(variation)) {
      if (bestScore < 90) {
        bestScore = 90;
        matchType = 'nickname';
      }
    }
  }
  if (bestScore >= 90) {
    return { clientId: client.id, clientName: client.name, score: bestScore, matchType };
  }

  // Check for first name exact match
  if (firstName.length > 2 && normalizedSummary.includes(firstName)) {
    return { clientId: client.id, clientName: client.name, score: 75, matchType: 'exact_first' };
  }

  // Check for last name exact match
  if (lastName.length > 2 && normalizedSummary.includes(lastName)) {
    return { clientId: client.id, clientName: client.name, score: 65, matchType: 'exact_last' };
  }

  // Fuzzy matching on tokens
  for (const token of summaryTokens) {
    for (const variation of clientVariations) {
      if (token.length >= 3 && variation.length >= 3) {
        const distance = levenshteinDistance(token, variation);
        const maxLen = Math.max(token.length, variation.length);
        const similarity = 1 - distance / maxLen;
        
        if (similarity >= 0.8) { // 80% similar
          const fuzzyScore = Math.round(50 + similarity * 30); // 50-80 range
          if (fuzzyScore > bestScore) {
            bestScore = fuzzyScore;
            matchType = 'fuzzy';
          }
        }
      }
    }
  }

  if (bestScore >= 50) {
    return { clientId: client.id, clientName: client.name, score: bestScore, matchType };
  }

  return null;
}

// Find best client matches for an event (supports multiple clients)
function findClientMatches(
  summary: string, 
  clients: Array<{ id: string; name: string }>,
  aliasMap: Map<string, string[]>
): ClientMatchResult[] {
  const results: ClientMatchResult[] = [];
  const matchedClientIds = new Set<string>();

  for (const client of clients) {
    const aliases = aliasMap.get(client.id) || [];
    const match = scoreClientMatch(summary, client, aliases);
    if (match && !matchedClientIds.has(match.clientId)) {
      results.push(match);
      matchedClientIds.add(match.clientId);
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

// Find multiple high-confidence matches (for group trainings)
function findMultipleClientMatches(
  summary: string,
  clients: Array<{ id: string; name: string }>,
  aliasMap: Map<string, string[]>,
  minScore: number = 70
): { primary: ClientMatchResult | null; additional: ClientMatchResult[] } {
  const allMatches = findClientMatches(summary, clients, aliasMap);
  
  // Filter matches above minimum score
  const highConfidenceMatches = allMatches.filter(m => m.score >= minScore);
  
  if (highConfidenceMatches.length === 0) {
    return { primary: null, additional: [] };
  }
  
  // Primary is the first (highest score), additional are the rest
  return {
    primary: highConfidenceMatches[0],
    additional: highConfidenceMatches.slice(1)
  };
}

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
  const cleanValue = value.replace('Z', '');
  
  if (cleanValue.length === 8) {
    const year = parseInt(cleanValue.substring(0, 4));
    const month = parseInt(cleanValue.substring(4, 6)) - 1;
    const day = parseInt(cleanValue.substring(6, 8));
    return new Date(year, month, day);
  } else if (cleanValue.length >= 15) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, feedId, userId, icsUrl, eventId, clientId } = body;

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
        syncFromDate.setMonth(syncFromDate.getMonth() - 1);
        
        const filteredEvents = events.filter(e => e.dtstart >= syncFromDate);
        console.log(`[ICS Sync] ${filteredEvents.length} events after date filter`);

        // Get user's clients for matching
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', feed.user_id)
          .eq('is_archived', false);

        // Get all client aliases for this user
        const { data: aliasesData } = await supabase
          .from('client_name_aliases')
          .select('client_id, alias')
          .eq('user_id', feed.user_id);

        // Build alias map
        const aliasMap = new Map<string, string[]>();
        for (const aliasRow of aliasesData || []) {
          const existing = aliasMap.get(aliasRow.client_id) || [];
          existing.push(aliasRow.alias);
          aliasMap.set(aliasRow.client_id, existing);
        }

        // Process each event
        let syncedCount = 0;
        for (const event of filteredEvents) {
          // Find multiple client matches (for group trainings)
          const { primary, additional } = clients 
            ? findMultipleClientMatches(event.summary, clients, aliasMap, 70)
            : { primary: null, additional: [] };
          
          // Get all matches for suggestions
          const allMatches = clients ? findClientMatches(event.summary, clients, aliasMap) : [];
          const suggestions = allMatches.slice(0, 5).map(m => ({
            client_id: m.clientId,
            name: m.clientName,
            score: m.score,
            match_type: m.matchType,
          }));

          // Additional client IDs (for group trainings)
          const additionalClientIds = additional.map(m => m.clientId);

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
              matched_client_id: primary?.clientId || null,
              additional_matched_client_ids: additionalClientIds,
              match_suggestions: suggestions,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'feed_id,ics_uid',
            });

          if (!upsertError) {
            syncedCount++;
            if (additionalClientIds.length > 0) {
              console.log(`[ICS Sync] Event "${event.summary}" matched ${1 + additionalClientIds.length} clients`);
            }
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

    if (action === 'learn_alias') {
      // Learn from a manual client assignment - extract pattern from event summary
      const { data: event } = await supabase
        .from('calendar_ics_events')
        .select('summary, feed:calendar_ics_feeds(user_id)')
        .eq('id', eventId)
        .single();

      if (!event || !clientId) {
        return new Response(
          JSON.stringify({ error: 'invalid_request' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const feed = event.feed as any;
      const tokens = extractNameTokens(event.summary);
      
      // Get client name to avoid storing it as alias
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      if (!client) {
        return new Response(
          JSON.stringify({ error: 'client_not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const clientNameParts = normalizeText(client.name).split(/\s+/);
      const learnedAliases: string[] = [];

      for (const token of tokens) {
        // Don't store if it's already part of client name
        if (clientNameParts.includes(token)) continue;
        // Don't store if it's a known nickname
        let isKnownNickname = false;
        for (const nicknames of Object.values(CZECH_NICKNAMES)) {
          if (nicknames.map(normalizeText).includes(token)) {
            isKnownNickname = true;
            break;
          }
        }
        if (isKnownNickname) continue;

        // Store as learned alias
        const { error } = await supabase
          .from('client_name_aliases')
          .upsert({
            client_id: clientId,
            alias: token,
            source: 'learned',
            user_id: feed.user_id,
          }, {
            onConflict: 'client_id,alias',
          });

        if (!error) {
          learnedAliases.push(token);
        }
      }

      console.log(`[ICS Sync] Learned ${learnedAliases.length} aliases for client ${clientId}: ${learnedAliases.join(', ')}`);

      return new Response(
        JSON.stringify({ success: true, learned_aliases: learnedAliases }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

        // Collect all client IDs (primary + additional)
        const allClientIds: string[] = [event.matched_client_id];
        if (event.additional_matched_client_ids && Array.isArray(event.additional_matched_client_ids)) {
          allClientIds.push(...event.additional_matched_client_ids);
        }

        // Create a session for each client
        let sessionsCreatedForEvent = 0;
        for (const clientId of allClientIds) {
          // Check if session already exists for this time and client
          const { data: existingSession } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('client_id', clientId)
            .eq('date', event.start_at)
            .single();

          if (!existingSession) {
            // Create training session
            const { data: session, error: sessionError } = await supabase
              .from('training_sessions')
              .insert({
                client_id: clientId,
                user_id: feed.user_id,
                date: event.start_at,
                duration,
                status: 'scheduled',
                notes: event.description ? `Z kalendáře: ${event.summary}\n\n${event.description}` : `Z kalendáře: ${event.summary}`,
                source_ics_event_id: event.id,
              })
              .select()
              .single();

            if (!sessionError && session) {
              sessionsCreatedForEvent++;
              createdCount++;
            }
          }
        }

        // Mark event as processed
        await supabase
          .from('calendar_ics_events')
          .update({
            is_processed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id);

        if (allClientIds.length > 1) {
          console.log(`[ICS Sync] Created ${sessionsCreatedForEvent} sessions for group event "${event.summary}" with ${allClientIds.length} clients`);
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

    // NEW: Auto-create sessions from all events (including unmatched ones)
    if (action === 'sync_and_create_sessions') {
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
        console.log(`[ICS Sync Auto] Fetching ICS from: ${feed.ics_url}`);
        const icsResponse = await fetch(feed.ics_url);
        
        if (!icsResponse.ok) {
          throw new Error(`Failed to fetch ICS: ${icsResponse.status}`);
        }

        const icsContent = await icsResponse.text();
        console.log(`[ICS Sync Auto] Fetched ${icsContent.length} bytes`);

        // Parse ICS
        const events = parseICS(icsContent);
        console.log(`[ICS Sync Auto] Parsed ${events.length} events`);

        // Filter events by sync_from_date if set
        const syncFromDate = feed.sync_from_date ? new Date(feed.sync_from_date) : new Date();
        syncFromDate.setMonth(syncFromDate.getMonth() - 1);
        
        const filteredEvents = events.filter(e => e.dtstart >= syncFromDate);
        console.log(`[ICS Sync Auto] ${filteredEvents.length} events after date filter`);

        // Get user's clients for matching
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', feed.user_id)
          .eq('is_archived', false);

        // Get all client aliases for this user
        const { data: aliasesData } = await supabase
          .from('client_name_aliases')
          .select('client_id, alias')
          .eq('user_id', feed.user_id);

        // Build alias map
        const aliasMap = new Map<string, string[]>();
        for (const aliasRow of aliasesData || []) {
          const existing = aliasMap.get(aliasRow.client_id) || [];
          existing.push(aliasRow.alias);
          aliasMap.set(aliasRow.client_id, existing);
        }

        // Process each event
        let syncedCount = 0;
        let sessionsCreated = 0;
        let unmatchedCount = 0;
        const unmatchedSessions: Array<{ sessionId: string; summary: string; startAt: string }> = [];

        for (const event of filteredEvents) {
          // Find multiple client matches (for group trainings)
          const { primary, additional } = clients 
            ? findMultipleClientMatches(event.summary, clients, aliasMap, 70)
            : { primary: null, additional: [] };
          
          // Get all matches for suggestions
          const allMatches = clients ? findClientMatches(event.summary, clients, aliasMap) : [];
          const suggestions = allMatches.slice(0, 5).map(m => ({
            client_id: m.clientId,
            name: m.clientName,
            score: m.score,
            match_type: m.matchType,
          }));

          // Additional client IDs (for group trainings)
          const additionalClientIds = additional.map(m => m.clientId);

          // Upsert event
          const { data: savedEvent, error: upsertError } = await supabase
            .from('calendar_ics_events')
            .upsert({
              feed_id: feedId,
              ics_uid: event.uid,
              summary: event.summary,
              description: event.description,
              start_at: event.dtstart.toISOString(),
              end_at: event.dtend?.toISOString(),
              location: event.location,
              matched_client_id: primary?.clientId || null,
              additional_matched_client_ids: additionalClientIds,
              match_suggestions: suggestions,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'feed_id,ics_uid',
            })
            .select('id')
            .single();

          if (upsertError) {
            console.error(`[ICS Sync Auto] Error upserting event "${event.summary}":`, upsertError);
            continue;
          }

          syncedCount++;
          const eventId = savedEvent?.id;

          // Calculate duration
          let duration = feed.default_duration || 60;
          if (event.dtend && event.dtstart) {
            duration = Math.round((event.dtend.getTime() - event.dtstart.getTime()) / 60000);
          }

          // Check if session already exists for this ICS event
          const { data: existingSession } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('source_ics_event_id', eventId)
            .maybeSingle();

          if (existingSession) {
            // Event already processed, skip
            continue;
          }

          if (primary) {
            // Create sessions for matched clients
            const allClientIds = [primary.clientId, ...additionalClientIds];
            
            for (const clientId of allClientIds) {
              // Check if session already exists for this time and client
              const { data: existingClientSession } = await supabase
                .from('training_sessions')
                .select('id')
                .eq('client_id', clientId)
                .eq('date', event.dtstart.toISOString())
                .maybeSingle();

              if (!existingClientSession) {
                const { error: sessionError } = await supabase
                  .from('training_sessions')
                  .insert({
                    client_id: clientId,
                    user_id: feed.user_id,
                    date: event.dtstart.toISOString(),
                    duration,
                    status: 'scheduled',
                    notes: event.description ? `Z kalendáře: ${event.summary}\n\n${event.description}` : `Z kalendáře: ${event.summary}`,
                    source_ics_event_id: eventId,
                  });

                if (!sessionError) {
                  sessionsCreated++;
                }
              }
            }
          } else {
            // No match - create session without client_id
            const { data: newSession, error: sessionError } = await supabase
              .from('training_sessions')
              .insert({
                client_id: null,
                user_id: feed.user_id,
                date: event.dtstart.toISOString(),
                duration,
                status: 'scheduled',
                notes: event.description ? `Z kalendáře: ${event.summary}\n\n${event.description}` : `Z kalendáře: ${event.summary}`,
                source_ics_event_id: eventId,
              })
              .select('id')
              .single();

            if (!sessionError && newSession) {
              sessionsCreated++;
              unmatchedCount++;
              unmatchedSessions.push({
                sessionId: newSession.id,
                summary: event.summary,
                startAt: event.dtstart.toISOString(),
              });
            }
          }

          // Mark event as processed
          await supabase
            .from('calendar_ics_events')
            .update({
              is_processed: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', eventId);
        }

        // Create notifications for unmatched sessions
        if (unmatchedSessions.length > 0) {
          const notifications = unmatchedSessions.map(s => ({
            user_id: feed.user_id,
            type: 'calendar_unmatched',
            title: 'Trénink bez přiřazeného klienta',
            message: `"${s.summary}" - ${new Date(s.startAt).toLocaleString('cs-CZ', { 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`,
            entity_type: 'training_session',
            entity_id: s.sessionId,
            severity: 'warning',
            is_read: false,
          }));

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error(`[ICS Sync Auto] Error creating notifications:`, notifError);
          } else {
            console.log(`[ICS Sync Auto] Created ${notifications.length} notifications for unmatched sessions`);
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

        console.log(`[ICS Sync Auto] Successfully synced ${syncedCount} events, created ${sessionsCreated} sessions (${unmatchedCount} unmatched)`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            events_synced: syncedCount,
            sessions_created: sessionsCreated,
            unmatched_count: unmatchedCount,
            total_events: events.length,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (syncError) {
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        console.error(`[ICS Sync Auto] Sync error:`, syncError);

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

    if (action === 'test_url') {
      try {
        const response = await fetch(icsUrl, { method: 'HEAD' });
        
        if (!response.ok) {
          return new Response(
            JSON.stringify({ valid: false, error: `HTTP ${response.status}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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
