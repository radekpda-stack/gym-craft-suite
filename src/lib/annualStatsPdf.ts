import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cs, enUS } from "date-fns/locale";
import { loadRobotoFonts, registerRobotoFont } from "./pdfFonts";
import type { AnnualStatsData } from "@/hooks/useAnnualStats";

export interface AnnualStatsPdfOptions {
  language: "cs" | "en";
  companyName?: string;
  companyId?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
}

const translations = {
  cs: {
    title: "Souhrnné statistiky",
    generatedAt: "Vygenerováno",
    period: "Období",
    
    // Section titles
    overview: "Přehled období",
    trainings: "Tréninky",
    clients: "Klienti",
    exercises: "Cviky & PR",
    finance: "Finance",
    measurements: "Měření & Diagnostika",
    feedback: "Zpětná vazba",
    features: "Využívání funkcí",
    
    // Overview
    totalDays: "Celkem dní",
    activeDays: "Aktivních dní",
    
    // Trainings
    totalTrainings: "Celkem tréninků",
    completed: "Dokončených",
    canceled: "Zrušených",
    lateCancellations: "Pozdních zrušení",
    avgPerWeek: "Průměr za týden",
    avgPrice: "Průměrná cena",
    mostActiveMonth: "Nejaktivnější měsíc",
    mostActiveDay: "Nejaktivnější den",
    
    // Clients
    totalClients: "Celkem klientů",
    activeClients: "Aktivních",
    archivedClients: "Archivovaných",
    avgTrainingsPerClient: "Průměr tréninků/klient",
    topByTrainings: "TOP 5 podle tréninků",
    topBySpent: "TOP 5 podle útraty",
    
    // Exercises
    totalEntries: "Celkem záznamů",
    uniqueExercises: "Unikátních cviků",
    totalPRs: "Celkem PR",
    maxWeight: "Nejvyšší váha",
    topExercises: "TOP 10 nejčastějších cviků",
    leastUsed: "Nejméně používané cviky",
    
    // Finance
    totalIncome: "Celkový příjem",
    trainingIncome: "Příjem z tréninků",
    productIncome: "Příjem z produktů",
    avgMonthlyIncome: "Průměrný měsíční příjem",
    topProducts: "TOP 5 produktů",
    
    // Measurements
    totalMeasurements: "Celkem měření",
    totalDiagnostics: "Celkem diagnostik",
    totalPhotos: "Celkem fotek",
    totalVoiceNotes: "Celkem hlasových poznámek",
    
    // Feedback
    totalFeedback: "Celkem feedbacků",
    avgBodyFeel: "Průměrný pocit v těle",
    avgSessionFit: "Průměrně jak sedl trénink",
    
    // Features
    totalUsage: "Celkem interakcí",
    topFeatures: "TOP 10 funkcí",
    leastUsedFeatures: "Nejméně používané funkce",
    
    currency: "Kč",
    page: "Strana",
    of: "z",
    name: "Název",
    count: "Počet",
    amount: "Částka",
    revenue: "Tržby",
  },
  en: {
    title: "Summary Statistics",
    generatedAt: "Generated",
    period: "Period",
    
    overview: "Period Overview",
    trainings: "Trainings",
    clients: "Clients",
    exercises: "Exercises & PRs",
    finance: "Finance",
    measurements: "Measurements & Diagnostics",
    feedback: "Feedback",
    features: "Feature Usage",
    
    totalDays: "Total days",
    activeDays: "Active days",
    
    totalTrainings: "Total trainings",
    completed: "Completed",
    canceled: "Canceled",
    lateCancellations: "Late cancellations",
    avgPerWeek: "Average per week",
    avgPrice: "Average price",
    mostActiveMonth: "Most active month",
    mostActiveDay: "Most active day",
    
    totalClients: "Total clients",
    activeClients: "Active",
    archivedClients: "Archived",
    avgTrainingsPerClient: "Avg trainings/client",
    topByTrainings: "TOP 5 by trainings",
    topBySpent: "TOP 5 by spending",
    
    totalEntries: "Total entries",
    uniqueExercises: "Unique exercises",
    totalPRs: "Total PRs",
    maxWeight: "Max weight",
    topExercises: "TOP 10 most frequent exercises",
    leastUsed: "Least used exercises",
    
    totalIncome: "Total income",
    trainingIncome: "Training income",
    productIncome: "Product income",
    avgMonthlyIncome: "Avg monthly income",
    topProducts: "TOP 5 products",
    
    totalMeasurements: "Total measurements",
    totalDiagnostics: "Total diagnostics",
    totalPhotos: "Total photos",
    totalVoiceNotes: "Total voice notes",
    
    totalFeedback: "Total feedback",
    avgBodyFeel: "Avg body feel",
    avgSessionFit: "Avg session fit",
    
    totalUsage: "Total interactions",
    topFeatures: "TOP 10 features",
    leastUsedFeatures: "Least used features",
    
    currency: "CZK",
    page: "Page",
    of: "of",
    name: "Name",
    count: "Count",
    amount: "Amount",
    revenue: "Revenue",
  },
};

