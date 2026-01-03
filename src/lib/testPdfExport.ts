import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TestSession, TestDefinition, TestStats } from '@/types/tests';
import { formatDuration } from '@/lib/utils';

interface GenerateTestReportOptions {
  sessions: TestSession[];
  definition: TestDefinition;
  stats: TestStats | null;
  clientName: string;
  trainerName?: string;
  includeChart?: boolean;
}

export function generateTestReport({
  sessions,
  definition,
  stats,
  clientName,
  trainerName,
}: GenerateTestReportOptions): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const isBetterLower = definition.primary_metric_better === 'lower_is_better';
  const isTimeMetric = definition.primary_metric_key.includes('time') || definition.primary_metric_key === 'time_s';
  
  const formatValue = (value: number | null | undefined) => {
    if (value == null) return '-';
    if (isTimeMetric) return formatDuration(value);
    if (definition.primary_metric_key.includes('pct')) return `${value.toFixed(1)}%`;
    return value.toFixed(2);
  };
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Testovací report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(definition.name_cs || definition.name, pageWidth / 2, 30, { align: 'center' });
  
  // Client info
  doc.setFontSize(10);
  doc.text(`Klient: ${clientName}`, 14, 45);
  doc.text(`Datum: ${new Date().toLocaleDateString('cs-CZ')}`, 14, 52);
  if (trainerName) {
    doc.text(`Trenér: ${trainerName}`, 14, 59);
  }
  
  // Summary stats
  let yPos = trainerName ? 70 : 63;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Souhrn', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['Celkem testů', `${stats?.totalSessions ?? sessions.length}`],
    ['Platných srovnatelných', `${stats?.validComparableSessions ?? '-'}`],
    ['Poslední výsledek', stats?.lastResult ? formatValue(stats.lastResult.metrics_json[definition.primary_metric_key] as number) : '-'],
    ['Osobní rekord', stats?.pr ? formatValue(stats.pr.value) : '-'],
    ['Datum PR', stats?.pr?.date ? new Date(stats.pr.date).toLocaleDateString('cs-CZ') : '-'],
  ];
  
  if (stats?.trendVsPr) {
    const sign = stats.trendVsPr.percentChange >= 0 ? '+' : '';
    summaryData.push(['Trend vs PR', `${sign}${stats.trendVsPr.percentChange.toFixed(1)}%`]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 50 },
    },
    margin: { left: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // History table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Historie testů', 14, yPos);
  yPos += 5;
  
  const historyData = sessions.slice(0, 20).map(session => {
    const primaryValue = session.metrics_json[definition.primary_metric_key];
    return [
      new Date(session.date_time).toLocaleDateString('cs-CZ'),
      formatValue(primaryValue as number),
      session.is_valid ? '✓' : '✗',
      session.is_comparable ? '✓' : '-',
      session.rpe_1_10 ? `${session.rpe_1_10}/10` : '-',
      session.notes?.slice(0, 30) || '-',
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Datum', 'Výsledek', 'Platný', 'Srovn.', 'RPE', 'Poznámky']],
    body: historyData,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
    margin: { left: 14, right: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Protocol section if there's space
  if (yPos < 220 && definition.protocol_text) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Protokol testu', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(definition.protocol_text, pageWidth - 28);
    doc.text(lines.slice(0, 10), 14, yPos);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `Vygenerováno: ${new Date().toLocaleString('cs-CZ')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  
  return doc;
}

export function downloadTestReport(options: GenerateTestReportOptions) {
  const doc = generateTestReport(options);
  const fileName = `test-report-${options.definition.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
