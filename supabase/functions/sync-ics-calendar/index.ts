import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeIcsUrl(url: string): string {
  if (url.startsWith('webcal://')) return url.replace('webcal://', 'https://');
  if (url.startsWith('webcals://')) return url.replace('webcals://', 'https://');
  return url;
}

async function fetchIcs(url: string): Promise<string> {
  const fetchUrl = normalizeIcsUrl(url);
  const res = await fetch(fetchUrl, {
    headers: {
      'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; LovableCalendarSync/1.0)',
    },
  });

  if (!res.ok) {
    const preview = await res.text().catch(() => '');
    throw new Error(`Failed to fetch ICS (HTTP ${res.status}). ${preview?.slice(0, 200) || ''}`.trim());
  }

  const content = await res.text();
  if (!content.includes('BEGIN:VCALENDAR')) {
    throw new Error('Response is not a valid ICS file (missing BEGIN:VCALENDAR).');
  }
  return content;
}

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
  'táňa': ['taťána', 'taťana', 'tatana', 'tatiana'],
  'taťána': ['táňa', 'tatana', 'tatiana'],
  'linda': ['lindička', 'linduška'],
  'zdeňka': ['zdenička', 'zdeňulka'],
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Extract name from common calendar event formats like "8.00 Jméno" or "Jméno 14:00"
function extractNameFromTimePattern(summary: string): string | null {
  const normalized = summary.trim();
  
  // Pattern: "HH:MM Jméno" or "HH.MM Jméno" or "H:MM Jméno"
  const timeFirstPattern = /^(\d{1,2}[.:]\d{2})\s+(.+)$/i;
  const timeFirstMatch = normalized.match(timeFirstPattern);
  if (timeFirstMatch) {
    const potentialName = timeFirstMatch[2].trim();
    // Remove common suffixes like "platit", "?"
    return potentialName.replace(/\s*(platit|\?|!)$/i, '').trim();
  }
  
  // Pattern: "Jméno HH:MM" or "Jméno HH.MM"
  const timeLastPattern = /^(.+?)\s+(\d{1,2}[.:]\d{2})$/i;
  const timeLastMatch = normalized.match(timeLastPattern);
  if (timeLastMatch) {
    return timeLastMatch[1].trim();
  }
  
  // Pattern: "Jméno - poznámka"
  const dashPattern = /^([^-]+)\s*-\s*.+$/;
  const dashMatch = normalized.match(dashPattern);
  if (dashMatch) {
    return dashMatch[1].trim();
  }
  
  return null;
}