const COLORS = {
  primary: [255, 115, 0] as [number, number, number],
  primaryDark: [230, 100, 0] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  textMuted: [100, 116, 139] as [number, number, number],
  textLight: [148, 163, 184] as [number, number, number],
  background: [250, 245, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const FONTS = {
  title: 22,
  sectionTitle: 14,
  heading: 11,
  body: 10,
  small: 9,
  tiny: 8,
};

function sanitizeFilename(text: string): string {
  const map: Record<string, string> = {
    'á': 'a', 'č': 'c', 'ď': 'd', 'é': 'e', 'ě': 'e', 'í': 'i', 'ň': 'n',
    'ó': 'o', 'ř': 'r', 'š': 's', 'ť': 't', 'ú': 'u', 'ů': 'u', 'ý': 'y', 'ž': 'z',
    'Á': 'A', 'Č': 'C', 'Ď': 'D', 'É': 'E', 'Ě': 'E', 'Í': 'I', 'Ň': 'N',
    'Ó': 'O', 'Ř': 'R', 'Š': 'S', 'Ť': 'T', 'Ú': 'U', 'Ů': 'U', 'Ý': 'Y', 'Ž': 'Z',
  };
  return text.split('').map(char => map[char] || char).join('');
}

export async function generateAnnualStatsPdf(
  data: AnnualStatsData,
  options: AnnualStatsPdfOptions
): Promise<jsPDF> {
  const t = translations[options.language];
  const locale = options.language === "cs" ? cs : enUS;
  const dateFormat = options.language === "cs" ? "d. M. yyyy" : "MMM d, yyyy";

  await loadRobotoFonts();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  registerRobotoFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - 20) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Helper to draw section title
  const drawSectionTitle = (title: string) => {
    checkPageBreak(15);
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setFontSize(FONTS.sectionTitle);
    doc.setTextColor(...COLORS.white);
    doc.setFont("Roboto", "bold");
    doc.text(title, margin + 5, yPos + 7);
    yPos += 15;
  };

  // Helper to draw stat row
  const drawStatRow = (label: string, value: string | number, x: number = margin, width: number = pageWidth - 2 * margin) => {
    doc.setFontSize(FONTS.body);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(label, x + 3, yPos);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(String(value), x + width - 3, yPos, { align: "right" });
    yPos += 6;
  };

  // Header stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 8, 'F');
  yPos = 18;

  // Company logo
  if (options.companyLogoUrl) {
    try {
      const response = await fetch(options.companyLogoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'AUTO', margin, yPos - 5, 0, 12);
      yPos += 5;
    } catch (e) {
      console.error("Failed to load logo:", e);
    }
  }

  // Title
  doc.setFontSize(FONTS.title);
  doc.setTextColor(...COLORS.primaryDark);
  doc.setFont("Roboto", "bold");
  doc.text(t.title, margin, yPos + 5);
  yPos += 12;

  // Company info
  if (options.companyName) {
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(options.companyName, margin, yPos);
    yPos += 4;
    if (options.companyId) {
      doc.text(`IČ: ${options.companyId}`, margin, yPos);
      yPos += 4;
    }
    if (options.companyAddress) {
      doc.text(options.companyAddress, margin, yPos);
      yPos += 4;
    }
  }

  // Period and generation date
  doc.setFontSize(FONTS.small);
  doc.setTextColor(...COLORS.textLight);
  const periodStr = `${format(data.periodStart, dateFormat, { locale })} - ${format(data.periodEnd, dateFormat, { locale })}`;
  doc.text(`${t.period}: ${periodStr}`, pageWidth - margin, yPos - 8, { align: "right" });
  doc.text(`${t.generatedAt}: ${format(new Date(), dateFormat, { locale })}`, pageWidth - margin, yPos - 3, { align: "right" });

  yPos += 5;

  // Separator
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ===== SECTION 1: Overview =====
  drawSectionTitle(t.overview);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 16, 2, 2, 'F');
  drawStatRow(t.totalDays, data.totalDays);
  drawStatRow(t.activeDays, `${data.activeDays} (${Math.round(data.activeDays / data.totalDays * 100)}%)`);
  yPos += 5;

  // ===== SECTION 2: Trainings =====
  drawSectionTitle(t.trainings);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 46, 2, 2, 'F');
  drawStatRow(t.totalTrainings, data.totalTrainings);
  drawStatRow(t.completed, data.completedTrainings);
  drawStatRow(t.canceled, data.canceledTrainings);
  drawStatRow(t.lateCancellations, data.lateCancellations);
  drawStatRow(t.avgPerWeek, data.avgTrainingsPerWeek);
  drawStatRow(t.avgPrice, `${data.avgTrainingPrice.toLocaleString('cs-CZ')} ${t.currency}`);
  drawStatRow(t.mostActiveMonth, data.mostActiveMonth);
  drawStatRow(t.mostActiveDay, data.mostActiveDay);
  yPos += 5;

  // ===== SECTION 3: Clients =====
  drawSectionTitle(t.clients);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 28, 2, 2, 'F');
  drawStatRow(t.totalClients, data.totalClients);
  drawStatRow(t.activeClients, data.activeClients);
  drawStatRow(t.archivedClients, data.archivedClients);
  drawStatRow(t.avgTrainingsPerClient, data.avgTrainingsPerClient);
  yPos += 5;

  // Top clients tables side by side
  if (data.topClientsByTrainings.length > 0) {
    checkPageBreak(40);
    const halfWidth = (pageWidth - 2 * margin - 5) / 2;
    
    // Left table - by trainings
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(t.topByTrainings, margin, yPos);
    
    // Right table - by spent
    doc.text(t.topBySpent, margin + halfWidth + 5, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[t.name, t.count]],
      body: data.topClientsByTrainings.map(c => [c.name, c.count.toString()]),
      theme: "striped",
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: FONTS.tiny, font: "Roboto" },
      bodyStyles: { fontSize: FONTS.tiny, textColor: COLORS.text, font: "Roboto" },
      margin: { left: margin, right: pageWidth - margin - halfWidth },
      tableWidth: halfWidth,
    });

    autoTable(doc, {
      startY: yPos,
      head: [[t.name, t.amount]],
      body: data.topClientsBySpent.map(c => [c.name, `${c.amount.toLocaleString('cs-CZ')} ${t.currency}`]),
      theme: "striped",
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: FONTS.tiny, font: "Roboto" },
      bodyStyles: { fontSize: FONTS.tiny, textColor: COLORS.text, font: "Roboto" },
      margin: { left: margin + halfWidth + 5, right: margin },
      tableWidth: halfWidth,
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ===== SECTION 4: Exercises & PRs =====
  checkPageBreak(50);
  drawSectionTitle(t.exercises);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 28, 2, 2, 'F');
  drawStatRow(t.totalEntries, data.totalExerciseEntries);
  drawStatRow(t.uniqueExercises, data.uniqueExercises);
  drawStatRow(t.totalPRs, data.totalPRs);
  if (data.maxWeightLifted) {
    drawStatRow(t.maxWeight, `${data.maxWeightLifted.weight} kg (${data.maxWeightLifted.exercise} - ${data.maxWeightLifted.client})`);
  }
  yPos += 5;

  // Top exercises table
  if (data.topExercises.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(t.topExercises, margin, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[t.name, t.count]],
      body: data.topExercises.map(e => [e.name, e.count.toString()]),
      theme: "striped",
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: FONTS.tiny, font: "Roboto" },
      bodyStyles: { fontSize: FONTS.tiny, textColor: COLORS.text, font: "Roboto" },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ===== SECTION 5: Finance =====
  checkPageBreak(40);
  drawSectionTitle(t.finance);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 28, 2, 2, 'F');
  drawStatRow(t.totalIncome, `${data.totalIncome.toLocaleString('cs-CZ')} ${t.currency}`);
  drawStatRow(t.trainingIncome, `${data.trainingIncome.toLocaleString('cs-CZ')} ${t.currency}`);
  drawStatRow(t.productIncome, `${data.productIncome.toLocaleString('cs-CZ')} ${t.currency}`);
  drawStatRow(t.avgMonthlyIncome, `${data.avgMonthlyIncome.toLocaleString('cs-CZ')} ${t.currency}`);
  yPos += 5;

  // Top products table
  if (data.topProducts.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(t.topProducts, margin, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[t.name, t.count, t.revenue]],
      body: data.topProducts.map(p => [p.name, p.count.toString(), `${p.revenue.toLocaleString('cs-CZ')} ${t.currency}`]),
      theme: "striped",
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: FONTS.tiny, font: "Roboto" },
      bodyStyles: { fontSize: FONTS.tiny, textColor: COLORS.text, font: "Roboto" },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // ===== SECTION 6: Measurements & Diagnostics =====
  checkPageBreak(30);
  drawSectionTitle(t.measurements);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 28, 2, 2, 'F');
  drawStatRow(t.totalMeasurements, data.totalMeasurements);
  drawStatRow(t.totalDiagnostics, data.totalDiagnostics);
  drawStatRow(t.totalPhotos, data.totalPhotos);
  drawStatRow(t.totalVoiceNotes, data.totalVoiceNotes);
  yPos += 5;

  // ===== SECTION 7: Feedback =====
  checkPageBreak(25);
  drawSectionTitle(t.feedback);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 22, 2, 2, 'F');
  drawStatRow(t.totalFeedback, data.totalFeedback);
  drawStatRow(t.avgBodyFeel, `${data.avgBodyFeel}/10`);
  drawStatRow(t.avgSessionFit, `${data.avgSessionFit}/10`);
  yPos += 5;

  // ===== SECTION 8: Feature Usage =====
  checkPageBreak(50);
  drawSectionTitle(t.features);
  doc.setFillColor(...COLORS.background);
  doc.roundedRect(margin, yPos - 2, pageWidth - 2 * margin, 10, 2, 2, 'F');
  drawStatRow(t.totalUsage, data.totalFeatureUsage);
  yPos += 5;

  // Top features table
  if (data.topFeatures.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(FONTS.small);
    doc.setTextColor(...COLORS.text);
    doc.setFont("Roboto", "bold");
    doc.text(t.topFeatures, margin, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [[t.name, t.count]],
      body: data.topFeatures.map(f => [f.name, f.count.toString()]),
      theme: "striped",
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: FONTS.tiny, font: "Roboto" },
      bodyStyles: { fontSize: FONTS.tiny, textColor: COLORS.text, font: "Roboto" },
      margin: { left: margin, right: margin },
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(FONTS.tiny);
    doc.setTextColor(...COLORS.textLight);
    doc.text(`${t.page} ${i} ${t.of} ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    
    // Footer stripe
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
  }

  return doc;
}

export async function downloadAnnualStatsPdf(
  data: AnnualStatsData,
  options: AnnualStatsPdfOptions
): Promise<void> {
  const doc = await generateAnnualStatsPdf(data, options);
  const periodStr = `${format(data.periodStart, 'yyyy-MM-dd')}_${format(data.periodEnd, 'yyyy-MM-dd')}`;
  const filename = sanitizeFilename(`statistiky_${periodStr}.pdf`);
  doc.save(filename);
}
