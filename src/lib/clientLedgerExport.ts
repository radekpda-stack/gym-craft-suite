/**
 * Client Ledger Export Module
 * 
 * Exports unified financial history (trainings + payments + products) to XLSX
 */
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export type LedgerEntryType = 'training' | 'payment' | 'product' | 'manual' | 'refund';

export interface LedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  description: string;
  amount: number;
  balance: number;
  paymentMethod?: string | null;
  memberName?: string | null; // For group budgets
  trainingSessionId?: string | null;
  productId?: string | null;
  displayAmount?: number; // For showing actual price when amount is 0 (non-credit payments)
}

export interface LedgerExportRow {
  Datum: string;
  Čas: string;
  Typ: string;
  Popis: string;
  Částka: string;
  Zůstatek: string;
  'Způsob platby'?: string;
  Čerpal?: string;
}

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  training: 'Trénink',
  payment: 'Dobití',
  product: 'Produkt',
  manual: 'Korekce',
  refund: 'Vrácení',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit: 'Kredit',
  cash: 'Hotově',
  card: 'Kartou',
  bank: 'Převodem',
  bank_transfer: 'Převodem',
  pending: 'Neuhrazeno',
};

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method] || method;
}

export function formatAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${amount.toLocaleString('cs-CZ')} Kč`;
}

export function formatBalance(balance: number): string {
  return `${balance.toLocaleString('cs-CZ')} Kč`;
}

/**
 * Export ledger entries to XLSX file
 */
export function exportLedgerToXLSX(
  entries: LedgerEntry[],
  clientName: string,
  isGroup: boolean = false
): void {
  // Transform entries to export rows
  const rows: LedgerExportRow[] = entries.map(entry => {
    const date = new Date(entry.date);
    const baseRow: LedgerExportRow = {
      Datum: format(date, 'd.M.yyyy', { locale: cs }),
      Čas: format(date, 'HH:mm', { locale: cs }),
      Typ: TYPE_LABELS[entry.type] || entry.type,
      Popis: entry.description,
      Částka: formatAmount(entry.amount),
      Zůstatek: formatBalance(entry.balance),
      'Způsob platby': formatPaymentMethod(entry.paymentMethod),
    };
    
    if (isGroup && entry.memberName) {
      baseRow['Čerpal'] = entry.memberName;
    }
    
    return baseRow;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const columnWidths = [
    { wch: 12 },  // Datum
    { wch: 8 },   // Čas
    { wch: 12 },  // Typ
    { wch: 40 },  // Popis
    { wch: 14 },  // Částka
    { wch: 14 },  // Zůstatek
    { wch: 14 },  // Způsob platby
  ];
  
  if (isGroup) {
    columnWidths.push({ wch: 20 }); // Čerpal
  }
  
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Finanční historie');

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const safeClientName = clientName.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, '').trim();
  const filename = `finance_${safeClientName}_${dateStr}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
}

/**
 * Export stats interface
 */
export interface LedgerExportStats {
  totalTopUp: number;
  totalSpent: number;
  productCount: number;
}

/**
 * Get the date range label from entries
 */
function getDateRangeLabel(entries: LedgerEntry[]): string {
  if (entries.length === 0) return 'Bez záznamů';
  
  const dates = entries.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
  const oldest = dates[0];
  const newest = dates[dates.length - 1];
  
  return `${format(oldest, 'd.M.yyyy', { locale: cs })} – ${format(newest, 'd.M.yyyy', { locale: cs })}`;
}

/**
 * Get month label in Czech
 */
function getMonthLabel(date: Date): string {
  return format(date, 'LLLL yyyy', { locale: cs }).toUpperCase();
}

/**
 * Export ledger entries to plain text file
 */
export function exportLedgerToTXT(
  entries: LedgerEntry[],
  clientName: string,
  currentBalance: number,
  stats: LedgerExportStats,
  isGroup: boolean = false
): void {
  const separator = '═'.repeat(56);
  const lines: string[] = [];
  
  // Header
  lines.push(separator);
  lines.push(`FINANČNÍ PŘEHLED: ${clientName}`);
  lines.push(`Období: ${getDateRangeLabel(entries)}`);
  lines.push(separator);
  lines.push('');
  
  // Summary
  lines.push('SOUHRN');
  lines.push('------');
  lines.push(`Aktuální zůstatek:   ${currentBalance.toLocaleString('cs-CZ').padStart(10)} Kč`);
  lines.push(`Celkem dobito:       ${stats.totalTopUp.toLocaleString('cs-CZ').padStart(10)} Kč`);
  lines.push(`Celkem čerpáno:      ${stats.totalSpent.toLocaleString('cs-CZ').padStart(10)} Kč`);
  lines.push(`Počet transakcí:     ${entries.length.toString().padStart(10)}`);
  lines.push('');
  lines.push(separator);
  lines.push('DETAILNÍ VÝPIS');
  lines.push(separator);
  lines.push('');
  
  // Group by month
  const byMonth = new Map<string, LedgerEntry[]>();
  entries.forEach(entry => {
    const date = new Date(entry.date);
    const monthKey = format(date, 'yyyy-MM');
    const existing = byMonth.get(monthKey) || [];
    existing.push(entry);
    byMonth.set(monthKey, existing);
  });
  
  // Sort months descending
  const sortedMonths = Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  
  sortedMonths.forEach(([monthKey, monthEntries]) => {
    const monthDate = new Date(`${monthKey}-01`);
    lines.push(getMonthLabel(monthDate));
    lines.push('-'.repeat(getMonthLabel(monthDate).length));
    
    monthEntries.forEach(entry => {
      const date = new Date(entry.date);
      const dateStr = format(date, 'dd.MM.', { locale: cs });
      const timeStr = format(date, 'HH:mm', { locale: cs });
      const amountStr = `${entry.amount >= 0 ? '+' : ''}${entry.amount.toLocaleString('cs-CZ')} Kč`;
      const balanceStr = `${entry.balance.toLocaleString('cs-CZ')} Kč`;
      
      // Format: "15.01. 10:30  Solo trénink         -800 Kč  →  7 700 Kč"
      const descPadded = entry.description.substring(0, 20).padEnd(20);
      const amountPadded = amountStr.padStart(12);
      
      let line = `${dateStr} ${timeStr}  ${descPadded}${amountPadded}  →  ${balanceStr}`;
      
      // Add member name for group budgets
      if (isGroup && entry.memberName) {
        line += `  [${entry.memberName}]`;
      }
      
      lines.push(line);
    });
    
    lines.push('');
  });
  
  // Footer
  lines.push(separator);
  lines.push(`Vygenerováno: ${format(new Date(), "d.M.yyyy HH:mm", { locale: cs })}`);
  lines.push(separator);
  
  // Create file and download
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const safeClientName = clientName.replace(/[^a-zA-Z0-9áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ\s]/g, '').trim();
  const filename = `finance_${safeClientName}_${dateStr}.txt`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(url);
}
