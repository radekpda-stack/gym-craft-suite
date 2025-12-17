import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { featureTracker } from '@/hooks/useFeatureTracking';

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
  featureTracker.track('export_transactions_csv', 'export', { count: transactions.length });
  
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
  featureTracker.track('export_transactions_pdf', 'export', { count: transactions.length });
  
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
  featureTracker.track('export_financial_summary_csv', 'export');
  
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
  featureTracker.track('export_financial_summary_pdf', 'export');
  
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

// ============ MEASUREMENTS EXPORT ============

export interface MeasurementExportData {
  id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  basal_metabolism: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  bicep_left: number | null;
  bicep_right: number | null;
  thigh_left: number | null;
  thigh_right: number | null;
  calf_left: number | null;
  calf_right: number | null;
  mental_state: number | null;
  notes: string | null;
}

export interface MeasurementsExportOptions {
  clientName: string;
  measurements: MeasurementExportData[];
}

export function exportMeasurementsToPDF(options: MeasurementsExportOptions) {
  featureTracker.track('export_measurements_pdf', 'export', { count: options.measurements.length });
  
  const { clientName, measurements } = options;
  const doc = new jsPDF();
  
  if (measurements.length === 0) {
    doc.setFontSize(14);
    doc.text('Žádná měření k exportu', 14, 20);
    doc.save(`mereni_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    return;
  }

  const latest = measurements[0];
  const oldest = measurements[measurements.length - 1];
  
  // Title & Header
  doc.setFontSize(20);
  doc.text(`Měření - ${clientName}`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 28);
  doc.text(`Období: ${format(new Date(oldest.date), 'd.M.yyyy', { locale: cs })} - ${format(new Date(latest.date), 'd.M.yyyy', { locale: cs })}`, 14, 34);
  doc.text(`Počet měření: ${measurements.length}`, 14, 40);
  
  // Current Stats Summary
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Aktuální hodnoty', 14, 52);
  
  const formatValue = (val: number | null, unit: string) => val !== null ? `${val} ${unit}` : '-';
  
  const currentStats = [
    ['Váha', formatValue(latest.weight, 'kg')],
    ['Tělesný tuk', formatValue(latest.body_fat_percentage, '%')],
    ['Svalová hmota', formatValue(latest.muscle_mass, 'kg')],
    ['Bazální metabolismus', formatValue(latest.basal_metabolism, 'kcal')],
  ];

  autoTable(doc, {
    body: currentStats,
    startY: 58,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right' }
    },
    theme: 'plain',
  });

  // Progress comparison (if we have more than 1 measurement)
  if (measurements.length > 1) {
    const finalY1 = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(14);
    doc.text('Změny od prvního měření', 14, finalY1 + 12);
    
    const calcChange = (current: number | null, original: number | null) => {
      if (current === null || original === null || original === 0) return '-';
      const diff = current - original;
      const pct = ((diff / original) * 100).toFixed(1);
      const sign = diff > 0 ? '+' : '';
      return `${sign}${diff.toFixed(1)} (${sign}${pct}%)`;
    };
    
    const progressData = [
      ['Váha', formatValue(oldest.weight, 'kg'), formatValue(latest.weight, 'kg'), calcChange(latest.weight, oldest.weight)],
      ['Tělesný tuk', formatValue(oldest.body_fat_percentage, '%'), formatValue(latest.body_fat_percentage, '%'), calcChange(latest.body_fat_percentage, oldest.body_fat_percentage)],
      ['Svalová hmota', formatValue(oldest.muscle_mass, 'kg'), formatValue(latest.muscle_mass, 'kg'), calcChange(latest.muscle_mass, oldest.muscle_mass)],
      ['Bazální metabolismus', formatValue(oldest.basal_metabolism, 'kcal'), formatValue(latest.basal_metabolism, 'kcal'), calcChange(latest.basal_metabolism, oldest.basal_metabolism)],
    ];

    autoTable(doc, {
      head: [['Metrika', 'První měření', 'Poslední měření', 'Změna']],
      body: progressData,
      startY: finalY1 + 18,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
    });
  }

  // Body measurements table
  const finalY2 = (doc as any).lastAutoTable.finalY || 120;
  doc.setFontSize(14);
  doc.text('Obvodové míry (poslední měření)', 14, finalY2 + 12);
  
  const bodyMeasurements = [
    ['Hrudník', formatValue(latest.chest, 'cm')],
    ['Pas', formatValue(latest.waist, 'cm')],
    ['Boky', formatValue(latest.hips, 'cm')],
    ['Biceps L / P', `${latest.bicep_left ?? '-'} / ${latest.bicep_right ?? '-'} cm`],
    ['Stehno L / P', `${latest.thigh_left ?? '-'} / ${latest.thigh_right ?? '-'} cm`],
    ['Lýtko L / P', `${latest.calf_left ?? '-'} / ${latest.calf_right ?? '-'} cm`],
  ];

  autoTable(doc, {
    body: bodyMeasurements,
    startY: finalY2 + 18,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right' }
    },
    theme: 'plain',
  });

  // Full history table - new page
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Historie měření', 14, 20);

  const historyData = measurements.map(m => [
    format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
    m.weight !== null ? `${m.weight}` : '-',
    m.body_fat_percentage !== null ? `${m.body_fat_percentage}` : '-',
    m.muscle_mass !== null ? `${m.muscle_mass}` : '-',
    m.basal_metabolism !== null ? `${m.basal_metabolism}` : '-',
    m.mental_state !== null ? `${m.mental_state}/10` : '-',
  ]);

  autoTable(doc, {
    head: [['Datum', 'Váha (kg)', 'Tuk (%)', 'Svaly (kg)', 'Metab. (kcal)', 'Psychika']],
    body: historyData,
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  // Body measurements history
  const finalY3 = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(14);
  doc.text('Historie obvodových měr', 14, finalY3 + 12);

  const circumferenceHistory = measurements.map(m => [
    format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
    m.chest !== null ? `${m.chest}` : '-',
    m.waist !== null ? `${m.waist}` : '-',
    m.hips !== null ? `${m.hips}` : '-',
    m.bicep_left !== null && m.bicep_right !== null ? `${m.bicep_left}/${m.bicep_right}` : '-',
    m.thigh_left !== null && m.thigh_right !== null ? `${m.thigh_left}/${m.thigh_right}` : '-',
  ]);

  autoTable(doc, {
    head: [['Datum', 'Hrudník', 'Pas', 'Boky', 'Biceps L/P', 'Stehno L/P']],
    body: circumferenceHistory,
    startY: finalY3 + 18,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  // Notes section if any measurement has notes
  const measurementsWithNotes = measurements.filter(m => m.notes);
  if (measurementsWithNotes.length > 0) {
    const finalY4 = (doc as any).lastAutoTable.finalY || 180;
    
    // Check if we need a new page
    if (finalY4 > 240) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Poznámky', 14, 20);
      
      const notesData = measurementsWithNotes.map(m => [
        format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
        m.notes || ''
      ]);

      autoTable(doc, {
        head: [['Datum', 'Poznámka']],
        body: notesData,
        startY: 26,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 158, 11] },
        columnStyles: {
          1: { cellWidth: 140 }
        },
      });
    } else {
      doc.setFontSize(14);
      doc.text('Poznámky', 14, finalY4 + 12);
      
      const notesData = measurementsWithNotes.map(m => [
        format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
        m.notes || ''
      ]);

      autoTable(doc, {
        head: [['Datum', 'Poznámka']],
        body: notesData,
        startY: finalY4 + 18,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [245, 158, 11] },
        columnStyles: {
          1: { cellWidth: 140 }
        },
      });
    }
  }

  doc.save(`mereni_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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

// ============ PROGRESS EXPORT ============

export interface ProgressExportEntry {
  id: string;
  exercise_name: string;
  date: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  is_bodyweight: boolean;
  time_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  is_pr: boolean;
}

export interface ProgressExportOptions {
  clientName: string;
  entries: ProgressExportEntry[];
}

export function exportProgressToCSV(options: ProgressExportOptions) {
  featureTracker.track('export_progress_csv', 'export', { count: options.entries.length });
  
  const { clientName, entries } = options;
  
  const headers = ['Datum', 'Cvik', 'Série', 'Opakování', 'Váha (kg)', 'Čas (s)', 'Tempo', 'PR', 'Poznámka'];
  
  const rows = entries.map(e => [
    format(new Date(e.date), 'd.M.yyyy', { locale: cs }),
    e.exercise_name,
    e.sets.toString(),
    e.reps?.toString() || '-',
    e.is_bodyweight ? 'vlastní' : (e.weight_kg?.toString() || '-'),
    e.time_seconds?.toString() || '-',
    e.tempo || '-',
    e.is_pr ? 'ANO' : '-',
    e.notes || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  downloadFile(csvContent, `progres_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv;charset=utf-8;');
}

export function exportProgressToPDF(options: ProgressExportOptions) {
  featureTracker.track('export_progress_pdf', 'export', { count: options.entries.length });
  
  const { clientName, entries } = options;
  const doc = new jsPDF();

  if (entries.length === 0) {
    doc.setFontSize(14);
    doc.text('Žádné záznamy k exportu', 14, 20);
    doc.save(`progres_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    return;
  }

  // Title & Header
  doc.setFontSize(20);
  doc.text(`Tréninkový progres - ${clientName}`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 28);
  doc.text(`Celkem záznamů: ${entries.length}`, 14, 34);

  // PRs count
  const prsCount = entries.filter(e => e.is_pr).length;
  doc.text(`Osobní rekordy: ${prsCount}`, 14, 40);

  // Group by exercise
  const byExercise = entries.reduce((acc, entry) => {
    if (!acc[entry.exercise_name]) {
      acc[entry.exercise_name] = [];
    }
    acc[entry.exercise_name].push(entry);
    return acc;
  }, {} as Record<string, ProgressExportEntry[]>);

  // Summary table
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Souhrn cviků', 14, 52);

  const summaryData = Object.entries(byExercise).map(([name, exEntries]) => {
    const maxWeight = Math.max(...exEntries.filter(e => e.weight_kg).map(e => e.weight_kg!));
    const hasPR = exEntries.some(e => e.is_pr);
    return [
      name,
      exEntries.length.toString(),
      maxWeight > 0 ? `${maxWeight} kg` : '-',
      hasPR ? '🏆' : '-'
    ];
  });

  autoTable(doc, {
    head: [['Cvik', 'Záznamů', 'Max váha', 'PR']],
    body: summaryData,
    startY: 58,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  // Full history table
  const finalY1 = (doc as any).lastAutoTable.finalY || 100;
  
  if (finalY1 > 200) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Historie výkonů', 14, 20);
  } else {
    doc.setFontSize(14);
    doc.text('Historie výkonů', 14, finalY1 + 15);
  }

  const historyData = entries.slice(0, 50).map(e => [
    format(new Date(e.date), 'd.M.yyyy', { locale: cs }),
    e.exercise_name,
    `${e.sets}×${e.reps || '-'}`,
    e.is_bodyweight ? 'vlastní' : (e.weight_kg ? `${e.weight_kg} kg` : '-'),
    e.is_pr ? '🏆' : '',
    e.notes ? e.notes.substring(0, 30) : ''
  ]);

  autoTable(doc, {
    head: [['Datum', 'Cvik', 'Série×Rep', 'Váha', 'PR', 'Poznámka']],
    body: historyData,
    startY: finalY1 > 200 ? 26 : finalY1 + 21,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  doc.save(`progres_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
