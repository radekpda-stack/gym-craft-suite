import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Measurement } from '@/hooks/useMeasurements';

export interface ExportMeasurement {
  id: string;
  date: string;
  weight: number | null;
  body_fat_percentage: number | null;
  muscle_mass: number | null;
  basal_metabolism: number | null;
  visceral_fat?: number | null;
  notes?: string | null;
}

export interface MeasurementWithTrend extends ExportMeasurement {
  trends?: {
    weight?: 'better' | 'worse' | 'stagnation';
    body_fat?: 'better' | 'worse' | 'stagnation';
    muscle_mass?: 'better' | 'worse' | 'stagnation';
    metabolism?: 'better' | 'worse' | 'stagnation';
    visceral_fat?: 'better' | 'worse' | 'stagnation';
  };
}

// Calculate trends based on measurement changes
export function calculateTrends(measurements: ExportMeasurement[]): MeasurementWithTrend[] {
  return measurements.map((m, index) => {
    if (index === measurements.length - 1) {
      // First measurement (oldest), no trend
      return { ...m, trends: {} };
    }

    const prev = measurements[index + 1];
    const trends: MeasurementWithTrend['trends'] = {};

    // Weight: lower is generally better
    if (m.weight !== null && prev.weight !== null) {
      const diff = m.weight - prev.weight;
      trends.weight = Math.abs(diff) < 0.5 ? 'stagnation' : diff < 0 ? 'better' : 'worse';
    }

    // Body fat: lower is better
    if (m.body_fat_percentage !== null && prev.body_fat_percentage !== null) {
      const diff = m.body_fat_percentage - prev.body_fat_percentage;
      trends.body_fat = Math.abs(diff) < 0.5 ? 'stagnation' : diff < 0 ? 'better' : 'worse';
    }

    // Muscle mass: higher is better
    if (m.muscle_mass !== null && prev.muscle_mass !== null) {
      const diff = m.muscle_mass - prev.muscle_mass;
      trends.muscle_mass = Math.abs(diff) < 0.3 ? 'stagnation' : diff > 0 ? 'better' : 'worse';
    }

    // Metabolism: higher is generally better
    if (m.basal_metabolism !== null && prev.basal_metabolism !== null) {
      const diff = m.basal_metabolism - prev.basal_metabolism;
      trends.metabolism = Math.abs(diff) < 20 ? 'stagnation' : diff > 0 ? 'better' : 'worse';
    }

    // Visceral fat: lower is better
    if (m.visceral_fat !== null && prev.visceral_fat !== null) {
      const diff = m.visceral_fat - prev.visceral_fat;
      trends.visceral_fat = diff === 0 ? 'stagnation' : diff < 0 ? 'better' : 'worse';
    }

    return { ...m, trends };
  });
}

function getTrendSymbol(trend?: 'better' | 'worse' | 'stagnation'): string {
  switch (trend) {
    case 'better': return '↑ lepší';
    case 'worse': return '↓ horší';
    case 'stagnation': return '→ stagnace';
    default: return '-';
  }
}

function getTrendArrow(trend?: 'better' | 'worse' | 'stagnation'): string {
  switch (trend) {
    case 'better': return '↑';
    case 'worse': return '↓';
    case 'stagnation': return '→';
    default: return '';
  }
}

