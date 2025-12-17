import { format as dateFnsFormat } from 'date-fns';
import { cs } from 'date-fns/locale';

/**
 * Formátování měny v CZK
 * @param amount - Částka k formátování
 * @param showSymbol - Zobrazit symbol Kč (default true)
 * @param decimals - Počet desetinných míst (default 0)
 */
export function formatCurrency(
  amount: number | null | undefined, 
  showSymbol = true,
  decimals = 0
): string {
  const value = amount ?? 0;
  const formatted = value.toLocaleString('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return showSymbol ? `${formatted} Kč` : formatted;
}

/**
 * Formátování procent
 * @param value - Hodnota v procentech
 * @param decimals - Počet desetinných míst (default 0)
 */
export function formatPercent(value: number | null | undefined, decimals = 0): string {
  const v = value ?? 0;
  return `${v.toFixed(decimals)}%`;
}

/**
 * Formátování čísla
 * @param value - Číslo k formátování
 * @param decimals - Počet desetinných míst (default 0)
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  const v = value ?? 0;
  return v.toLocaleString('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type DateFormatType = 'short' | 'long' | 'time' | 'timeOnly' | 'dayMonth' | 'monthYear';

const DATE_FORMATS: Record<DateFormatType, string> = {
  short: 'd. M. yyyy',
  long: 'd. MMMM yyyy',
  time: 'd. M. yyyy HH:mm',
  timeOnly: 'HH:mm',
  dayMonth: 'd. M.',
  monthYear: 'LLLL yyyy',
};

/**
 * Formátování datumu
 * @param date - Datum k formátování
 * @param formatType - Typ formátu (default 'short')
 */
export function formatDate(
  date: Date | string | null | undefined,
  formatType: DateFormatType = 'short'
): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return dateFnsFormat(d, DATE_FORMATS[formatType], { locale: cs });
}

/**
 * Formátování relativního času (např. "před 2 hodinami")
 * @param date - Datum k formátování
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'právě teď';
  if (diffMins < 60) return `před ${diffMins} min`;
  if (diffHours < 24) return `před ${diffHours} hod`;
  if (diffDays < 7) return `před ${diffDays} dny`;
  
  return formatDate(d, 'short');
}

/**
 * Formátování délky trvání (minuty -> čitelný formát)
 * @param minutes - Délka v minutách
 */
export function formatDuration(minutes: number | null | undefined): string {
  const m = minutes ?? 0;
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${hours} hod ${mins} min` : `${hours} hod`;
}

/**
 * Pluralizace českých slov
 * @param count - Počet
 * @param forms - [jednotné, 2-4, 5+] např. ['trénink', 'tréninky', 'tréninků']
 */
export function pluralize(count: number, forms: [string, string, string]): string {
  const absCount = Math.abs(count);
  if (absCount === 1) return forms[0];
  if (absCount >= 2 && absCount <= 4) return forms[1];
  return forms[2];
}

/**
 * Formátování počtu s pluralizací
 * @param count - Počet
 * @param forms - [jednotné, 2-4, 5+]
 */
export function formatCount(count: number, forms: [string, string, string]): string {
  return `${count} ${pluralize(count, forms)}`;
}

// Běžné pluralizační formy
export const PLURAL_FORMS = {
  training: ['trénink', 'tréninky', 'tréninků'] as [string, string, string],
  client: ['klient', 'klienti', 'klientů'] as [string, string, string],
  day: ['den', 'dny', 'dní'] as [string, string, string],
  hour: ['hodina', 'hodiny', 'hodin'] as [string, string, string],
  minute: ['minuta', 'minuty', 'minut'] as [string, string, string],
  sale: ['prodej', 'prodeje', 'prodejů'] as [string, string, string],
  record: ['záznam', 'záznamy', 'záznamů'] as [string, string, string],
};