// Get all possible name variations for a client
function getNameVariations(name: string): string[] {
  const normalized = normalizeText(name);
  const parts = normalized.split(/\s+/);
  const variations: string[] = [normalized];

  for (const part of parts) {
    variations.push(part);
    
    const nicknamesForPart = CZECH_NICKNAMES[part];
    if (nicknamesForPart) {
      variations.push(...nicknamesForPart.map(normalizeText));
    }
    
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
  const stopWords = ['trenink', 'training', 'trening', 'session', 'sezení', 'cviceni', 'cvičení', 'workout', 'osobni', 'osobní', 'platit', 'zaplaceno'];
  const tokens = normalized.split(/[\s,\-–:]+/).filter(t => 
    t.length > 1 && !stopWords.includes(t) && !/^\d+$/.test(t) && !/^\d{1,2}\.\d{2}$/.test(t)
  );
  return tokens;
}

interface ClientMatchResult {
  clientId: string;
  clientName: string;
  score: number;
  matchType: 'exact_full' | 'exact_first' | 'exact_last' | 'nickname' | 'alias' | 'fuzzy' | 'time_pattern';
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

  // Check for time pattern extraction (e.g., "8.00 Jméno")
  const extractedName = extractNameFromTimePattern(summary);
  if (extractedName) {
    const normalizedExtracted = normalizeText(extractedName);
    // Check if extracted name matches client
    if (normalizedExtracted === firstName || normalizedExtracted === lastName || normalizedExtracted === normalizedClientName) {
      return { clientId: client.id, clientName: client.name, score: 92, matchType: 'time_pattern' };
    }
    // Check against nicknames
    for (const variation of clientVariations) {
      if (normalizedExtracted === variation) {
        return { clientId: client.id, clientName: client.name, score: 88, matchType: 'time_pattern' };
      }
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
        
        if (similarity >= 0.8) {
          const fuzzyScore = Math.round(50 + similarity * 30);
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

  return results.sort((a, b) => b.score - a.score);
}

// Parse multiple client names from event summary using separators (& , + /)
function parseMultipleClients(summary: string): string[] {
  // Remove #tr tag and time patterns
  let cleaned = summary
    .replace(/#tr/gi, '')
    .replace(/\d{1,2}[.:]\d{2}/g, '')
    .trim();
  
  // Check for common separators that indicate multiple clients
  const separators = /\s*[&,+\/]\s*/;
  if (separators.test(cleaned)) {
    return cleaned
      .split(separators)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  // Single client
  return [cleaned];
}

// Find the best match for a single client name
function findBestMatchForName(
  name: string,
  clients: Array<{ id: string; name: string }>,
  aliasMap: Map<string, string[]>
): ClientMatchResult | null {
  let bestMatch: ClientMatchResult | null = null;
  
  for (const client of clients) {
    const aliases = aliasMap.get(client.id) || [];
    const match = scoreClientMatch(name, client, aliases);
    if (match && (!bestMatch || match.score > bestMatch.score)) {
      bestMatch = match;
    }
  }
  
  return bestMatch;
}

// Find multiple high-confidence matches (for group trainings)
// Now explicitly parses names from summary using separators
function findMultipleClientMatches(
  summary: string,
  clients: Array<{ id: string; name: string }>,
  aliasMap: Map<string, string[]>,
  minScore: number = 75
): { primary: ClientMatchResult | null; additional: ClientMatchResult[] } {
  const parsedNames = parseMultipleClients(summary);
  
  // If we found multiple names via separators, match each individually
  if (parsedNames.length > 1) {
    const matches: ClientMatchResult[] = [];
    const matchedClientIds = new Set<string>();
    
    for (const name of parsedNames) {
      const match = findBestMatchForName(name, clients, aliasMap);
      if (match && match.score >= minScore && !matchedClientIds.has(match.clientId)) {
        matches.push(match);
        matchedClientIds.add(match.clientId);
      }
    }
    
    if (matches.length === 0) {
      return { primary: null, additional: [] };
    }
    
    // Sort by score, take the best one as primary
    matches.sort((a, b) => b.score - a.score);
    
    return {
      primary: matches[0],
      additional: matches.slice(1)
    };
  }
  
  // Single client parsing - use original matching logic
  const allMatches = findClientMatches(summary, clients, aliasMap);
  const highConfidenceMatches = allMatches.filter(m => m.score >= minScore);
  
  if (highConfidenceMatches.length === 0) {
    return { primary: null, additional: [] };
  }
  
  // Only take the first match as primary, don't auto-add additional clients
  return {
    primary: highConfidenceMatches[0],
    additional: []
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
    const { action, feedId, userId, icsUrl, eventId, clientId, eventIds } = body;

    console.log(`[ICS Sync] Action: ${action}, FeedId: ${feedId}, UserId: ${userId}`);

    // ===========================================
    // ACTION: sync_feed - Only sync events, NO session creation
    // ===========================================
    if (action === 'sync_feed') {
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

      await supabase
        .from('calendar_ics_feeds')
        .update({ last_sync_status: 'pending' })
        .eq('id', feedId);

      try {
        const fetchUrl = normalizeIcsUrl(feed.ics_url);
        console.log(`[ICS Sync] Fetching ICS from: ${fetchUrl}`);
        const icsContent = await fetchIcs(fetchUrl);
        console.log(`[ICS Sync] Fetched ${icsContent.length} bytes`);

        const events = parseICS(icsContent);
        console.log(`[ICS Sync] Parsed ${events.length} events`);

        const syncFromDate = feed.sync_from_date ? new Date(feed.sync_from_date) : new Date();
        syncFromDate.setMonth(syncFromDate.getMonth() - 1);
        
        // Filter by date first
        let filteredEvents = events.filter(e => e.dtstart >= syncFromDate);
        console.log(`[ICS Sync] ${filteredEvents.length} events after date filter`);
        
        // Filter by import tag if configured
        const importFilterTag = feed.import_filter_tag?.trim();
        if (importFilterTag) {
          const tagLower = importFilterTag.toLowerCase();
          filteredEvents = filteredEvents.filter(e => {
            const summary = (e.summary || '').toLowerCase();
            return summary.includes(tagLower);
          });
          console.log(`[ICS Sync] ${filteredEvents.length} events after tag filter "${importFilterTag}"`);
        }

        const { data: clients } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', feed.user_id)
          .eq('is_archived', false);

        const { data: aliasesData } = await supabase
          .from('client_name_aliases')
          .select('client_id, alias')
          .eq('user_id', feed.user_id);

        const aliasMap = new Map<string, string[]>();
        for (const aliasRow of aliasesData || []) {
          const existing = aliasMap.get(aliasRow.client_id) || [];
          existing.push(aliasRow.alias);
          aliasMap.set(aliasRow.client_id, existing);
        }

        // Check for potential duplicates
        const { data: existingSessions } = await supabase
          .from('training_sessions')
          .select('id, client_id, date')
          .eq('user_id', feed.user_id)
          .gte('date', syncFromDate.toISOString());

        let syncedCount = 0;
        let matchedCount = 0;
        let unmatchedCount = 0;
        let duplicatesCount = 0;

        for (const event of filteredEvents) {
          const { primary, additional } = clients 
            ? findMultipleClientMatches(event.summary, clients, aliasMap, 70)
            : { primary: null, additional: [] };
          
          const allMatches = clients ? findClientMatches(event.summary, clients, aliasMap) : [];
          const suggestions = allMatches.slice(0, 5).map(m => ({
            client_id: m.clientId,
            name: m.clientName,
            score: m.score,
            match_type: m.matchType,
          }));

          const additionalClientIds = additional.map(m => m.clientId);

          // Check for potential duplicate session
          let potentialDuplicateId: string | null = null;
          if (primary && existingSessions) {
            const eventTime = event.dtstart.getTime();
            const thirtyMinutes = 30 * 60 * 1000;
            
            const duplicate = existingSessions.find(s => {
              if (s.client_id !== primary.clientId) return false;
              const sessionTime = new Date(s.date).getTime();
              return Math.abs(sessionTime - eventTime) <= thirtyMinutes;
            });
            
            if (duplicate) {
              potentialDuplicateId = duplicate.id;
              duplicatesCount++;
            }
          }

          // Track match stats
          if (primary) {
            matchedCount++;
          } else {
            unmatchedCount++;
          }

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
              potential_duplicate_session_id: potentialDuplicateId,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'feed_id,ics_uid',
            });

          if (!upsertError) {
            syncedCount++;
            if (potentialDuplicateId) {
              console.log(`[ICS Sync] Event "${event.summary}" has potential duplicate`);
            }
          }
        }

        // Build sync log for UI
        const syncLog = {
          total_in_ics: events.length,
          after_date_filter: events.filter(e => e.dtstart >= syncFromDate).length,
          after_tag_filter: filteredEvents.length,
          matched_clients: matchedCount,
          unmatched: unmatchedCount,
          duplicates_found: duplicatesCount,
          synced_at: new Date().toISOString(),
        };

        await supabase
          .from('calendar_ics_feeds')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'success',
            last_sync_error: null,
            last_sync_log: syncLog,
            events_synced: syncedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', feedId);

        console.log(`[ICS Sync] Successfully synced ${syncedCount} events (NO sessions created)`, syncLog);

        return new Response(
          JSON.stringify({ 
            success: true, 
            events_synced: syncedCount,
            total_events: events.length,
            sync_log: syncLog,
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

    // ===========================================
    // ACTION: learn_alias - Learn from manual assignment
    // ===========================================
    if (action === 'learn_alias') {
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
      
      // Also try to extract name from time pattern
      const extractedName = extractNameFromTimePattern(event.summary);
      if (extractedName) {
        const extractedTokens = normalizeText(extractedName).split(/\s+/);
        tokens.push(...extractedTokens);
      }
      
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

      for (const token of [...new Set(tokens)]) {
        if (clientNameParts.includes(token)) continue;
        if (token.length < 2) continue;
        
        let isKnownNickname = false;
        for (const nicknames of Object.values(CZECH_NICKNAMES)) {
          if (nicknames.map(normalizeText).includes(token)) {
            isKnownNickname = true;
            break;
          }
        }
        if (isKnownNickname) continue;

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

    // ===========================================
    // ACTION: create_approved_sessions - Create sessions ONLY for approved events
    // ===========================================
    if (action === 'create_approved_sessions') {
      // Get events that are approved for import and not yet processed
      const { data: events, error: eventsError } = await supabase
        .from('calendar_ics_events')
        .select(`
          *,
          feed:calendar_ics_feeds(user_id, default_duration)
        `)
        .eq('feed_id', feedId)
        .eq('import_approved', true)
        .eq('is_processed', false)
        .eq('skip_import', false)
        .not('matched_client_id', 'is', null)
        .order('start_at', { ascending: true });

      if (eventsError) {
        return new Response(
          JSON.stringify({ error: 'fetch_failed', details: eventsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let createdCount = 0;
      let skippedDuplicates = 0;

      for (const event of events || []) {
        const feed = event.feed as any;
        
        let duration = feed.default_duration || 60;
        if (event.end_at && event.start_at) {
          const start = new Date(event.start_at);
          const end = new Date(event.end_at);
          duration = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        const allClientIds: string[] = [event.matched_client_id];
        if (event.additional_matched_client_ids && Array.isArray(event.additional_matched_client_ids)) {
          allClientIds.push(...event.additional_matched_client_ids);
        }

        let sessionsCreatedForEvent = 0;
        for (const cId of allClientIds) {
          // Check for existing session by ICS event
          const { data: existingBySource } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('source_ics_event_id', event.id)
            .eq('client_id', cId)
            .maybeSingle();

          if (existingBySource) {
            skippedDuplicates++;
            continue;
          }

          // Check for existing session by time (within 30 min)
          const eventTime = new Date(event.start_at).getTime();
          const thirtyMinutes = 30 * 60 * 1000;
          const startRange = new Date(eventTime - thirtyMinutes).toISOString();
          const endRange = new Date(eventTime + thirtyMinutes).toISOString();

          const { data: existingByTime } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('client_id', cId)
            .gte('date', startRange)
            .lte('date', endRange)
            .maybeSingle();

          if (existingByTime) {
            skippedDuplicates++;
            continue;
          }

          // Create training session
          const { error: sessionError } = await supabase
            .from('training_sessions')
            .insert({
              client_id: cId,
              user_id: feed.user_id,
              date: event.start_at,
              duration,
              status: 'scheduled',
              notes: event.description ? `Z kalendáře: ${event.summary}\n\n${event.description}` : `Z kalendáře: ${event.summary}`,
              source_ics_event_id: event.id,
            });

          if (!sessionError) {
            sessionsCreatedForEvent++;
            createdCount++;
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
          console.log(`[ICS Sync] Created ${sessionsCreatedForEvent} sessions for group event "${event.summary}"`);
        }
      }

      console.log(`[ICS Sync] Created ${createdCount} training sessions, skipped ${skippedDuplicates} duplicates`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sessions_created: createdCount,
          events_processed: events?.length || 0,
          duplicates_skipped: skippedDuplicates,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===========================================
    // ACTION: approve_events - Mark specific events as approved for import
    // ===========================================
    if (action === 'approve_events') {
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'event_ids_required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('calendar_ics_events')
        .update({ 
          import_approved: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', eventIds);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'update_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[ICS Sync] Approved ${eventIds.length} events for import`);

      return new Response(
        JSON.stringify({ success: true, approved_count: eventIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===========================================
    // ACTION: skip_events - Mark specific events to be skipped
    // ===========================================
    if (action === 'skip_events') {
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'event_ids_required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('calendar_ics_events')
        .update({ 
          skip_import: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', eventIds);

      if (error) {
        return new Response(
          JSON.stringify({ error: 'update_failed', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[ICS Sync] Marked ${eventIds.length} events to skip`);

      return new Response(
        JSON.stringify({ success: true, skipped_count: eventIds.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===========================================
    // ACTION: create_sessions_from_events (legacy - for backwards compatibility)
    // ===========================================
    if (action === 'create_sessions_from_events') {
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
        
        let duration = feed.default_duration || 60;
        if (event.end_at && event.start_at) {
          const start = new Date(event.start_at);
          const end = new Date(event.end_at);
          duration = Math.round((end.getTime() - start.getTime()) / 60000);
        }

        const allClientIds: string[] = [event.matched_client_id];
        if (event.additional_matched_client_ids && Array.isArray(event.additional_matched_client_ids)) {
          allClientIds.push(...event.additional_matched_client_ids);
        }

        let sessionsCreatedForEvent = 0;
        for (const cId of allClientIds) {
          const { data: existingSession } = await supabase
            .from('training_sessions')
            .select('id')
            .eq('client_id', cId)
            .eq('date', event.start_at)
            .single();

          if (!existingSession) {
            const { data: session, error: sessionError } = await supabase
              .from('training_sessions')
              .insert({
                client_id: cId,
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

    // ===========================================
    // ACTION: test_url - Test ICS URL validity
    // ===========================================
    if (action === 'test_url') {
      try {
        const fetchUrl = normalizeIcsUrl(icsUrl);
        const content = await fetchIcs(fetchUrl);
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
        const message = error instanceof Error ? error.message : 'Failed to fetch URL';
        return new Response(
          JSON.stringify({ valid: false, error: message }),
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
