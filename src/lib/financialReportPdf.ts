import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { loadRobotoFonts, registerRobotoFont } from "./pdfFonts";
import type { FinancialReportData } from "@/hooks/useFinancialReportData";
import type { FinancialReportSettings } from "@/hooks/useFinancialReportSettings";

export interface FinancialReportPdfOptions {
  companyName?: string;
  companyLogoUrl?: string;
  settings: FinancialReportSettings;
}

// Refined professional palette – higher contrast, cleaner tones
const C = {
  headerBg: [17, 24, 39] as [number, number, number],      // slate-900
  headerText: [255, 255, 255] as [number, number, number],
  accent: [37, 99, 235] as [number, number, number],        // blue-600 – more professional than orange
  accentLight: [219, 234, 254] as [number, number, number], // blue-100
  text: [17, 24, 39] as [number, number, number],
  textSecondary: [75, 85, 99] as [number, number, number],  // gray-600
  textMuted: [156, 163, 175] as [number, number, number],   // gray-400
  white: [255, 255, 255] as [number, number, number],
  bgSubtle: [249, 250, 251] as [number, number, number],    // gray-50
  bgAlt: [243, 244, 246] as [number, number, number],       // gray-100
  success: [22, 163, 74] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],       // amber-600
  border: [229, 231, 235] as [number, number, number],      // gray-200
  borderLight: [243, 244, 246] as [number, number, number],
};

const F = {
  title: 22,
  subtitle: 10.5,
  sectionTitle: 11,
  kpiValue: 15,
  kpiLabel: 7,
  kpiSub: 6.5,
  heading: 10,
  body: 9,
  small: 8,
  tiny: 7,
};

function fmt(amount: number): string {
  return `${amount.toLocaleString('cs-CZ')} Kč`;
}

