import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface TransactionExportData {
  date: string;
  type: string;
  description: string;
  amount: number;
  clientName?: string;
}

export interface FinancialSummaryData {
  totalIncome: number;
  incomeThisMonth: number;
  productIncome: number;
  trainingIncome: number;
  totalCredit: number;
  clientsWithLowCredit: number;
  incomeByMonth: { month: string; income: number; payments: number; products: number }[];
  productBreakdown: { name: string; amount: number; count: number }[];
}

export function exportTransactionsToCSV(transactions: TransactionExportData[], filename: string = 'transakce') {
  const headers = ['Datum', 'Typ', 'Popis', 'Částka (Kč)', 'Klient'];
  
  const rows = transactions.map(t => [
    t.date,
    getTypeLabel(t.type),
    t.description || '',
    t.amount.toString(),
    t.clientName || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile(csvContent, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8;');
}

export function exportTransactionsToPDF(
  transactions: TransactionExportData[],
  title: string = 'Historie transakcí',
  filename: string = 'transakce'
) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 28);
  
  // Table
  const tableData = transactions.map(t => [
    t.date,
    getTypeLabel(t.type),
    t.description || '-',
    `${t.amount >= 0 ? '+' : ''}${t.amount.toLocaleString('cs-CZ')} Kč`,
    t.clientName || '-'
  ]);

  autoTable(doc, {
    head: [['Datum', 'Typ', 'Popis', 'Částka', 'Klient']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportFinancialSummaryToCSV(data: FinancialSummaryData, filename: string = 'financni-prehled') {
  const lines = [
    ['Finanční přehled', format(new Date(), 'd. MMMM yyyy', { locale: cs })],
    [],
    ['Celkové příjmy', `${data.totalIncome.toLocaleString('cs-CZ')} Kč`],
    ['Příjmy tento měsíc', `${data.incomeThisMonth.toLocaleString('cs-CZ')} Kč`],
    ['Příjmy z produktů', `${data.productIncome.toLocaleString('cs-CZ')} Kč`],
    ['Příjmy z tréninků', `${data.trainingIncome.toLocaleString('cs-CZ')} Kč`],
    ['Celkový kredit klientů', `${data.totalCredit.toLocaleString('cs-CZ')} Kč`],
    ['Klienti s nízkým kreditem', data.clientsWithLowCredit.toString()],
    [],
    ['Měsíční přehled'],
    ['Měsíc', 'Platby (Kč)', 'Produkty (Kč)'],
    ...data.incomeByMonth.map(m => [m.month, m.payments.toString(), m.products.toString()]),
    [],
    ['Přehled produktů'],
    ['Produkt', 'Tržby (Kč)', 'Počet prodejů'],
    ...data.productBreakdown.map(p => [p.name, p.amount.toString(), p.count.toString()]),
  ];

  const csvContent = lines.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  downloadFile(csvContent, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8;');
}

export function exportFinancialSummaryToPDF(data: FinancialSummaryData, filename: string = 'financni-prehled') {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Finanční přehled', 14, 20);
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 28);
  
  // Summary section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Souhrn', 14, 42);
  
  const summaryData = [
    ['Celkové příjmy', `${data.totalIncome.toLocaleString('cs-CZ')} Kč`],
    ['Příjmy tento měsíc', `${data.incomeThisMonth.toLocaleString('cs-CZ')} Kč`],
    ['Příjmy z produktů', `${data.productIncome.toLocaleString('cs-CZ')} Kč`],
    ['Příjmy z tréninků', `${data.trainingIncome.toLocaleString('cs-CZ')} Kč`],
    ['Celkový kredit klientů', `${data.totalCredit.toLocaleString('cs-CZ')} Kč`],
    ['Klienti s nízkým kreditem', data.clientsWithLowCredit.toString()],
  ];

  autoTable(doc, {
    body: summaryData,
    startY: 48,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' }
    },
    theme: 'plain',
  });

  // Monthly overview
  const finalY1 = (doc as any).lastAutoTable.finalY || 90;
  doc.setFontSize(14);
  doc.text('Měsíční přehled', 14, finalY1 + 15);

  autoTable(doc, {
    head: [['Měsíc', 'Platby', 'Produkty']],
    body: data.incomeByMonth.map(m => [
      m.month,
      `${m.payments.toLocaleString('cs-CZ')} Kč`,
      `${m.products.toLocaleString('cs-CZ')} Kč`
    ]),
    startY: finalY1 + 21,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  // Product breakdown
  if (data.productBreakdown.length > 0) {
    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(14);
    doc.text('Přehled produktů', 14, finalY2 + 15);

    autoTable(doc, {
      head: [['Produkt', 'Tržby', 'Počet prodejů']],
      body: data.productBreakdown.map(p => [
        p.name,
        `${p.amount.toLocaleString('cs-CZ')} Kč`,
        p.count.toString()
      ]),
      startY: finalY2 + 21,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 158, 11] },
    });
  }

  doc.save(`${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    payment: 'Platba',
    training: 'Trénink',
    product: 'Produkt',
    adjustment: 'Úprava',
  };
  return labels[type] || type;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