// Export to CSV
export function exportMeasurementsToCSV(
  clientName: string,
  measurements: ExportMeasurement[]
) {
  const withTrends = calculateTrends(measurements);
  
  const headers = [
    'Datum',
    'Váha (kg)',
    'Trend váhy',
    'Tělesný tuk (%)',
    'Trend tuku',
    'Svalová hmota (kg)',
    'Trend svalů',
    'Bazální metabolismus (kcal)',
    'Trend metabolismu',
    'Viscerální tuk',
    'Trend visc. tuku',
  ];

  const rows = withTrends.map(m => [
    format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
    m.weight?.toString() ?? '',
    getTrendSymbol(m.trends?.weight),
    m.body_fat_percentage?.toString() ?? '',
    getTrendSymbol(m.trends?.body_fat),
    m.muscle_mass?.toString() ?? '',
    getTrendSymbol(m.trends?.muscle_mass),
    m.basal_metabolism?.toString() ?? '',
    getTrendSymbol(m.trends?.metabolism),
    m.visceral_fat?.toString() ?? '',
    getTrendSymbol(m.trends?.visceral_fat),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mereni_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export to XLSX
export function exportMeasurementsToXLSX(
  clientName: string,
  measurements: ExportMeasurement[]
) {
  const withTrends = calculateTrends(measurements);

  const data = withTrends.map(m => ({
    'Datum': format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
    'Váha (kg)': m.weight ?? '',
    'Trend': getTrendArrow(m.trends?.weight),
    'Tělesný tuk (%)': m.body_fat_percentage ?? '',
    'Trend ': getTrendArrow(m.trends?.body_fat),
    'Svalová hmota (kg)': m.muscle_mass ?? '',
    'Trend  ': getTrendArrow(m.trends?.muscle_mass),
    'Baz. metabolismus (kcal)': m.basal_metabolism ?? '',
    'Trend   ': getTrendArrow(m.trends?.metabolism),
    'Viscerální tuk': m.visceral_fat ?? '',
    'Trend    ': getTrendArrow(m.trends?.visceral_fat),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Měření');

  // Auto-size columns
  const colWidths = [
    { wch: 12 }, // Datum
    { wch: 10 }, // Váha
    { wch: 6 },  // Trend
    { wch: 14 }, // Tuk
    { wch: 6 },  // Trend
    { wch: 16 }, // Svaly
    { wch: 6 },  // Trend
    { wch: 20 }, // Metabolismus
    { wch: 6 },  // Trend
    { wch: 14 }, // Visc
    { wch: 6 },  // Trend
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `mereni_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// Export to PDF with trends
export function exportMeasurementsWithTrendsToPDF(
  clientName: string,
  measurements: ExportMeasurement[]
) {
  const withTrends = calculateTrends(measurements);
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(`Měření - ${clientName}`, 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 28);
  doc.text(`Počet měření: ${measurements.length}`, 14, 34);

  // Summary of latest
  if (measurements.length > 0) {
    const latest = measurements[0];
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Aktuální hodnoty', 14, 46);

    const summaryData = [
      ['Váha', latest.weight ? `${latest.weight} kg` : '-'],
      ['Tělesný tuk', latest.body_fat_percentage ? `${latest.body_fat_percentage}%` : '-'],
      ['Svalová hmota', latest.muscle_mass ? `${latest.muscle_mass} kg` : '-'],
      ['Bazální metabolismus', latest.basal_metabolism ? `${latest.basal_metabolism} kcal` : '-'],
      ['Viscerální tuk', latest.visceral_fat ? `${latest.visceral_fat}` : '-'],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: 52,
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right' }
      },
      theme: 'plain',
    });
  }

  // History table with trends
  const finalY = (doc as any).lastAutoTable?.finalY ?? 80;
  doc.setFontSize(12);
  doc.text('Historie měření s trendy', 14, finalY + 12);

  const tableData = withTrends.map(m => [
    format(new Date(m.date), 'd.M.yyyy', { locale: cs }),
    m.weight ? `${m.weight}` : '-',
    getTrendArrow(m.trends?.weight),
    m.body_fat_percentage ? `${m.body_fat_percentage}` : '-',
    getTrendArrow(m.trends?.body_fat),
    m.muscle_mass ? `${m.muscle_mass}` : '-',
    getTrendArrow(m.trends?.muscle_mass),
    m.basal_metabolism ? `${m.basal_metabolism}` : '-',
    m.visceral_fat ? `${m.visceral_fat}` : '-',
  ]);

  autoTable(doc, {
    head: [['Datum', 'Váha', '', 'Tuk %', '', 'Svaly', '', 'Metab.', 'Visc.']],
    body: tableData,
    startY: finalY + 18,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: {
      2: { cellWidth: 8, halign: 'center' },
      4: { cellWidth: 8, halign: 'center' },
      6: { cellWidth: 8, halign: 'center' },
    },
  });

  // Legend
  const lastTableY = (doc as any).lastAutoTable?.finalY ?? 200;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Legenda: ↑ zlepšení, ↓ zhoršení, → stagnace', 14, lastTableY + 10);

  doc.save(`mereni_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
