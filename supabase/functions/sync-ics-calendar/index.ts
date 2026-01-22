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

// ============================================
// RRULE SUPPORT - Types and Interfaces
// ============================================

interface ParsedEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend?: Date;
  location?: string;
  rrule?: string;
  exdates?: Date[];
}

interface ExpandedEvent extends ParsedEvent {
  masterEventUid?: string;
  recurrenceInstanceDate?: string; // YYYY-MM-DD
  isRecurringInstance: boolean;
}

interface RRuleParams {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  byday?: string[];
  bymonthday?: number[];
  until?: Date;
  count?: number;
}

// ============================================
// RRULE PARSER
// ============================================

function parseRRule(rruleString: string): RRuleParams | null {
  if (!rruleString) return null;
  
  const params: Partial<RRuleParams> = {
    interval: 1,
  };
  
  const parts = rruleString.split(';');
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    
    switch (key.toUpperCase()) {
      case 'FREQ':
        if (['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value.toUpperCase())) {
          params.freq = value.toUpperCase() as RRuleParams['freq'];
        }
        break;
      case 'INTERVAL':
        params.interval = parseInt(value, 10) || 1;
        break;
      case 'BYDAY':
        params.byday = value.split(',').map(d => d.trim().toUpperCase());
        break;
      case 'BYMONTHDAY':
        params.bymonthday = value.split(',').map(d => parseInt(d.trim(), 10));
        break;
      case 'UNTIL':
        params.until = parseICSDateSimple(value);
        break;
      case 'COUNT':
        params.count = parseInt(value, 10);
        break;
    }
  }
  
  if (!params.freq) return null;
  return params as RRuleParams;
}

