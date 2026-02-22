/**
 * Converts a local datetime string (e.g. from datetime-local input "2026-02-13T07:00")
 * to an ISO string WITH timezone offset, preserving the intended local time.
 * 
 * Uses explicit numeric Date constructor (always local) instead of new Date(string)
 * to avoid browser-specific parsing where "YYYY-MM-DDTHH:mm" can be treated as UTC.
 */
export function toLocalISOString(dateStr: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  
  // Try to parse clean local datetime string directly (from DateTimePicker / datetime-local)
  const localMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  
  if (localMatch) {
    const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr] = localMatch;
    // new Date(y, m, d, h, min, s) ALWAYS uses local timezone — no parsing ambiguity
    const d = new Date(
      parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr),
      parseInt(hourStr), parseInt(minStr), parseInt(secStr || '0')
    );
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    
    // Use the original string parts to guarantee no hour shift
    return `${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}:${secStr || '00'}${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
  }
  
  // Fallback for other formats (ISO with timezone, Date.toString(), etc.)
  const d = new Date(dateStr);
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
}
