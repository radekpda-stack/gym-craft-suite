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
