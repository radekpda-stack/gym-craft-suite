/**
 * Converts a local datetime string (e.g. from datetime-local input "2026-02-13T07:00")
 * to an ISO string WITH timezone offset, preserving the intended local time.
 * 
 * This avoids the common bug where toISOString() shifts time to UTC,
 * causing Supabase to interpret it differently when reading back.
 */
export function toLocalISOString(dateStr: string): string {
  const d = new Date(dateStr);
  const offset = -d.getTimezoneOffset(); // in minutes, positive = ahead of UTC
  const sign = offset >= 0 ? '+' : '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  const absOffset = Math.abs(offset);
  
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(absOffset / 60))}:${pad(absOffset % 60)}`;
}