function parseICSDateSimple(value: string): Date {
  const cleanValue = value.replace('Z', '');
  if (cleanValue.length === 8) {
    const year = parseInt(cleanValue.substring(0, 4));
    const month = parseInt(cleanValue.substring(4, 6)) - 1;
    const day = parseInt(cleanValue.substring(6, 8));
    return new Date(year, month, day, 23, 59, 59);
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

function parseExdates(exdateString: string): Date[] {
  if (!exdateString) return [];
  return exdateString.split(',').map(d => parseICSDateSimple(d.trim()));
}

// Map BYDAY values to day of week (0 = Sunday, 6 = Saturday)
const BYDAY_MAP: Record<string, number> = {
  'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
};

function getNextOccurrence(current: Date, rrule: RRuleParams, originalDate: Date): Date | null {
  const next = new Date(current);
  
  switch (rrule.freq) {
    case 'DAILY':
      next.setDate(next.getDate() + rrule.interval);
      break;
      
    case 'WEEKLY':
      if (rrule.byday && rrule.byday.length > 0) {
        // Find next matching day of week
        const targetDays = rrule.byday.map(d => {
          // Handle prefixed days like "2MO" (second Monday)
          const match = d.match(/^(-?\d)?([A-Z]{2})$/);
          if (match) {
            return BYDAY_MAP[match[2]] ?? -1;
          }
          return BYDAY_MAP[d] ?? -1;
        }).filter(d => d >= 0);
        
        if (targetDays.length === 0) {
          next.setDate(next.getDate() + 7 * rrule.interval);
        } else {
          let found = false;
          for (let i = 1; i <= 7 * rrule.interval + 7; i++) {
            const testDate = new Date(current);
            testDate.setDate(testDate.getDate() + i);
            if (targetDays.includes(testDate.getDay())) {
              next.setTime(testDate.getTime());
              found = true;
              break;
            }
          }
          if (!found) {
            next.setDate(next.getDate() + 7 * rrule.interval);
          }
        }
      } else {
        next.setDate(next.getDate() + 7 * rrule.interval);
      }
      break;
      
    case 'MONTHLY':
      if (rrule.bymonthday && rrule.bymonthday.length > 0) {
        // Use specific day of month
        const targetDay = rrule.bymonthday[0];
        next.setMonth(next.getMonth() + rrule.interval);
        next.setDate(Math.min(targetDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      } else {
        next.setMonth(next.getMonth() + rrule.interval);
      }
      break;
      
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + rrule.interval);
      break;
  }
  
  return next;
}

function isExcluded(date: Date, exdates: Date[]): boolean {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return exdates.some(ex => {
    const exStr = `${ex.getFullYear()}-${String(ex.getMonth() + 1).padStart(2, '0')}-${String(ex.getDate()).padStart(2, '0')}`;
    return dateStr === exStr;
  });
}

// ============================================
// EVENT EXPANSION
// ============================================

function expandRecurringEvents(
  events: ParsedEvent[], 
  fromDate: Date, 
  toDate: Date,
  maxInstancesPerEvent: number = 50
): ExpandedEvent[] {
  const expanded: ExpandedEvent[] = [];
  
  for (const event of events) {
    if (!event.rrule) {
      // Non-recurring event - only add if in range
      if (event.dtstart >= fromDate && event.dtstart <= toDate) {
        expanded.push({
          ...event,
          isRecurringInstance: false,
        });
      }
      continue;
    }
    
    // Parse RRULE
    const rrule = parseRRule(event.rrule);
    if (!rrule) {
      // Invalid RRULE - treat as single event
      if (event.dtstart >= fromDate && event.dtstart <= toDate) {
        expanded.push({
          ...event,
          isRecurringInstance: false,
        });
      }
      continue;
    }
    
    // Calculate event duration for maintaining end time
    const eventDuration = event.dtend ? event.dtend.getTime() - event.dtstart.getTime() : 60 * 60 * 1000;
    
    // Generate instances
    let current = new Date(event.dtstart);
    let instanceCount = 0;
    
    // If the original event is before fromDate, fast-forward to the first occurrence in range
    while (current < fromDate && instanceCount < 1000) {
      const next = getNextOccurrence(current, rrule, event.dtstart);
      if (!next || (rrule.until && next > rrule.until)) break;
      current = next;
      instanceCount++;
    }
    
    // Reset counter for actual instances
    instanceCount = 0;
    
    while (current <= toDate && instanceCount < maxInstancesPerEvent) {
      // Check UNTIL constraint
      if (rrule.until && current > rrule.until) break;
      
      // Check COUNT constraint (approximate - we start from first in range)
      if (rrule.count && instanceCount >= rrule.count) break;
      
      // Check if this date is excluded
      if (!isExcluded(current, event.exdates || [])) {
        // Only add if in the desired range
        if (current >= fromDate) {
          const instanceDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
          const instanceUid = `${event.uid}-${instanceDate.replace(/-/g, '')}`;
          
          expanded.push({
            uid: instanceUid,
            summary: event.summary,
            description: event.description,
            dtstart: new Date(current),
            dtend: new Date(current.getTime() + eventDuration),
            location: event.location,
            rrule: event.rrule,
            exdates: event.exdates,
            masterEventUid: event.uid,
            recurrenceInstanceDate: instanceDate,
            isRecurringInstance: true,
          });
        }
      }
      
      instanceCount++;
      const next = getNextOccurrence(current, rrule, event.dtstart);
      if (!next) break;
      current = next;
    }
  }
  
  // Sort by start time
  expanded.sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());
  
  return expanded;
}

// ============================================
// ICS PARSER - Extended with RRULE support
// ============================================

function parseICS(icsContent: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  // Unfold long lines (RFC 5545: lines continued with space/tab)
  const lines = icsContent.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').split('\n');
  let currentEvent: any = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = { exdates: [] };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart) {
        events.push({
          uid: currentEvent.uid,
          summary: currentEvent.summary || 'Untitled',
          description: currentEvent.description,
          dtstart: currentEvent.dtstart,
          dtend: currentEvent.dtend,
          location: currentEvent.location,
          rrule: currentEvent.rrule,
          exdates: currentEvent.exdates.length > 0 ? currentEvent.exdates : undefined,
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
        case 'RRULE':
          currentEvent.rrule = value;
          break;
        case 'EXDATE':
          // EXDATE can appear multiple times or contain comma-separated values
          const parsedExdates = parseExdates(value);
          currentEvent.exdates.push(...parsedExdates);
          break;
      }
    }
  }

  return events;
}

// Get timezone offset in hours for common European timezones
function getTimezoneOffset(tzid: string, date: Date): number {
  // Simplified DST calculation for Europe/Prague (CET/CEST)
  // DST starts last Sunday of March at 2:00, ends last Sunday of October at 3:00
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  // Find last Sunday of March
  const marchLast = new Date(year, 2, 31);
  const dstStart = 31 - ((marchLast.getDay() + 7) % 7);
  
  // Find last Sunday of October
  const octoberLast = new Date(year, 9, 31);
  const dstEnd = 31 - ((octoberLast.getDay() + 7) % 7);
  
  // Check if we're in DST period
  const isDST = (month > 2 && month < 9) || // April to September
    (month === 2 && day >= dstStart) || // After DST start in March
    (month === 9 && day < dstEnd); // Before DST end in October
  
  const tzLower = tzid.toLowerCase();
  
  // Handle common European timezones
  if (tzLower.includes('prague') || tzLower.includes('europe/prague') || 
      tzLower.includes('cet') || tzLower.includes('cest') ||
      tzLower.includes('berlin') || tzLower.includes('paris') ||
      tzLower.includes('amsterdam') || tzLower.includes('vienna') ||
      tzLower.includes('warsaw') || tzLower.includes('budapest') ||
      tzLower.includes('bratislava') || tzLower.includes('central european')) {
    return isDST ? 2 : 1; // CEST = UTC+2, CET = UTC+1
  }
  
  // Handle UTC/GMT
  if (tzLower === 'utc' || tzLower === 'gmt' || tzLower === 'z') {
    return 0;
  }
  
  // Default to CET for unknown European timezones
  return isDST ? 2 : 1;
}

function parseICSDate(value: string, keyPart: string): Date {
  const cleanValue = value.replace('Z', '');
  
  // Extract TZID from keyPart like "DTSTART;TZID=Europe/Prague"
  let tzid: string | null = null;
  const tzidMatch = keyPart.match(/TZID=([^;:]+)/i);
  if (tzidMatch) {
    tzid = tzidMatch[1];
  }
  
  if (cleanValue.length === 8) {
    // All-day event (date only, no time)
    const year = parseInt(cleanValue.substring(0, 4));
    const month = parseInt(cleanValue.substring(4, 6)) - 1;
    const day = parseInt(cleanValue.substring(6, 8));
    return new Date(Date.UTC(year, month, day, 0, 0, 0));
  } else if (cleanValue.length >= 15) {
    const year = parseInt(cleanValue.substring(0, 4));
    const month = parseInt(cleanValue.substring(4, 6)) - 1;
    const day = parseInt(cleanValue.substring(6, 8));
    const hour = parseInt(cleanValue.substring(9, 11));
    const minute = parseInt(cleanValue.substring(11, 13));
    const second = parseInt(cleanValue.substring(13, 15));
    
    // If ends with Z, it's already UTC
    if (value.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    
    // If we have a TZID, convert from that timezone to UTC
    if (tzid) {
      const tempDate = new Date(year, month, day);
      const offsetHours = getTimezoneOffset(tzid, tempDate);
      // Subtract the offset to convert local time to UTC
      return new Date(Date.UTC(year, month, day, hour - offsetHours, minute, second));
    }
    
    // No timezone info - assume it's already in local timezone (Europe/Prague)
    // This handles Apple Calendar exports without explicit TZID
    const tempDate = new Date(year, month, day);
    const offsetHours = getTimezoneOffset('Europe/Prague', tempDate);
    return new Date(Date.UTC(year, month, day, hour - offsetHours, minute, second));
  }
  
  return new Date(value);
}

// Declare EdgeRuntime type for TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
} | undefined;

// Shared helper function to process events
async function processEvents(
  supabase: any,
  feedId: string,
  userId: string,
  expandedEvents: ExpandedEvent[],
  totalRawEvents: number,
  recurringCount: number,
  syncHorizonMonths: number,
  fromDate: Date,
  toDate: Date
): Promise<{
  success: boolean;
  events_synced: number;
  total_events: number;
  recurring_events: number;
  recurring_instances: number;
  sync_log: any;
}> {
  // Performance mode: for large syncs, skip client matching but STILL do duplicate detection
  const fastMode = expandedEvents.length > 200;

  let clients: Array<{ id: string; name: string }> | null = null;
  let aliasMap = new Map<string, string[]>();
  
  // Always fetch existing sessions for duplicate detection - this is critical to prevent duplicates!
  // Build a time-based lookup map for efficient duplicate detection
  const { data: existingSessionsData } = await supabase
    .from('training_sessions')
    .select('id, client_id, date')
    .eq('user_id', userId)
    .gte('date', fromDate.toISOString())
    .lte('date', toDate.toISOString())
    .order('date', { ascending: true });
  
  const existingSessions = existingSessionsData || [];
  
  // Create a time-based map for quick duplicate lookup (within 30 min window)
  // Key: rounded timestamp (to 30-min intervals), Value: array of sessions in that window
  const sessionTimeMap = new Map<number, Array<{ id: string; client_id: string; date: string }>>();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  
  for (const session of existingSessions) {
    const sessionTime = new Date(session.date).getTime();
    const roundedTime = Math.floor(sessionTime / THIRTY_MINUTES) * THIRTY_MINUTES;
    
    // Add to current and adjacent time slots for fuzzy matching
    for (const slot of [roundedTime - THIRTY_MINUTES, roundedTime, roundedTime + THIRTY_MINUTES]) {
      const existing = sessionTimeMap.get(slot) || [];
      existing.push(session);
      sessionTimeMap.set(slot, existing);
    }
  }
  
  console.log(`[ICS Sync] Loaded ${existingSessions.length} existing sessions for duplicate detection`);

  if (!fastMode) {
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_archived', false);
    clients = clientsData || null;

    const { data: aliasesData } = await supabase
      .from('client_name_aliases')
      .select('client_id, alias')
      .eq('user_id', userId);

    aliasMap = new Map<string, string[]>();
    for (const aliasRow of aliasesData || []) {
      const existing = aliasMap.get(aliasRow.client_id) || [];
      existing.push(aliasRow.alias);
      aliasMap.set(aliasRow.client_id, existing);
    }
  }

  let syncedCount = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let duplicatesCount = 0;
  let recurringInstancesCount = 0;

  // Process events in batches to avoid CPU timeout
  const BATCH_SIZE = 50;
  const eventBatches: ExpandedEvent[][] = [];
  for (let i = 0; i < expandedEvents.length; i += BATCH_SIZE) {
    eventBatches.push(expandedEvents.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[ICS Sync] Processing ${expandedEvents.length} events in ${eventBatches.length} batches of ${BATCH_SIZE} (fastMode=${fastMode})`
  );

  for (const batch of eventBatches) {
    const eventsToUpsert: any[] = [];
    
    for (const event of batch) {
      if (event.isRecurringInstance) recurringInstancesCount++;

      if (fastMode) {
        // Fast mode: skip client matching but STILL detect duplicates by time
        // This uses the efficient time-based lookup map
        const eventTime = event.dtstart.getTime();
        const roundedTime = Math.floor(eventTime / THIRTY_MINUTES) * THIRTY_MINUTES;
        const potentialSessions = sessionTimeMap.get(roundedTime) || [];
        
        // Find any session within 30 minutes of this event (regardless of client)
        // We'll show these as potential duplicates for manual review
        let potentialDuplicateId: string | null = null;
        for (const session of potentialSessions) {
          const sessionTime = new Date(session.date).getTime();
          if (Math.abs(sessionTime - eventTime) <= THIRTY_MINUTES) {
            potentialDuplicateId = session.id;
            duplicatesCount++;
            break;
          }
        }

        eventsToUpsert.push({
          feed_id: feedId,
          ics_uid: event.uid,
          summary: event.summary,
          description: event.description,
          start_at: event.dtstart.toISOString(),
          end_at: event.dtend?.toISOString() || null,
          location: event.location || null,
          matched_client_id: null,
          additional_matched_client_ids: null,
          match_suggestions: null,
          potential_duplicate_session_id: potentialDuplicateId,
          rrule: event.rrule || null,
          master_event_uid: event.masterEventUid || null,
          recurrence_instance_date: event.recurrenceInstanceDate || null,
          updated_at: new Date().toISOString(),
        });
        continue;
      }

      // Full (small) sync: do matching + suggestions + duplicates
      const { primary, additional } = clients
        ? findMultipleClientMatches(event.summary, clients, aliasMap, 70)
        : { primary: null, additional: [] };

      const allMatches = clients ? findClientMatches(event.summary, clients, aliasMap) : [];
      const suggestions = allMatches.slice(0, 3).map((m) => ({
        client_id: m.clientId,
        name: m.clientName,
        score: m.score,
        match_type: m.matchType,
      }));

      const additionalClientIds = additional.map((m) => m.clientId);

      let potentialDuplicateId: string | null = null;
      if (primary) {
        // Use efficient time-based lookup for duplicate detection
        const eventTime = event.dtstart.getTime();
        const roundedTime = Math.floor(eventTime / THIRTY_MINUTES) * THIRTY_MINUTES;
        const potentialSessions = sessionTimeMap.get(roundedTime) || [];
        
        // Find session for this specific client within 30 minutes
        for (const session of potentialSessions) {
          if (session.client_id !== primary.clientId) continue;
          const sessionTime = new Date(session.date).getTime();
          if (Math.abs(sessionTime - eventTime) <= THIRTY_MINUTES) {
            potentialDuplicateId = session.id;
            duplicatesCount++;
            break;
          }
        }
      }

      if (primary) matchedCount++;
      else unmatchedCount++;

      eventsToUpsert.push({
        feed_id: feedId,
        ics_uid: event.uid,
        summary: event.summary,
        description: event.description,
        start_at: event.dtstart.toISOString(),
        end_at: event.dtend?.toISOString() || null,
        location: event.location || null,
        matched_client_id: primary?.clientId || null,
        additional_matched_client_ids: additionalClientIds,
        match_suggestions: suggestions.length > 0 ? suggestions : null,
        potential_duplicate_session_id: potentialDuplicateId,
        rrule: event.rrule || null,
        master_event_uid: event.masterEventUid || null,
        recurrence_instance_date: event.recurrenceInstanceDate || null,
        updated_at: new Date().toISOString(),
      });
    }

    const { error: upsertError } = await supabase
      .from('calendar_ics_events')
      .upsert(eventsToUpsert, { onConflict: 'feed_id,ics_uid' });

    if (!upsertError) {
      syncedCount += eventsToUpsert.length;
    } else {
      console.error(`[ICS Sync] Batch upsert error:`, upsertError);
    }
  }

  const syncLog = {
    total_in_ics: totalRawEvents,
    recurring_events: recurringCount,
    expanded_instances: expandedEvents.length,
    recurring_instances: recurringInstancesCount,
    after_tag_filter: expandedEvents.length,
    matched_clients: matchedCount,
    unmatched: unmatchedCount,
    duplicates_found: duplicatesCount,
    synced_at: new Date().toISOString(),
    sync_from: fromDate.toISOString(),
    sync_to: toDate.toISOString(),
    sync_horizon_months: syncHorizonMonths,
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

  console.log(`[ICS Sync] Successfully synced ${syncedCount} events`);

  return {
    success: true,
    events_synced: syncedCount,
    total_events: totalRawEvents,
    recurring_events: recurringCount,
    recurring_instances: recurringInstancesCount,
    sync_log: syncLog,
  };
}

// Background processing wrapper
async function processEventsInBackground(
  supabase: any,
  feedId: string,
  userId: string,
  expandedEvents: ExpandedEvent[],
  totalRawEvents: number,
  recurringCount: number,
  syncHorizonMonths: number,
  fromDate: Date,
  toDate: Date
): Promise<void> {
  await processEvents(
    supabase,
    feedId,
    userId,
    expandedEvents,
    totalRawEvents,
    recurringCount,
    syncHorizonMonths,
    fromDate,
    toDate
  );
}

// Synchronous processing wrapper
async function processEventsSynchronously(
  supabase: any,
  feedId: string,
  userId: string,
  expandedEvents: ExpandedEvent[],
  totalRawEvents: number,
  recurringCount: number,
  syncHorizonMonths: number,
  fromDate: Date,
  toDate: Date
): Promise<{
  success: boolean;
  events_synced: number;
  total_events: number;
  recurring_events: number;
  recurring_instances: number;
  sync_log: any;
}> {
  return processEvents(
    supabase,
    feedId,
    userId,
    expandedEvents,
    totalRawEvents,
    recurringCount,
    syncHorizonMonths,
    fromDate,
    toDate
  );
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

        const rawEvents = parseICS(icsContent);
        console.log(`[ICS Sync] Parsed ${rawEvents.length} raw events`);

        // Calculate sync horizon
        const now = new Date();
        const syncHorizonMonths = feed.sync_horizon_months || 3;
        const toDate = new Date(now);
        toDate.setMonth(toDate.getMonth() + syncHorizonMonths);
        
        console.log(`[ICS Sync] Sync window: ${now.toISOString()} to ${toDate.toISOString()} (${syncHorizonMonths} months)`);

        // Count events with RRULE
        const recurringCount = rawEvents.filter(e => e.rrule).length;
        console.log(`[ICS Sync] Found ${recurringCount} recurring events with RRULE`);

        // Expand recurring events to individual instances
        let expandedEvents = expandRecurringEvents(rawEvents, now, toDate);
        console.log(`[ICS Sync] Expanded to ${expandedEvents.length} event instances`);
        
        // Filter by import tag if configured
        const importFilterTag = feed.import_filter_tag?.trim();
        if (importFilterTag) {
          const tagLower = importFilterTag.toLowerCase();
          expandedEvents = expandedEvents.filter(e => {
            const summary = (e.summary || '').toLowerCase();
            return summary.includes(tagLower);
          });
          console.log(`[ICS Sync] ${expandedEvents.length} events after tag filter "${importFilterTag}"`);
        }

        // For large event counts, use background processing
        const eventCount = expandedEvents.length;
        const isLargeSync = eventCount > 200;
        
        if (isLargeSync) {
          console.log(`[ICS Sync] Large sync detected (${eventCount} events), using background processing`);
          
          // Mark as syncing
          await supabase
            .from('calendar_ics_feeds')
            .update({
              last_sync_status: 'syncing',
              last_sync_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', feedId);
          
          // Process in background
          const backgroundTask = async () => {
            try {
              await processEventsInBackground(
                supabase, 
                feedId, 
                feed.user_id, 
                expandedEvents, 
                rawEvents.length, 
                recurringCount,
                syncHorizonMonths,
                now,
                toDate
              );
            } catch (bgError) {
              console.error('[ICS Sync] Background task error:', bgError);
              await supabase
                .from('calendar_ics_feeds')
                .update({
                  last_sync_status: 'error',
                  last_sync_error: bgError instanceof Error ? bgError.message : 'Background processing failed',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', feedId);
            }
          };
          
          // Use EdgeRuntime.waitUntil if available, otherwise just start the task
          if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            EdgeRuntime.waitUntil(backgroundTask());
          } else {
            // Fallback - start task but don't await
            backgroundTask();
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              processing: 'background',
              message: `Syncing ${eventCount} events in background. Check back in a few moments.`,
              events_found: eventCount,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For smaller syncs, process immediately
        const result = await processEventsSynchronously(
          supabase, 
          feedId, 
          feed.user_id, 
          expandedEvents, 
          rawEvents.length, 
          recurringCount,
          syncHorizonMonths,
          now,
          toDate
        );

        return new Response(
          JSON.stringify(result),
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

      // Tags and markers that should NEVER be learned as aliases
      const forbiddenAliases = ['#tr', 'tr', '#trenink', 'trenink', '#training', 'training', 
                                '#cviceni', 'cviceni', '#workout', 'workout', 'platit', 'zaplaceno'];
      
      for (const token of [...new Set(tokens)]) {
        if (clientNameParts.includes(token)) continue;
        if (token.length < 2) continue;
        
        // Skip forbidden tags/markers
        if (forbiddenAliases.includes(token.toLowerCase())) continue;
        // Skip tokens starting with # (hashtags)
        if (token.startsWith('#')) continue;
        
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
          const { data: newSession, error: sessionError } = await supabase
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
            .select('id')
            .single();

          if (!sessionError && newSession) {
            sessionsCreatedForEvent++;
            createdCount++;
            
            // Link the training session back to the ICS event
            await supabase
              .from('calendar_ics_events')
              .update({ training_session_id: newSession.id })
              .eq('id', event.id);
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
    // ACTION: rematch_clients - Run client matching on unmatched events
    // ===========================================
    if (action === 'rematch_clients') {
      const { data: feed, error: feedError } = await supabase
        .from('calendar_ics_feeds')
        .select('user_id')
        .eq('id', feedId)
        .single();

      if (feedError || !feed) {
        return new Response(
          JSON.stringify({ error: 'feed_not_found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get unmatched events for this feed
      const { data: unmatchedEvents, error: eventsError } = await supabase
        .from('calendar_ics_events')
        .select('id, summary')
        .eq('feed_id', feedId)
        .is('matched_client_id', null)
        .eq('is_processed', false)
        .eq('skip_import', false);

      if (eventsError) {
        return new Response(
          JSON.stringify({ error: 'fetch_events_failed', details: eventsError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!unmatchedEvents || unmatchedEvents.length === 0) {
        return new Response(
          JSON.stringify({ success: true, matched_count: 0, message: 'No unmatched events' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', feed.user_id)
        .eq('is_archived', false);

      const clients = clientsData || [];

      // Fetch aliases
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

      let matchedCount = 0;
      const BATCH_SIZE = 50;

      console.log(`[ICS Sync] Re-matching ${unmatchedEvents.length} unmatched events`);

      for (let i = 0; i < unmatchedEvents.length; i += BATCH_SIZE) {
        const batch = unmatchedEvents.slice(i, i + BATCH_SIZE);
        
        for (const event of batch) {
          const { primary, additional } = findMultipleClientMatches(event.summary, clients, aliasMap, 70);
          const allMatches = findClientMatches(event.summary, clients, aliasMap);
          const suggestions = allMatches.slice(0, 3).map((m) => ({
            client_id: m.clientId,
            name: m.clientName,
            score: m.score,
            match_type: m.matchType,
          }));

          if (primary || suggestions.length > 0) {
            const additionalClientIds = additional.map((m) => m.clientId);

            await supabase
              .from('calendar_ics_events')
              .update({
                matched_client_id: primary?.clientId || null,
                additional_matched_client_ids: additionalClientIds.length > 0 ? additionalClientIds : null,
                match_suggestions: suggestions.length > 0 ? suggestions : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', event.id);

            if (primary) matchedCount++;
          }
        }
      }

      console.log(`[ICS Sync] Re-matched ${matchedCount} events`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          matched_count: matchedCount,
          total_unmatched: unmatchedEvents.length,
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