function fmtPct(value: number | null): string {
  if (value === null) return '-';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} %`;
}

export async function generateFinancialReportPdf(
  data: FinancialReportData,
  options: FinancialReportPdfOptions
): Promise<jsPDF> {
  const { settings } = options;
  
  await loadRobotoFonts();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerRobotoFont(doc);

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 18;       // wider margin for breathing room
  const cw = pw - 2 * m;
  let y = m;

  const checkPage = (h: number) => {
    if (y + h > ph - 20) {
      doc.addPage();
      y = m;
      return true;
    }
    return false;
  };

  // ── Section header with thin accent line ──
  const drawSection = (title: string) => {
    checkPage(20);
    y += 6;
    doc.setFontSize(F.sectionTitle);
    doc.setTextColor(...C.headerBg);
    doc.setFont("Roboto", "bold");
    doc.text(title.toUpperCase(), m, y);
    y += 2.5;
    doc.setDrawColor(...C.accent);
    doc.setLineWidth(0.8);
    doc.line(m, y, m + 35, y);
    // subtle continuation line
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.15);
    doc.line(m + 36, y, pw - m, y);
    y += 7;
  };

  // ── Stat row with dotted leader ──
  const statRow = (label: string, value: string, x: number = m, w: number = cw, opts?: { color?: [number, number, number]; bold?: boolean }) => {
    const rowH = 6;
    doc.setFontSize(F.body);
    doc.setTextColor(...C.textSecondary);
    doc.setFont("Roboto", "normal");
    doc.text(label, x + 3, y);
    
    // dotted leader
    const labelW = doc.getTextWidth(label);
    const valueW = doc.getTextWidth(value);
    const dotsStart = x + 3 + labelW + 2;
    const dotsEnd = x + w - 3 - valueW - 2;
    if (dotsEnd - dotsStart > 8) {
      doc.setTextColor(...C.border);
      doc.setFontSize(F.tiny);
      const dotStr = ' . '.repeat(Math.floor((dotsEnd - dotsStart) / doc.getTextWidth(' . ')));
      doc.text(dotStr, dotsStart, y);
      doc.setFontSize(F.body);
    }
    
    doc.setTextColor(...(opts?.color || C.text));
    doc.setFont("Roboto", opts?.bold ? "bold" : "bold");
    doc.text(value, x + w - 3, y, { align: "right" });
    y += rowH;
  };

  // ── KPI card – clean, with colored top border ──
  const drawKpiCard = (x: number, w: number, label: string, value: string, subtext?: string, valueColor?: [number, number, number]) => {
    const h = 24;
    // card background
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.border);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
    // colored top accent
    const topColor = valueColor || C.accent;
    doc.setFillColor(...topColor);
    doc.rect(x + 4, y, w - 8, 1.2, 'F');
    
    // value
    doc.setFontSize(F.kpiValue);
    doc.setTextColor(...(valueColor || C.headerBg));
    doc.setFont("Roboto", "bold");
    doc.text(value, x + w / 2, y + 11, { align: "center" });
    // label
    doc.setFontSize(F.kpiLabel);
    doc.setTextColor(...C.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(label.toUpperCase(), x + w / 2, y + 17, { align: "center" });
    if (subtext) {
      doc.setFontSize(F.kpiSub);
      doc.text(subtext, x + w / 2, y + 21, { align: "center" });
    }
  };

  // ── Small info pill ──
  const infoPill = (text: string, color: [number, number, number] = C.textSecondary) => {
    doc.setFontSize(F.small);
    doc.setTextColor(...color);
    doc.setFont("Roboto", "normal");
    doc.text(text, m + 3, y);
    y += 5;
  };

  // ── Table base theme ──
  const tableTheme = {
    theme: 'plain' as const,
    styles: {
      font: 'Roboto',
      fontSize: F.small,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      lineColor: C.borderLight,
      lineWidth: 0,
      textColor: C.text,
    },
    headStyles: {
      fillColor: C.headerBg,
      textColor: C.headerText,
      fontStyle: 'bold' as const,
      fontSize: F.small,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    alternateRowStyles: {
      fillColor: C.bgSubtle,
    },
    bodyStyles: {
      lineColor: C.borderLight,
      lineWidth: 0.1,
    },
    margin: { left: m, right: m },
  };

  // ═══════════════════════════════════════════
  // HEADER – clean, minimal
  // ═══════════════════════════════════════════
  // top accent bar
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pw, 4, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(0, 4, pw, 0.8, 'F');
  y = 14;

  if (settings.branding.showLogo && options.companyLogoUrl) {
    try {
      const response = await fetch(options.companyLogoUrl);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'AUTO', m, y - 3, 0, 10);
      y += 4;
    } catch (e) {
      console.error("Failed to load logo:", e);
    }
  }

  // Title
  doc.setFontSize(F.title);
  doc.setTextColor(...C.headerBg);
  doc.setFont("Roboto", "bold");
  doc.text(settings.branding.customTitle || "Finanční report", m, y + 5);
  y += 12;

  // Company name
  if (settings.branding.showCompanyName && options.companyName) {
    doc.setFontSize(F.subtitle);
    doc.setTextColor(...C.textSecondary);
    doc.setFont("Roboto", "normal");
    doc.text(options.companyName, m, y);
    y += 5;
  }

  // Period + date
  doc.setFontSize(F.small);
  doc.setTextColor(...C.textMuted);
  doc.text(`Období: ${data.period.label}`, m, y);
  doc.text(`Vygenerováno: ${format(new Date(), "d. M. yyyy HH:mm", { locale: cs })}`, pw - m, y, { align: "right" });
  y += 3;
  // thin divider after header
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.15);
  doc.line(m, y, pw - m, y);
  y += 8;

  // ═══════════════════════════════════════════
  // KPI CARDS
  // ═══════════════════════════════════════════
  if (settings.sections.yearSummary) {
    if (data.summary.totalTrainings === 0 && data.summary.totalIncome === 0 && data.totalProductsSold === 0) {
      doc.setFontSize(F.body);
      doc.setTextColor(...C.textMuted);
      doc.text("Za zvolené období nejsou k dispozici žádná data.", m + 3, y);
      y += 12;
    } else {
      const cardGap = 5;
      const cardW = (cw - 3 * cardGap) / 4;
      const savedY = y;
      
      drawKpiCard(m, cardW, "Celkové příjmy", fmt(data.summary.totalIncome));
      drawKpiCard(m + cardW + cardGap, cardW, "Tréninky", data.summary.totalTrainings.toString(), `${(data.trainingsSummary?.totalHours || 0).toFixed(0)} hod`);
      drawKpiCard(m + 2 * (cardW + cardGap), cardW, "Klienti", data.summary.totalClients.toString());
      
      const npColor = data.summary.netProfit >= 0 ? C.success : C.danger;
      const npLabel = data.summary.totalExpenses > 0 ? "Čistý zisk" : "Příjmy";
      const npValue = data.summary.totalExpenses > 0 ? data.summary.netProfit : data.summary.totalIncome;
      drawKpiCard(m + 3 * (cardW + cardGap), cardW, npLabel, fmt(npValue), undefined, npColor);
      
      y = savedY + 28;

      // Income breakdown
      const breakdownParts: string[] = [];
      if (data.summary.paymentIncome > 0) breakdownParts.push(`Platby klientů: ${fmt(data.summary.paymentIncome)}`);
      if (data.summary.manualIncome > 0) breakdownParts.push(`Manuální korekce: ${fmt(data.summary.manualIncome)}`);
      if (data.summary.productIncome > 0) breakdownParts.push(`Prodeje: ${fmt(data.summary.productIncome)}`);
      if (data.summary.cancellationIncome > 0) breakdownParts.push(`Storno: ${fmt(data.summary.cancellationIncome)}`);
      
      if (breakdownParts.length > 1) {
        infoPill(`Rozpad příjmů: ${breakdownParts.join('  ·  ')}`);
      }
      
      if (data.summary.totalExpenses > 0) {
        infoPill(`Provozní náklady: ${fmt(data.summary.totalExpenses)}`);
      }

      // Payment methods
      const pmb = data.summary.paymentMethodBreakdown;
      if (pmb.cash > 0 || pmb.card > 0 || pmb.bank_transfer > 0 || pmb.credit > 0) {
        const parts: string[] = [];
        if (pmb.cash > 0) parts.push(`Hotovost ${fmt(pmb.cash)}`);
        if (pmb.card > 0) parts.push(`Karta ${fmt(pmb.card)}`);
        if (pmb.bank_transfer > 0) parts.push(`Převod ${fmt(pmb.bank_transfer)}`);
        if (pmb.credit > 0) parts.push(`Kredit ${fmt(pmb.credit)}`);
        infoPill(`Platební metody: ${parts.join('  ·  ')}`);
      }

      if (data.summary.totalTrainings > 0) {
        infoPill(`Typy: ${data.summary.soloTrainings}× individuální  ·  ${data.summary.duoTrainings}× dvojice  ·  ${data.summary.trioTrainings}× trojice+`);
      }

      if (data.totalProductsSold > 0) {
        doc.setFontSize(F.small);
        doc.setTextColor(...C.textSecondary);
        doc.text(`Produkty: ${data.totalProductsSold}× za ${fmt(data.summary.totalProductRevenue)}`, m + 3, y);
        const marginColor = data.summary.totalProductMargin >= 0 ? C.success : C.danger;
        doc.setTextColor(...marginColor);
        doc.text(` · marže ${fmt(data.summary.totalProductMargin)} (${data.summary.totalProductMarginPercent.toFixed(1)} %)`, m + 3 + doc.getTextWidth(`Produkty: ${data.totalProductsSold}× za ${fmt(data.summary.totalProductRevenue)}`), y);
        y += 5;
      }

      y += 4;
    }
  }

  // ═══════════════════════════════════════════
  // MONTHLY OVERVIEW
  // ═══════════════════════════════════════════
  if (settings.sections.monthlyOverview && data.monthly.length > 0) {
    drawSection("Měsíční přehled");
    
    const hasCancellations = data.monthly.some(m => m.cancellationIncome > 0);
    
    autoTable(doc, {
      startY: y,
      head: [hasCancellations 
        ? ['Měsíc', 'Příjmy', 'Storno', 'Tréninky', '1:1', '2', '3+', 'Klienti', 'Změna']
        : ['Měsíc', 'Příjmy', 'Tréninky', '1:1', '2', '3+', 'Klienti', 'Změna']
      ],
      body: data.monthly.map(m => hasCancellations ? [
        m.month,
        fmt(m.income),
        m.cancellationIncome > 0 ? fmt(m.cancellationIncome) : '-',
        m.trainingCount.toString(),
        m.soloCount.toString(),
        m.duoCount.toString(),
        m.trioCount.toString(),
        m.clientCount.toString(),
        fmtPct(m.changePercent),
      ] : [
        m.month,
        fmt(m.income),
        m.trainingCount.toString(),
        m.soloCount.toString(),
        m.duoCount.toString(),
        m.trioCount.toString(),
        m.clientCount.toString(),
        fmtPct(m.changePercent),
      ]),
      ...tableTheme,
      columnStyles: hasCancellations ? {
        0: { cellWidth: 22 },
        1: { halign: 'right' as const },
        2: { halign: 'right' as const, cellWidth: 18 },
        3: { halign: 'center' as const, cellWidth: 14 },
        4: { halign: 'center' as const, cellWidth: 10 },
        5: { halign: 'center' as const, cellWidth: 10 },
        6: { halign: 'center' as const, cellWidth: 10 },
        7: { halign: 'center' as const, cellWidth: 14 },
        8: { halign: 'right' as const, cellWidth: 16 },
      } : {
        0: { cellWidth: 25 },
        1: { halign: 'right' as const },
        2: { halign: 'center' as const, cellWidth: 15 },
        3: { halign: 'center' as const, cellWidth: 12 },
        4: { halign: 'center' as const, cellWidth: 12 },
        5: { halign: 'center' as const, cellWidth: 12 },
        6: { halign: 'center' as const, cellWidth: 15 },
        7: { halign: 'right' as const, cellWidth: 18 },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // WEEKLY OVERVIEW
  // ═══════════════════════════════════════════
  if (settings.sections.weeklyOverview && data.weekly.length > 0) {
    checkPage(60);
    drawSection("Týdenní přehled");
    
    const hasCancellations = data.weekly.some(w => w.cancellationIncome > 0);
    
    autoTable(doc, {
      startY: y,
      head: [hasCancellations
        ? ['Týden', 'Příjmy', 'Storno', 'Tréninky', '1:1', 'Dvojice', 'Trojice+']
        : ['Týden', 'Příjmy', 'Tréninky', '1:1', 'Dvojice', 'Trojice+']
      ],
      body: data.weekly.map(w => hasCancellations ? [
        w.weekLabel,
        fmt(w.income),
        w.cancellationIncome > 0 ? fmt(w.cancellationIncome) : '-',
        w.trainingCount.toString(),
        w.soloCount.toString(),
        w.duoCount.toString(),
        w.trioCount.toString(),
      ] : [
        w.weekLabel,
        fmt(w.income),
        w.trainingCount.toString(),
        w.soloCount.toString(),
        w.duoCount.toString(),
        w.trioCount.toString(),
      ]),
      ...tableTheme,
      columnStyles: hasCancellations ? {
        0: { cellWidth: 28 },
        1: { halign: 'right' as const },
        2: { halign: 'right' as const, cellWidth: 18 },
        3: { halign: 'center' as const },
        4: { halign: 'center' as const },
        5: { halign: 'center' as const },
        6: { halign: 'center' as const },
      } : {
        0: { cellWidth: 30 },
        1: { halign: 'right' as const },
        2: { halign: 'center' as const },
        3: { halign: 'center' as const },
        4: { halign: 'center' as const },
        5: { halign: 'center' as const },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // CLIENTS BREAKDOWN
  // ═══════════════════════════════════════════
  if (settings.sections.clientsBreakdown && data.clients.length > 0) {
    checkPage(60);
    drawSection("Klienti");
    
    infoPill(`TOP 20 % klientů generuje ${data.topClientsRevenuePercent.toFixed(1)} % příjmů`);
    y += 2;
    
    const hasProducts = data.clients.some(c => c.productsPaid > 0);
    
    autoTable(doc, {
      startY: y,
      head: [hasProducts 
        ? ['Jméno', 'Zaplaceno', 'Produkty', 'Tréninky', '1:1', '2', '3+']
        : ['Jméno', 'Zaplaceno', 'Tréninky', '1:1', '2', '3+']
      ],
      body: data.clients.slice(0, 30).map(c => hasProducts ? [
        c.name,
        fmt(c.totalPaid),
        c.productsPaid > 0 ? fmt(c.productsPaid) : '-',
        c.trainingCount.toString(),
        c.soloCount.toString(),
        c.duoCount.toString(),
        c.trioCount.toString(),
      ] : [
        c.name,
        fmt(c.totalPaid),
        c.trainingCount.toString(),
        c.soloCount.toString(),
        c.duoCount.toString(),
        c.trioCount.toString(),
      ]),
      ...tableTheme,
      columnStyles: hasProducts ? {
        0: { cellWidth: 38 },
        1: { halign: 'right' as const },
        2: { halign: 'right' as const, cellWidth: 22 },
        3: { halign: 'center' as const, cellWidth: 16 },
        4: { halign: 'center' as const, cellWidth: 13 },
        5: { halign: 'center' as const, cellWidth: 13 },
        6: { halign: 'center' as const, cellWidth: 13 },
      } : {
        0: { cellWidth: 45 },
        1: { halign: 'right' as const },
        2: { halign: 'center' as const, cellWidth: 18 },
        3: { halign: 'center' as const, cellWidth: 15 },
        4: { halign: 'center' as const, cellWidth: 15 },
        5: { halign: 'center' as const, cellWidth: 15 },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // TRAINING TYPE BREAKDOWN
  // ═══════════════════════════════════════════
  if (settings.sections.trainingTypeBreakdown && data.summary.totalTrainings > 0) {
    checkPage(45);
    drawSection("Rozpad typů tréninku");
    
    const total = data.summary.totalTrainings;
    const soloP = total > 0 ? (data.summary.soloTrainings / total * 100).toFixed(1) : '0';
    const duoP = total > 0 ? (data.summary.duoTrainings / total * 100).toFixed(1) : '0';
    const trioP = total > 0 ? (data.summary.trioTrainings / total * 100).toFixed(1) : '0';
    
    // Visual bar chart
    const barMaxW = cw * 0.5;
    const types = [
      { label: "Individuální (1:1)", count: data.summary.soloTrainings, pct: parseFloat(soloP) },
      { label: "Dvojice", count: data.summary.duoTrainings, pct: parseFloat(duoP) },
      { label: "Trojice a více", count: data.summary.trioTrainings, pct: parseFloat(trioP) },
    ];
    
    for (const t of types) {
      doc.setFontSize(F.body);
      doc.setTextColor(...C.textSecondary);
      doc.setFont("Roboto", "normal");
      doc.text(t.label, m + 3, y);
      
      // bar
      const barX = m + 50;
      const barW = (t.pct / 100) * barMaxW;
      doc.setFillColor(...C.bgAlt);
      doc.roundedRect(barX, y - 3, barMaxW, 4, 1, 1, 'F');
      if (barW > 1) {
        doc.setFillColor(...C.accent);
        doc.roundedRect(barX, y - 3, barW, 4, 1, 1, 'F');
      }
      
      // value
      doc.setTextColor(...C.text);
      doc.setFont("Roboto", "bold");
      doc.text(`${t.count}× (${t.pct} %)`, barX + barMaxW + 5, y);
      y += 8;
    }
    y += 4;
  }

  // ═══════════════════════════════════════════
  // PRODUCT SALES BREAKDOWN
  // ═══════════════════════════════════════════
  if (settings.sections.productSalesBreakdown && data.products.length > 0) {
    checkPage(80);
    drawSection("Rozpad prodejů produktů");
    
    infoPill(`Celkem: ${data.totalProductsSold}× produktů  ·  Tržba: ${fmt(data.summary.totalProductRevenue)}  ·  Náklady: ${fmt(data.summary.totalProductCost)}`);
    
    const marginColor = data.summary.totalProductMargin >= 0 ? C.success : C.danger;
    doc.setFontSize(F.small);
    doc.setTextColor(...marginColor);
    doc.setFont("Roboto", "bold");
    doc.text(`Celková marže: ${fmt(data.summary.totalProductMargin)} (${data.summary.totalProductMarginPercent.toFixed(1)} %)`, m + 3, y);
    doc.setFont("Roboto", "normal");
    y += 7;
    
    autoTable(doc, {
      startY: y,
      head: [['Produkt', 'Kategorie', 'Ks', 'Tržba', 'Náklady', 'Marže', 'Marže %']],
      body: data.products.slice(0, 25).map(p => [
        p.productName,
        p.category,
        `${p.quantity}×`,
        fmt(p.totalRevenue),
        fmt(p.totalCost),
        fmt(p.margin),
        `${p.marginPercent.toFixed(1)} %`,
      ]),
      ...tableTheme,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { halign: 'center' as const, cellWidth: 15 },
        3: { halign: 'right' as const, cellWidth: 25 },
        4: { halign: 'right' as const, cellWidth: 25 },
        5: { halign: 'right' as const, cellWidth: 25 },
        6: { halign: 'right' as const, cellWidth: 20 },
      },
    });
    
    y = (doc as any).lastAutoTable.finalY + 10;
    
    // Product clients
    if (data.productClients.length > 0) {
      checkPage(60);
      
      doc.setFontSize(F.heading);
      doc.setTextColor(...C.headerBg);
      doc.setFont("Roboto", "bold");
      doc.text("Klienti podle nákupů", m + 3, y);
      y += 6;
      
      autoTable(doc, {
        startY: y,
        head: [['Klient', 'Utraceno', 'Produktů', 'Objednávek']],
        body: data.productClients.slice(0, 20).map(c => [
          c.clientName,
          fmt(c.totalSpent),
          `${c.productCount}×`,
          c.orderCount.toString(),
        ]),
        ...tableTheme,
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: 'right' as const, cellWidth: 35 },
          2: { halign: 'center' as const, cellWidth: 25 },
          3: { halign: 'center' as const, cellWidth: 25 },
        },
      });
      
      y = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  // ═══════════════════════════════════════════
  // TRAININGS & PAYMENTS SUMMARY
  // ═══════════════════════════════════════════
  if (settings.sections.trainingsPaymentsSummary && data.trainingsSummary && data.paymentsSummary) {
    checkPage(80);
    drawSection("Přehled tréninků a plateb");
    
    const halfW = (cw - 8) / 2;
    const leftX = m;
    const rightX = m + halfW + 8;
    
    // Two-column cards
    const colStartY = y;
    
    // LEFT: Trainings card
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.border);
    doc.roundedRect(leftX, y - 2, halfW, 38, 2, 2, 'FD');
    doc.setFillColor(...C.accent);
    doc.rect(leftX + 3, y - 2, halfW - 6, 1, 'F');
    
    y += 4;
    doc.setFontSize(F.small);
    doc.setTextColor(...C.accent);
    doc.setFont("Roboto", "bold");
    doc.text("TRÉNINKY", leftX + 5, y);
    y += 6;
    
    const ts = data.trainingsSummary;
    statRow("Celkem odtrénováno", `${ts.totalTrainings}× (${ts.totalHours.toFixed(1)} h)`, leftX + 2, halfW - 4);
    statRow("Hodnota tréninků", fmt(ts.totalTrainedValue), leftX + 2, halfW - 4);
    statRow("Průměr / trénink", fmt(ts.avgPricePerTraining), leftX + 2, halfW - 4);
    statRow("Hod. sazba", fmt(ts.avgHourlyRate), leftX + 2, halfW - 4);
    
    if (ts.unpaidTrainingsCount > 0) {
      doc.setFontSize(F.tiny);
      doc.setTextColor(...C.danger);
      doc.text(`⚠ Neuhrazeno: ${ts.unpaidTrainingsCount}× (${fmt(ts.unpaidValue)})`, leftX + 5, y);
      y += 5;
    }
    
    const leftEndY = y;
    
    // RIGHT: Payments card
    y = colStartY;
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.border);
    doc.roundedRect(rightX, y - 2, halfW, 38, 2, 2, 'FD');
    doc.setFillColor(...C.success);
    doc.rect(rightX + 3, y - 2, halfW - 6, 1, 'F');
    
    y += 4;
    doc.setFontSize(F.small);
    doc.setTextColor(...C.success);
    doc.setFont("Roboto", "bold");
    doc.text("ÚHRADY", rightX + 5, y);
    y += 6;
    
    const ps = data.paymentsSummary;
    statRow("Uhrazeno za tréninky", fmt(ps.trainingPayments), rightX + 2, halfW - 4);
    statRow("Nealokovaný kredit", fmt(ps.unallocatedCredit), rightX + 2, halfW - 4);
    statRow("Platby za produkty", fmt(ps.productPayments), rightX + 2, halfW - 4);
    
    if (data.summary.cancellationIncome > 0) {
      statRow("Storno poplatky", fmt(data.summary.cancellationIncome), rightX + 2, halfW - 4);
    }
    
    const rightEndY = y;
    
    y = Math.max(leftEndY, rightEndY) + 6;
    
    // Difference bar
    const diff = ts.totalTrainedValue - ps.trainingPayments;
    const diffColor = diff <= 0 ? C.success : C.danger;
    const diffBgColor = diff <= 0 ? [236, 253, 245] as [number, number, number] : [254, 242, 242] as [number, number, number];
    
    doc.setFillColor(...diffBgColor);
    doc.setDrawColor(...diffColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(m, y - 2, cw, 12, 2, 2, 'FD');
    doc.setLineWidth(0.15);
    
    doc.setFontSize(F.small);
    doc.setTextColor(...C.textSecondary);
    doc.setFont("Roboto", "normal");
    doc.text("ROZDÍL (odtrénováno − uhrazeno):", m + 5, y + 4);
    
    doc.setTextColor(...diffColor);
    doc.setFont("Roboto", "bold");
    doc.setFontSize(F.heading);
    const diffSign = diff >= 0 ? '+' : '';
    doc.text(`${diffSign}${fmt(diff)}`, pw - m - 5, y + 4, { align: 'right' });
    
    y += 18;
  }

  // ═══════════════════════════════════════════
  // MANAGERIAL METRICS
  // ═══════════════════════════════════════════
  if (settings.sections.managerialMetrics) {
    checkPage(55);
    drawSection("Manažerské metriky");
    
    // Card background for the whole section
    const metricsStartY = y - 2;
    
    if (data.managerial.incomePerHour !== null) {
      statRow("Příjem / hodinu tréninku", fmt(Math.round(data.managerial.incomePerHour)));
    }
    statRow("Podíl skupinových tréninků", `${data.managerial.groupTrainingPercent.toFixed(1)} %`);
    
    if (data.managerial.bestMonth) {
      statRow("Nejlepší měsíc", `${data.managerial.bestMonth.name} — ${fmt(data.managerial.bestMonth.income)}`);
    }
    if (data.managerial.worstMonth) {
      statRow("Nejslabší měsíc", `${data.managerial.worstMonth.name} — ${fmt(data.managerial.worstMonth.income)}`);
    }
    
    y += 2;
    // Subtle divider
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
    doc.line(m + 3, y, pw - m - 3, y);
    y += 5;
    
    statRow("YTD příjem", fmt(data.managerial.ytdIncome));
    statRow("Loňský rok (stejné období)", fmt(data.managerial.lastYearIncome));
    if (data.managerial.yoyChangePercent !== null) {
      const yoyColor = data.managerial.yoyChangePercent >= 0 ? C.success : C.danger;
      statRow("Meziroční změna", fmtPct(data.managerial.yoyChangePercent), m, cw, { color: yoyColor });
    }
    y += 6;
  }

  // ═══════════════════════════════════════════
  // DATA VALIDATION
  // ═══════════════════════════════════════════
  if (settings.sections.dataValidation) {
    checkPage(45);
    drawSection("Kontrola dat");
    
    statRow("Platby bez přiřazeného klienta", data.validation.paymentsWithoutClient.toString());
    statRow("Tréninky bez klienta", data.validation.trainingsWithoutClient.toString());
    
    y += 2;
    
    // Difference indicator with colored background
    const vDiff = data.validation.trainedNotPaidDiff;
    const vDiffColor = vDiff <= 0 ? C.success : C.danger;
    const vDiffBg = vDiff <= 0 ? [236, 253, 245] as [number, number, number] : [254, 242, 242] as [number, number, number];
    
    doc.setFillColor(...vDiffBg);
    doc.setDrawColor(...vDiffColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(m, y - 1, cw, 10, 1.5, 1.5, 'FD');
    doc.setLineWidth(0.15);
    
    doc.setFontSize(F.small);
    doc.setTextColor(...C.textSecondary);
    doc.setFont("Roboto", "normal");
    doc.text("Rozdíl odtrénováno vs. zaplaceno:", m + 4, y + 5);
    
    doc.setTextColor(...vDiffColor);
    doc.setFont("Roboto", "bold");
    doc.text(fmt(vDiff), pw - m - 4, y + 5, { align: 'right' });
    
    y += 14;
    
    doc.setFontSize(F.tiny);
    doc.setTextColor(...C.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text("Kladná hodnota = více odtrénováno než zaplaceno (dluh klientů)", m + 3, y);
    y += 6;
    
    // Manual corrections warning
    if (data.validation.manualCorrectionsPositive > 0) {
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(...C.warning);
      doc.setLineWidth(0.3);
      doc.roundedRect(m, y - 1, cw, 10, 1.5, 1.5, 'FD');
      doc.setLineWidth(0.15);
      
      doc.setFontSize(F.small);
      doc.setTextColor(...C.warning);
      doc.setFont("Roboto", "bold");
      doc.text(`⚠ Manuální korekce: ${fmt(data.validation.manualCorrectionsPositive)}`, m + 4, y + 5);
      
      doc.setTextColor(...C.textMuted);
      doc.setFont("Roboto", "normal");
      doc.setFontSize(F.tiny);
      doc.text("Korekce nemusí představovat skutečně přijaté peníze.", m + 4 + doc.getTextWidth(`⚠ Manuální korekce: ${fmt(data.validation.manualCorrectionsPositive)}`) + 4, y + 5);
      
      y += 14;
    }
  }

  // ═══════════════════════════════════════════
  // FOOTER – every page
  // ═══════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer divider
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.15);
    doc.line(m, ph - 13, pw - m, ph - 13);
    // accent dot
    doc.setFillColor(...C.accent);
    doc.circle(m + 1, ph - 9.5, 0.8, 'F');
    
    doc.setFontSize(F.tiny);
    doc.setTextColor(...C.textMuted);
    doc.setFont("Roboto", "normal");
    doc.text(settings.branding.customTitle || "Finanční report", m + 4, ph - 8);
    doc.text(`${i} / ${totalPages}`, pw - m, ph - 8, { align: 'right' });
  }

  return doc;
}

export async function downloadFinancialReportPdf(
  data: FinancialReportData,
  options: FinancialReportPdfOptions
): Promise<void> {
  const doc = await generateFinancialReportPdf(data, options);
  const filename = `financni-report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}
