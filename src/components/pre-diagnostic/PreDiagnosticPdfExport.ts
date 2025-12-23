import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { PreDiagnosticForm } from '@/hooks/usePreDiagnosticForms';

interface ExportData {
  form: PreDiagnosticForm;
  clientName: string;
  trainerName?: string;
}

export async function exportPreDiagnosticPdf({ form, clientName, trainerName }: ExportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper function for text wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  };

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Souhrn pre-diagnostiky', margin, yPos);
  yPos += 12;

  // Client name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Klient: ${clientName}`, margin, yPos);
  yPos += 8;

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateText = form.approved_at 
    ? `Schváleno: ${format(new Date(form.approved_at), 'd. MMMM yyyy', { locale: cs })}`
    : `Vytvořeno: ${format(new Date(form.completed_at || form.created_at), 'd. MMMM yyyy', { locale: cs })}`;
  doc.text(dateText, margin, yPos);
  yPos += 15;

  doc.setTextColor(0);

  // Horizontal line
  doc.setDrawColor(200);
  doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);

  // Summary section
  if (form.trainer_summary) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Celkové shrnutí', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(form.trainer_summary, margin, yPos, contentWidth);
    yPos += 10;
  }

  // Recommendations section
  if (form.trainer_recommendations) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Doporučení', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(form.trainer_recommendations, margin, yPos, contentWidth);
    yPos += 10;
  }

  // Restrictions section
  if (form.trainer_restrictions) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Omezení a kontraindikace', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(form.trainer_restrictions, margin, yPos, contentWidth);
    yPos += 10;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    'Tento dokument byl vygenerován automaticky a slouží pouze jako informativní souhrn.',
    margin,
    footerY
  );
  if (trainerName) {
    doc.text(`Trenér: ${trainerName}`, margin, footerY + 5);
  }

  // Save
  const fileName = `pre-diagnostika-${clientName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
